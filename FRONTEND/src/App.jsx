import { useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Kiosko from "./Kiosko";
import Registro from "./registro";
import AdminLogin from "./AdminLogin";
import Dashboard from "./Dashboard";
import RegistroFacial from "./RegistroFacial";

function App() {
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

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
            <AdminLogin onLogin={() => setAdminLoggedIn(true)} />
          )
        }
      />

      {/* Dashboard administrativo */}
      <Route
        path="/admin/dashboard"
        element={
          adminLoggedIn ? (
            <Dashboard onLogout={() => setAdminLoggedIn(false)} />
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
            <RegistroFacial onLogout={() => setAdminLoggedIn(false)} />
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
