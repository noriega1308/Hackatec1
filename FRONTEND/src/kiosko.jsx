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
  const [modelosListos, setModelosListos] = useState(false);
  const [empleadosRegistrados, setEmpleadosRegistrados] = useState([]);
  const [statusTexto, setstatusTexto] = useState('Cargando IA...');

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
        setstatusTexto('Por favor, mire a la camara');

        encenderWebCam();

        await cargarEmpleadosDesdeBackend();
      } catch (error) {
        console.error("Error inicializando FaceID:", error);
        setStatusTexto('Error al cargar los datos biometricos');
      }
    };
    inicializarFACEID();
  }, []);

  const encenderWebCam = () => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.error("Error al abrir la camara:", err);
        setStatusTexto('Camara no detectada');
      });
  };


  const cargarEmpleadosDesdeBackend = async () => {
    try {
      const response = await fetch('http://localhost:3000/empleados');
      const data = await response.json();

      const mapeados = data.map(emp => {
        const descFloats = new Float32Array(JSON.parse(emp.descriptores_faciales));
        return new faceapi.LabeledFaceDescriptor(emp.id.toString(), [descFloats]);
      });
      setEmpleadosRegistrados(mapeados);
    } catch (error) {
      console.error("Error al cargar los empleados:", error);
    }
  };


  const iniciarReconocimiento = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (window.reconocimientoInterval) {
      clearInterval(window.reconocimientoInterval);
    }

    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    if (displaySize.width === 0) return;

    faceapi.matchDimensions(canvasRef.current, displaySize);

    const faceMatcher = empleadosRegistrados.length > 0
      ? new faceapi.FaceMatcher(empleadosRegistrados, 0.6)
      : null;

    let ultimaAsistencia = 0;

    window.reconocimientoInterval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) return;

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

        if (faceMatcher) {
          const resultado = faceMatcher.findBestMatch(deteccion.descriptor);

          const box = resizedDeteccion.detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, { label: resultado.label });
          drawBox.draw(canvasRef.current);

          if (resultado.label !== 'unknown') {
            setStatusTexto(`Identificando..`);
            
            const ahora = Date.now();
            if (ahora - ultimaAsistencia > 3000) {
              enviarAsistenciaAlBackend(resultado.label);
              ultimaAsistencia = ahora;
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
    }, 100);
  };

  //Asistencia back
  const enviarAsistenciaAlBackend = async (empleadoId) => {
    try {
      const res = await fetch('http://localhost:300/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatusTexto(`¡Asistencia Exitosa! ID: ${empleadoId}`);
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
