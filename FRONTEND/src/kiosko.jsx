import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import { FiWifi, FiLogIn } from 'react-icons/fi';
import { BsHexagonFill } from 'react-icons/bs';
import './kiosko.css';
const API_URL = import.meta.env.VITE_API_URL;
const Kiosko = () => {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  const videoRef = useRef();
  const canvasRef = useRef();
  const faceMatcherRef = useRef(null);
  const empleadosMapRef = useRef({}); // id -> { nombre, apellido_paterno }
  const [modelosListos, setModelosListos] = useState(false);
  const [empleadosRegistrados, setEmpleadosRegistrados] = useState([]);
  const [statusTexto, setStatusTexto] = useState('Cargando IA...');

  // Modal de entrada manual
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idManual, setIdManual] = useState('');
  const [errorManual, setErrorManual] = useState('');
  const [cargandoManual, setCargandoManual] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  //INICIALIZAR FACEID
  useEffect(() => {
    const inicializarFACEID = async () => {
      try {
        const MODEL_URL = '/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelosListos(true);
        setStatusTexto('Por favor, mire a la camara');

        encenderWebCam();

        await cargarEmpleadosDesdeBackend();

        // Recargar empleados cada 5 segundos para detectar nuevos registros sin reiniciar
        window.empleadosInterval = setInterval(() => {
          cargarEmpleadosDesdeBackend();
        }, 5000);

      } catch (error) {
        console.error("Error inicializando FaceID:", error);
        setStatusTexto('Error al cargar los datos biometricos');
      }
    };
    inicializarFACEID();

    return () => {
      if (window.reconocimientoInterval) {
        clearInterval(window.reconocimientoInterval);
      }
      if (window.empleadosInterval) {
        clearInterval(window.empleadosInterval);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const encenderWebCam = () => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Forzar reproducción por si autoPlay falla
          videoRef.current.play().catch(e => console.error("Error reproduciendo video:", e));
        }
      })
      .catch(err => {
        console.error("Error al abrir la camara:", err);
        setStatusTexto('Camara no detectada');
      });
  };


  const cargarEmpleadosDesdeBackend = async () => {
    try {
      console.log('[FaceID] Cargando empleados desde backend...');
      const response = await fetch(`${API_URL}/api/empleados`)
      const data = await response.json();
      console.log('[FaceID] Empleados recibidos:', data.length, data.map(e => e.nombre));

      // Construir mapa id -> datos del empleado para mostrar nombre en el cuadro
      const nuevoMapa = {};
      data.forEach(emp => {
        nuevoMapa[emp.id.toString()] = {
          nombre: emp.nombre,
          apellido_paterno: emp.apellido_paterno || ''
        };
      });
      empleadosMapRef.current = nuevoMapa;

      // Filtrar solo empleados que tienen datos faciales válidos
      // MySQL puede devolver el campo JSON ya como array o como string, manejamos ambos
      const conRostro = data.filter(emp => {
        if (!emp.descriptores_faciales) return false;
        if (Array.isArray(emp.descriptores_faciales) && emp.descriptores_faciales.length > 0) return true;
        if (typeof emp.descriptores_faciales === 'string') {
          try { const p = JSON.parse(emp.descriptores_faciales); return Array.isArray(p) && p.length > 0; }
          catch { return false; }
        }
        return false;
      });

      console.log('[FaceID] Empleados con rostro registrado:', conRostro.length);

      const mapeados = conRostro.map(emp => {
        // Normalizar: si ya es array úsalo directo, si es string parsea primero
        const raw = Array.isArray(emp.descriptores_faciales)
          ? emp.descriptores_faciales
          : JSON.parse(emp.descriptores_faciales);
        const descFloats = new Float32Array(raw);
        return new faceapi.LabeledFaceDescriptors(emp.id.toString(), [descFloats]);
      });

      if (mapeados.length > 0) {
        faceMatcherRef.current = new faceapi.FaceMatcher(mapeados, 0.6);
        console.log('[FaceID] FaceMatcher listo con', mapeados.length, 'empleados');
      } else {
        faceMatcherRef.current = null;
        console.warn('[FaceID] No hay empleados con rostro en la BD todavía');
      }
      setEmpleadosRegistrados(mapeados);
    } catch (error) {
      console.error("[FaceID] Error al cargar los empleados:", error);
    }
  };

  const iniciarReconocimiento = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (window.reconocimientoInterval) {
      clearInterval(window.reconocimientoInterval);
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const displaySize = { width: rect.width || 600, height: rect.height || 400 };

    faceapi.matchDimensions(canvasRef.current, displaySize);

    let ultimaAsistencia = 0;
    // Timestamp hasta el cual el mensaje de éxito está protegido de ser sobreescrito
    let mensajeExitoHasta = 0;

    window.reconocimientoInterval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const deteccion = await faceapi.detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor();

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const ahora = Date.now();
        const enVentanaExito = ahora < mensajeExitoHasta;

        if (deteccion) {
          const resizedDeteccion = faceapi.resizeResults(deteccion, displaySize);

          faceapi.draw.drawDetections(canvasRef.current, resizedDeteccion);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDeteccion);

          if (faceMatcherRef.current) {
            const resultado = faceMatcherRef.current.findBestMatch(deteccion.descriptor);

            const empleadoInfo = empleadosMapRef.current[resultado.label];
            const labelMostrar = resultado.label !== 'unknown' && empleadoInfo
              ? `${empleadoInfo.nombre} ${empleadoInfo.apellido_paterno}`
              : resultado.label;

            const box = resizedDeteccion.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: labelMostrar });
            drawBox.draw(canvasRef.current);

            if (resultado.label !== 'unknown') {
              // Solo mostrar "Identificando..." si NO estamos en ventana de mensaje de éxito
              if (!enVentanaExito) {
                setStatusTexto(`Identificando a ${labelMostrar}...`);
              }

              const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutos entre registros
              if (ahora - ultimaAsistencia > COOLDOWN_MS) {
                ultimaAsistencia = ahora;
                // Reservar 10 segundos de ventana protegida para el mensaje de éxito
                mensajeExitoHasta = ahora + 10000;
                enviarAsistenciaAlBackend(resultado.label, (nuevoMensajeHasta) => {
                  // Extender la ventana desde el momento real en que llega la respuesta
                  mensajeExitoHasta = nuevoMensajeHasta;
                });
              }
            } else {
              if (!enVentanaExito) setStatusTexto('Rostro no reconocido');
            }
          } else {
            if (!enVentanaExito) setStatusTexto('Rostro detectado (esperando DB)');
          }
        } else {
          if (!enVentanaExito) setStatusTexto('Por favor, mire a la camara');
        }
      } catch (err) {
        console.error("Error en detección:", err);
      }
    }, 100);
  };

  // Registro manual por ID
  const registrarManual = async () => {
    const id = idManual.trim();
    if (!id || isNaN(id)) {
      setErrorManual('Ingresa un número de empleado válido');
      return;
    }
    setCargandoManual(true);
    setErrorManual('');
    try {
      const res = await fetch('`${API_URL}/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId: id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const generarMensaje = mensajesPorTipo[data.tipo];
        const mensaje = generarMensaje ? generarMensaje(data.nombre) : `✅ Registro completado, ${data.nombre}`;
        setStatusTexto(mensaje);
        setModalAbierto(false);
        setIdManual('');
      } else {
        const msg = data.message || 'No se pudo registrar';
        setErrorManual(msg.includes('completó') ? 'Ya completaste tus registros del día 😊' : msg);
      }
    } catch {
      setErrorManual('⚠️ Sin conexión con el servidor');
    } finally {
      setCargandoManual(false);
    }
  };

  // Mensajes según el tipo de registro
  const mensajesPorTipo = {
    entrada:        (nombre) => `¡Bienvenido, ${nombre}! 👋 Entrada registrada`,
    salida_comida:  (nombre) => `¡Buen provecho, ${nombre}! 🍽️ Salida a comer`,
    regreso_comida: (nombre) => `¡De vuelta, ${nombre}! ✅ Regreso de comida`,
    salida:         (nombre) => `¡Hasta luego, ${nombre}! 👋 Salida registrada`,
  };

  //Asistencia back
  const enviarAsistenciaAlBackend = async (empleadoId, onMensajeListo) => {
    try {
      const res = await fetch('${API_URL}/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId })
      });

      const data = await res.json();
      console.log('[Asistencia] Respuesta backend:', res.status, data);

      if (data.status === 'success') {
        const generarMensaje = mensajesPorTipo[data.tipo];
        const mensaje = generarMensaje
          ? generarMensaje(data.nombre)
          : `✅ Registro completado, ${data.nombre}`;
        setStatusTexto(mensaje);
        // Extender la ventana protegida 6s desde que llega la respuesta real
        if (onMensajeListo) onMensajeListo(Date.now() + 6000);
      } else {
        const msg = data.message || 'No se pudo registrar la asistencia';
        setStatusTexto(msg.includes('completó') ? '✅ Ya completaste tus registros del día 😊' : `⚠️ ${msg}`);
        if (onMensajeListo) onMensajeListo(Date.now() + 4000);
      }
    } catch (error) {
      console.error("Error al registrar asistencia:", error);
      setStatusTexto('⚠️ Sin conexión con el servidor');
      if (onMensajeListo) onMensajeListo(Date.now() + 3000);
    }
  };


  const formatTime = (date) => {
    return {
      hoursMinutes: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      seconds: date.toLocaleTimeString('es-MX', { second: '2-digit' })
    };
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    let dateStr = date.toLocaleDateString('es-MX', options);
    // Capitalize first letter
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const { hoursMinutes, seconds } = formatTime(time);

  return (
    <div className="kiosko-container">
      {/* Header */}
      <header className="kiosko-header">
        <div className="logo-container">
          <BsHexagonFill className="logo-icon" />
          <div className="logo-text">
            <h1>ROCEEL</h1>
            <span>INDUSTRIAL</span>
          </div>
        </div>

        <div className="datetime-container">
          <div className="time">
            <span className="hours-minutes">{hoursMinutes}</span>
            <span className="separator">:</span>
            <span className="seconds">{seconds}</span>
          </div>
          <div className="date">{formatDate(time)}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="kiosko-main">
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>SISTEMA ACTIVO</span>
          <FiWifi className="wifi-icon" />
        </div>

        <div className="scanner-container">
          <div className="scanner-box">
            {/* Grid Pattern Background */}
            <div className="grid-overlay"></div>

            {/* Corner Brackets */}
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>

            <video ref={videoRef} autoPlay muted onPlay={iniciarReconocimiento}></video>
            <canvas ref={canvasRef}></canvas>

            {/* Overlays */}
            <div className="live-badge">
              <div className="recording-dot"></div>
              <span>LIVE</span>
            </div>
            <div className="resolution-badge">
              1280 × 720 · HD
            </div>
          </div>
        </div>

        <div className="instruction-text">
          <p>{statusTexto}</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <button
            className="manual-entry-btn"
            onClick={() => { setModalAbierto(true); setErrorManual(''); setIdManual(''); }}
          >
            Número de empleado
          </button>
        </div>
      </main>

      {/* Modal entrada manual */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registro Manual</h2>
              <p>Ingresa tu número de empleado</p>
            </div>
            <div className="modal-input-group">
              <input
                id="input-id-empleado"
                type="number"
                className="modal-input"
                placeholder="Ej: 3"
                value={idManual}
                onChange={e => setIdManual(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && registrarManual()}
                autoFocus
              />
            </div>
            {errorManual && <p className="modal-error">{errorManual}</p>}
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button
                className="modal-btn-confirm"
                onClick={registrarManual}
                disabled={cargandoManual}
              >
                {cargandoManual ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="kiosko-footer">
        <div className="copyright">
          CONTROL DE ACCESO &copy; 2026 ROCEEL S.A. DE C.V.
        </div>
      </footer>

      {/* Login Button (Bottom Right) */}
      <button
        className="login-action-btn"
        onClick={() => navigate('/admin')}
        title="Iniciar Sesión"
      >
        <span>Iniciar sesión</span>
        <FiLogIn className="login-icon" />
      </button>
    </div>
  );
};

export default Kiosko;
