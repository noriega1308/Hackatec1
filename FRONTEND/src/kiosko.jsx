import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import { FiWifi, FiLogIn } from 'react-icons/fi';
import { BsHexagonFill } from 'react-icons/bs';
import './Kiosko.css';

const Kiosko = () => {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  const videoRef = useRef();
  const canvasRef = useRef();
  const faceMatcherRef = useRef(null);
  const [modelosListos, setModelosListos] = useState(false);
  const [empleadosRegistrados, setEmpleadosRegistrados] = useState([]);
  const [statusTexto, setStatusTexto] = useState('Cargando IA...');

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
      const response = await fetch('http://localhost:5000/api/empleados');
      const data = await response.json();
      console.log('[FaceID] Empleados recibidos:', data.length, data.map(e => e.nombre));

      const mapeados = data.map(emp => {
        const descFloats = new Float32Array(JSON.parse(emp.descriptores_faciales));
        return new faceapi.LabeledFaceDescriptors(emp.id.toString(), [descFloats]);
      });
      if (mapeados.length > 0) {
        faceMatcherRef.current = new faceapi.FaceMatcher(mapeados, 0.7);
        console.log('[FaceID] FaceMatcher listo con', mapeados.length, 'empleados');
      } else {
        console.warn('[FaceID] No hay empleados en la BD todavía');
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

    // Usamos el tamaño real renderizado del canvas (600x400 según CSS)
    // para que los puntos y el cuadro de rastreo coincidan exactamente con tu cara
    const rect = canvasRef.current.getBoundingClientRect();
    const displaySize = { width: rect.width || 600, height: rect.height || 400 };

    faceapi.matchDimensions(canvasRef.current, displaySize);

    let ultimaAsistencia = 0;
    let statusBloqueado = false; // Evita sobreescribir el mensaje de éxito

    window.reconocimientoInterval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const deteccion = await faceapi.detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor();

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (deteccion) {
          const resizedDeteccion = faceapi.resizeResults(deteccion, displaySize);

          // Draw tracking lines on canvas
          faceapi.draw.drawDetections(canvasRef.current, resizedDeteccion);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDeteccion);

          if (faceMatcherRef.current) {
            const resultado = faceMatcherRef.current.findBestMatch(deteccion.descriptor);

            const box = resizedDeteccion.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: resultado.label });
            drawBox.draw(canvasRef.current);

            if (resultado.label !== 'unknown') {
              if (!statusBloqueado) setStatusTexto(`Identificando..`);

              const ahora = Date.now();
              if (ahora - ultimaAsistencia > 8000) {
                statusBloqueado = true;
                enviarAsistenciaAlBackend(resultado.label);
                ultimaAsistencia = ahora;
                // Mostrar el mensaje de éxito por 4 segundos
                setTimeout(() => { statusBloqueado = false; }, 8000);
              }
            } else {
              setStatusTexto('Rostro no reconocido');
            }
          } else {
            setStatusTexto('Rostro detectado (esperando DB)');
          }
        } else {
          setStatusTexto('Por favor, mire a la camara');
        }
      } catch (err) {
        console.error("Error en detección:", err);
      }
    }, 100);
  };

  //Asistencia back
  const enviarAsistenciaAlBackend = async (empleadoId) => {
    try {
      const res = await fetch('http://localhost:5000/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatusTexto(`¡Entrada Registrada! Bienvenido ${data.nombre}`);
      }
    } catch (error) {
      console.error("Error al registrar asistencia:", error);
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
            disabled={
              statusTexto !== 'Camara no detectada' &&
              statusTexto !== 'Error al cargar los datos biometricos' &&
              statusTexto !== 'Rostro no reconocido'
            }
          >
            Número de empleado
          </button>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="kiosko-footer">
        <div className="copyright">
          CONTROL DE ACCESO &copy; 2026 ROCEEL S.A. DE C.V.
        </div>
      </footer>

      {/* Login Button (Bottom Right) */}
      <button
        className="login-action-btn"
        onClick={() => navigate('/')}
        title="Iniciar Sesión"
      >
        <span>Iniciar sesión</span>
        <FiLogIn className="login-icon" />
      </button>
    </div>
  );
};

export default Kiosko;
