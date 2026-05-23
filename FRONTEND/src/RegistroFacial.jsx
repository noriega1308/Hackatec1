import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as faceapi from "face-api.js";
import "./App.css";

const API_URL = "http://localhost:4000";
const MODEL_URL = "/models";

function RegistroFacial({ onLogout }) {
  const videoRef = useRef();
  const [empleados, setEmpleados] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [modelosListos, setModelosListos] = useState(false);
  const [statusTexto, setStatusTexto] = useState("Cargando modelos de IA...");
  const [cargando, setCargando] = useState(false);

  // ── Cargar modelos de face-api + cámara ──────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelosListos(true);
        setStatusTexto("Sistema listo. Seleccione un empleado.");
        encenderCamara();
      } catch (e) {
        console.error(e);
        setStatusTexto("Error al cargar modelos de IA.");
      }
    };
    init();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Cargar lista de empleados desde el backend ───────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/empleados`)
      .then((r) => r.json())
      .then((data) => setEmpleados(data))
      .catch(() => setStatusTexto("Error al cargar empleados del servidor."));
  }, []);

  const encenderCamara = () => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      })
      .catch(() => setStatusTexto("Cámara no detectada."));
  };

  // ── Capturar rostro y actualizar descriptor en BD ────────────────────────
  const capturarRostro = async () => {
    if (!seleccionado) {
      setStatusTexto("⚠ Seleccione un empleado primero.");
      return;
    }
    if (!modelosListos) {
      setStatusTexto("Espere, los modelos aún están cargando...");
      return;
    }

    setStatusTexto("Analizando rostro... ¡No se mueva!");
    setCargando(true);

    const deteccion = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!deteccion) {
      setStatusTexto("✗ No se detectó ningún rostro. Intente de nuevo.");
      setCargando(false);
      return;
    }

    const descriptoresString = JSON.stringify(Array.from(deteccion.descriptor));
    setStatusTexto("Guardando en la base de datos...");

    try {
      const res = await fetch(`${API_URL}/api/empleados/${seleccionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptores_faciales: descriptoresString }),
      });

      if (res.ok) {
        setStatusTexto(`✓ Rostro de ${seleccionado.nombre} actualizado correctamente.`);
        // Recargar lista para reflejar el cambio
        const data = await fetch(`${API_URL}/api/empleados`).then((r) => r.json());
        setEmpleados(data);
        setSeleccionado(null);
      } else {
        setStatusTexto("Error: El servidor rechazó la actualización.");
      }
    } catch {
      setStatusTexto("Error de red al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="sidebar-wordmark">ROCEEL</div>
          </div>

          <nav className="side-menu">
            <Link to="/admin/dashboard">
              <span>▦</span>
              Dashboard
            </Link>

            <Link className="active" to="/admin/registro-facial">
              <span>◎</span>
              Registro facial
            </Link>

            <button onClick={onLogout}>
              <span>⇠</span>
              Cerrar sesión
            </button>
          </nav>
        </div>

        <div className="profile-box">
          <div className="profile-avatar">IR</div>
          <div>
            <h3>Ing. Rolando</h3>
            <p>Administrador</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1>Registro facial de empleados</h1>
        </header>

        <section className="biometric-grid">
          {/* ── Columna izquierda: lista de empleados ── */}
          <div className="biometric-card">
            <div className="card-header no-border">
              <div>
                <h2>Seleccionar empleado</h2>
              </div>
            </div>

            <div className="employee-select-list">
              {empleados.length === 0 && (
                <p style={{ padding: "1rem", color: "#888" }}>
                  Cargando empleados...
                </p>
              )}
              {empleados.map((emp) => (
                <div
                  className={`select-user-row${seleccionado?.id === emp.id ? " selected" : ""}`}
                  key={emp.id}
                  onClick={() => {
                    setSeleccionado(emp);
                    setStatusTexto(`Empleado seleccionado: ${emp.nombre}. Capture el rostro.`);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div>
                    <strong>{emp.nombre}</strong>
                    <p>
                      ID: {emp.id} · {emp.departamento}
                    </p>
                  </div>

                  <span
                    className={
                      emp.descriptores_faciales
                        ? "face-badge registered"
                        : "face-badge pending"
                    }
                  >
                    {emp.descriptores_faciales ? "Registrado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Columna derecha: cámara y captura ── */}
          <div className="biometric-card">
            <div className="card-header no-border">
              <div>
                <h2>Datos biométricos</h2>
                <p>{statusTexto}</p>
              </div>
            </div>

            <div className="biometric-dropzone" style={{ padding: 0, overflow: "hidden", borderRadius: "10px" }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
            </div>

            <button
              className="capture-btn"
              onClick={capturarRostro}
              disabled={cargando || !modelosListos || !seleccionado}
              style={{ marginTop: "1rem", opacity: (!seleccionado || !modelosListos) ? 0.5 : 1 }}
            >
              {cargando ? "Procesando..." : "📷 Capturar rostro"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default RegistroFacial;
