import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiEye, FiLock, FiMail, FiZap } from "react-icons/fi";
import "./AdminLogin.css";
const API_URL = import.meta.env.VITE_API_URL;
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (email.trim() === "" || password.trim() === "") {
      setError("Ingresa correo y contrasena.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("import.meta.env.VITE_API_URL/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Credenciales incorrectas.");
        return;
      }

      if (data.usuario.id_rol !== 1) {
        setError("Tu usuario no tiene permisos de administrador.");
        return;
      }

      onLogin(data.usuario);
    } catch (error) {
      console.error("Error en login:", error);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-screen">
      <section className="admin-login-shell">
        <aside className="admin-login-brand">
          <div className="brand-grid"></div>
          <div className="brand-mark">
            <FiZap />
          </div>
          <div className="brand-wordmark">ROCEEL</div>
          <p className="brand-tagline">
            Servicios especializados en electronica industrial
          </p>
          <p className="brand-location">Ramos Arizpe, Coahuila</p>
          <div className="brand-status">
            <span></span>
            Sistema operativo
          </div>
        </aside>

        <form className="admin-login-box" onSubmit={handleSubmit}>
          <div className="admin-login-kicker">Panel administrativo</div>
          <h1>Acceso ROCEEL</h1>
          <p>Autenticacion requerida para gestion de asistencia y reportes.</p>

          <label htmlFor="admin-email">Correo electronico</label>
          <div className="admin-input-wrap">
            <FiMail />
            <input
              id="admin-email"
              type="email"
              placeholder="admin@roceel.com"
              value={email}
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label htmlFor="admin-password">Contrasena</label>
          <div className="admin-input-wrap">
            <FiLock />
            <input
              id="admin-password"
              type="password"
              placeholder="Contrasena"
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FiEye className="admin-input-eye" />
          </div>

          {error && <div className="admin-login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Validando..." : "Iniciar sesion"}
          </button>
          <Link to="/kiosko" className="back-kiosk-link">
            <FiArrowLeft />
            Volver al kiosko
          </Link>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;
