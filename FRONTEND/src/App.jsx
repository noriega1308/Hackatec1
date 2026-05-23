import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminLogin from "./AdminLogin";
import Dashboard from "./Dashboard";
import Kiosko from "./kiosko";
import Registro from "./registro";
import RegistroFacial from "./RegistroFacial";

function App() {
  const [adminUser, setAdminUser] = useState(() => {
    const savedUser = localStorage.getItem("roceel_admin_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const adminLoggedIn = Boolean(adminUser);

  function handleLogin(usuario) {
    localStorage.setItem("roceel_admin_user", JSON.stringify(usuario));
    setAdminUser(usuario);
  }

  function handleLogout() {
    localStorage.removeItem("roceel_admin_user");
    setAdminUser(null);
  }

  return (
    <Routes>
      {/* Ruta inicial → al kiosko facial */}
      <Route path="/" element={<Navigate to="/kiosko" replace />} />

      {/* Kiosko de reconocimiento facial */}
      <Route path="/kiosko" element={<Kiosko />} />

      {/* Registro biométrico de empleados */}
      <Route path="/registro" element={<Registro />} />

      {/* Login admin */}
      <Route
        path="/admin"
        element={
          adminLoggedIn ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLogin onLogin={handleLogin} />
          )
        }
      />

      {/* Dashboard administrativo */}
      <Route
        path="/admin/dashboard"
        element={
          adminLoggedIn ? (
            <Dashboard adminUser={adminUser} onLogout={handleLogout} view="dashboard" />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />

      {/* Gestion de asistencia */}
      <Route
        path="/admin/gestion"
        element={
          adminLoggedIn ? (
            <Dashboard adminUser={adminUser} onLogout={handleLogout} view="gestion" />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />

      {/* Vincular datos faciales a usuarios existentes */}
      <Route
        path="/admin/registro-facial"
        element={
          adminLoggedIn ? (
            <RegistroFacial adminUser={adminUser} onLogout={handleLogout} />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />

      {/* Ruta respaldo */}
      <Route path="*" element={<Navigate to="/kiosko" replace />} />
    </Routes>
  );
}

export default App;
