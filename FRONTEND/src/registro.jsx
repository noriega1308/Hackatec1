import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiMonitor, FiGrid, FiArrowLeft, FiCamera } from 'react-icons/fi';
import { BsHexagonFill } from 'react-icons/bs';
import * as faceapi from 'face-api.js';
import './Kiosko.css'; // Reutilizamos tus estilos base para mantener la identidad visual

const Registro = () => {
    const navigate = useNavigate();
    const videoRef = useRef();
    const [nombre, setNombre] = useState('');
    const [departamento, setDepartamento] = useState('Mantenimiento');
    const [statusTexto, setStatusTexto] = useState('Inicializando cámara...');
    const [modelosListos, setModelosListos] = useState(false);
    const [cargando, setCargando] = useState(false);

    // Cargar modelos de IA al entrar a la pantalla de registro
    useEffect(() => {
        const inicializarRegistro = async () => {
            try {
                const MODEL_URL = '/models';
                await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

                setModelosListos(true);
                setStatusTexto('Sistema biométrico listo para captura');
                encenderWebcam();
            } catch (error) {
                console.error(error);
                setStatusTexto('Error al cargar modelos de IA');
            }
        };
        inicializarRegistro();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    const encenderWebcam = () => {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error("Error reproduciendo video:", e));
                }
            })
            .catch(err => {
                console.error(err);
                setStatusTexto('Cámara no detectada');
            });
    };

    // Captura las facciones reales y las manda por POST al Backend
    const capturarYEnviarRostro = async (e) => {
        e.preventDefault();
        if (!nombre) {
            alert('Por favor, ingresa el nombre del empleado.');
            return;
        }

        setStatusTexto('Analizando rostro biométrico... ¡No te muevas!');
        setCargando(true);

        // Guardar frame actual y extraer descriptor
        const deteccion = await faceapi.detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!deteccion) {
            setStatusTexto('X. No se detectó ningún rostro. Intenta de nuevo.');
            setCargando(false);
            return;
        }

        // Convertir el array de 128 flotantes a string para PostgreSQL
        const descriptoresString = JSON.stringify(Array.from(deteccion.descriptor));

        setStatusTexto('Registrando en base de datos de ROCEEL...');

        try {
            const res = await fetch('http://localhost:4000/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nombre,
                    departamento: departamento,
                    descriptores_faciales: descriptoresString
                })
            });

            if (res.ok) {
                setStatusTexto(`¡Éxito! ${nombre} ha sido guardado en el sistema.`);
                setNombre('');
            } else {
                setStatusTexto('Error: El servidor rechazó el registro.');
            }
        } catch (error) {
            console.error(error);
            setStatusTexto('Error de red al conectar con el Backend.');
        } finally {
            setCargando(false);
        }
    };

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
                    <div className="date" style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>
                        MÓDULO DE ALTA BIOMÉTRICA
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="kiosko-main" style={{ flexDirection: 'row', gap: '4rem', padding: '0 3rem' }}>

                {/* Columna Izquierda: Formulario */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 600 }}>Registrar Operario</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{statusTexto}</p>

                    <form onSubmit={capturarYEnviarRostro} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>NOMBRE COMPLETO</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                placeholder="Ej. Juan Pérez Mtz"
                                disabled={cargando}
                                style={{ padding: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DEPARTAMENTO</label>
                            <select
                                value={departamento}
                                onChange={e => setDepartamento(e.target.value)}
                                disabled={cargando}
                                style={{ padding: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
                            >
                                <option value="Mantenimiento">Mantenimiento</option>
                                <option value="Maquinaria">Maquinaria</option>
                                <option value="Sistemas">Sistemas</option>
                                <option value="Administración">Administración</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={cargando || !modelosListos}
                            style={{ padding: '1rem', background: 'var(--accent-color)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}
                        >
                            <FiCamera />
                            {cargando ? 'Procesando Rostro...' : 'Capturar Características'}
                        </button>
                    </form>
                </div>

                {/* Columna Derecha: Vista de Cámara */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div className="scanner-box" style={{ width: '500px', height: '350px' }}>
                        <div className="grid-overlay"></div>
                        <div className="corner top-left"></div>
                        <div className="corner top-right"></div>
                        <div className="corner bottom-left"></div>
                        <div className="corner bottom-right"></div>

                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                    </div>
                </div>
            </main>

            {/* Footer Navigation */}
            <footer className="kiosko-footer">
                <div className="nav-pill">
                    <button className="nav-btn text-btn">DEMO</button>
                    <button className="nav-btn" onClick={() => navigate('/kiosko')}>
                        <FiMonitor className="nav-icon" />
                        <span>Kiosco</span>
                    </button>
                    <button className="nav-btn">
                        <FiGrid className="nav-icon" />
                        <span>Dashboard</span>
                    </button>
                    <button className="nav-btn active">
                        <FiUserPlus className="nav-icon" />
                        <span>Registro</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default Registro;
