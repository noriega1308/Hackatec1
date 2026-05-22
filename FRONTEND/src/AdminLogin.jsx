import { useState } from "react";
import { Link } from "react-router-dom";
import "./AdminLogin.css";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("admin@roceel.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (email.trim() === "" || password.trim() === "") {
      setError("Ingresa correo y contraseña.");
      return;
    }

    if (email === "admin@roceel.com" && password === "admin123") {
      setError("");
      onLogin();
    } else {
      setError("Credenciales incorrectas.");
    }
  }

  return (
    <main className="admin-login-screen">
      <form className="admin-login-box" onSubmit={handleSubmit}>
        <div className="admin-login-logo">
          <img src="/roceel-logo.png" alt="ROCEEL Logo" />
        </div>

        <h1>Administradores 
        </h1>
        <p>Acceso al panel administrativo</p>

        <label>Correo electrónico</label>
        <input
          type="email"
          placeholder="admin@roceel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Contraseña</label>
        <input
          type="password"
          placeholder="admin123"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="admin-login-error">{error}</div>}

        <button type="submit">Iniciar sesión</button>
        <Link to="/kiosko" className="back-kiosk-link">
  ← Volver al kiosko
</Link>
      </form>
    </main>
  );
}

export default AdminLogin;