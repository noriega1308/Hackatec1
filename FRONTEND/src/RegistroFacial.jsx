import { Link } from "react-router-dom";
import "./App.css";

function RegistroFacial({ onLogout }) {
  const usuarios = [
    {
      id_usuario: 1,
      nombre: "Carlos",
      apellido_paterno: "Mendoza",
      email: "carlos.mendoza@roceel.com",
      departamento: "Mantenimiento",
      datos_faciales: true,
    },
    {
      id_usuario: 2,
      nombre: "Diego",
      apellido_paterno: "Sánchez",
      email: "diego.sanchez@roceel.com",
      departamento: "Mantenimiento",
      datos_faciales: true,
    },
    {
      id_usuario: 5,
      nombre: "Patricia",
      apellido_paterno: "Ruiz",
      email: "patricia.ruiz@roceel.com",
      departamento: "Administración",
      datos_faciales: false,
    },
    {
      id_usuario: 8,
      nombre: "José",
      apellido_paterno: "Torres",
      email: "jose.torres@roceel.com",
      departamento: "Mantenimiento",
      datos_faciales: false,
    },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <img src="/roceel-logo.png" alt="ROCEEL Logo" className="logo-img" />
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
          <div className="biometric-card">
            <div className="card-header no-border">
              <div>
                <h2>Seleccionar empleado</h2>
              </div>
            </div>

            <div className="employee-select-list">
              {usuarios.map((usuario) => (
                <div className="select-user-row" key={usuario.id_usuario}>
                  <div>
                    <strong>
                      {usuario.nombre} {usuario.apellido_paterno}
                    </strong>
                    <p>
                      ID usuario: {usuario.id_usuario} · {usuario.departamento}
                    </p>
                    <p>{usuario.email}</p>
                  </div>

                  <span
                    className={
                      usuario.datos_faciales
                        ? "face-badge registered"
                        : "face-badge pending"
                    }
                  >
                    {usuario.datos_faciales ? "Registrado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="biometric-card">
            <div className="card-header no-border">
              <div>
                <h2>Datos biométricos</h2>
                <p>Captura o carga la imagen facial del empleado seleccionado.</p>
              </div>
            </div>

            <div className="biometric-dropzone">
              <div className="camera-circle">📷</div>
              <p>
                Posicione al empleado frente a la cámara y capture la fotografía
                facial para el registro biométrico.
              </p>
            </div>

            <button className="capture-btn">Tomar foto con webcam</button>
            <button className="upload-btn">Subir archivo de imagen</button>

          </div>
        </section>
      </main>
    </div>
  );
}

export default RegistroFacial;