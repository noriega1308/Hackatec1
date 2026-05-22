import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

function Dashboard({ onLogout }) {
  const [selectedUserId, setSelectedUserId] = useState(null);

  const departamentos = [
    { id_departamento: 1, nombre_departamento: "Mantenimiento" },
    { id_departamento: 2, nombre_departamento: "Maquinaria" },
    { id_departamento: 3, nombre_departamento: "Administración" },
    { id_departamento: 4, nombre_departamento: "Logística" },
  ];

  const roles = [
    { id_rol: 1, nombre_rol: "Administrador" },
    { id_rol: 2, nombre_rol: "Operador" },
  ];

  const usuarios = [
    {
      id_usuario: 1,
      nombre: "Carlos",
      apellido_paterno: "Mendoza",
      apellido_materno: "Ríos",
      email: "carlos.mendoza@roceel.com",
      contrasena: "********",
      datos_faciales: { registrado: true },
      id_departamento: 1,
      id_rol: 2,
    },
    {
      id_usuario: 2,
      nombre: "Diego",
      apellido_paterno: "Sánchez",
      apellido_materno: "Luna",
      email: "diego.sanchez@roceel.com",
      contrasena: "********",
      datos_faciales: { registrado: true },
      id_departamento: 1,
      id_rol: 2,
    }
  ];

  const registros = [
    { id_registro: 1, id_usuario: 1, fecha: "2026-05-22", hora: "2026-05-22 07:00:00", tipo: "entrada" },
    { id_registro: 2, id_usuario: 1, fecha: "2026-05-22", hora: "2026-05-22 12:00:00", tipo: "salida_comida" },
    { id_registro: 3, id_usuario: 1, fecha: "2026-05-22", hora: "2026-05-22 13:00:00", tipo: "regreso_comida" },
    { id_registro: 4, id_usuario: 1, fecha: "2026-05-22", hora: "2026-05-22 15:00:00", tipo: "salida" },

    { id_registro: 5, id_usuario: 2, fecha: "2026-05-22", hora: "2026-05-22 07:15:00", tipo: "entrada" },
    { id_registro: 6, id_usuario: 2, fecha: "2026-05-22", hora: "2026-05-22 12:00:00", tipo: "salida_comida" },
    { id_registro: 7, id_usuario: 2, fecha: "2026-05-22", hora: "2026-05-22 13:00:00", tipo: "regreso_comida" },
    { id_registro: 8, id_usuario: 2, fecha: "2026-05-22", hora: "2026-05-22 15:00:00", tipo: "salida" },

    { id_registro: 9, id_usuario: 3, fecha: "2026-05-22", hora: "2026-05-22 07:00:00", tipo: "entrada" },
    { id_registro: 10, id_usuario: 3, fecha: "2026-05-22", hora: "2026-05-22 12:00:00", tipo: "salida_comida" },
    { id_registro: 11, id_usuario: 3, fecha: "2026-05-22", hora: "2026-05-22 13:00:00", tipo: "regreso_comida" },
    { id_registro: 12, id_usuario: 3, fecha: "2026-05-22", hora: "2026-05-22 16:00:00", tipo: "salida" },

    { id_registro: 13, id_usuario: 4, fecha: "2026-05-22", hora: "2026-05-22 07:05:00", tipo: "entrada" },
    { id_registro: 14, id_usuario: 4, fecha: "2026-05-22", hora: "2026-05-22 12:00:00", tipo: "salida_comida" },
    { id_registro: 15, id_usuario: 4, fecha: "2026-05-22", hora: "2026-05-22 13:00:00", tipo: "regreso_comida" },

    { id_registro: 16, id_usuario: 5, fecha: "2026-05-22", hora: "2026-05-22 07:00:00", tipo: "entrada" },
    { id_registro: 17, id_usuario: 5, fecha: "2026-05-22", hora: "2026-05-22 14:30:00", tipo: "salida" },

    { id_registro: 18, id_usuario: 6, fecha: "2026-05-22", hora: "2026-05-22 07:10:00", tipo: "entrada" },
    { id_registro: 19, id_usuario: 6, fecha: "2026-05-22", hora: "2026-05-22 15:30:00", tipo: "salida" },

    { id_registro: 20, id_usuario: 7, fecha: "2026-05-22", hora: "2026-05-22 07:00:00", tipo: "entrada" },
    { id_registro: 21, id_usuario: 7, fecha: "2026-05-22", hora: "2026-05-22 15:00:00", tipo: "salida" },

    { id_registro: 22, id_usuario: 8, fecha: "2026-05-22", hora: "2026-05-22 07:20:00", tipo: "entrada" },
  ];

  const MINUTOS_JORNADA_ESPERADA = 7 * 60;

  function obtenerMinutos(fechaHora) {
    const hora = fechaHora.slice(11, 16);
    const [hh, mm] = hora.split(":").map(Number);
    return hh * 60 + mm;
  }

  function convertirHoras(minutos) {
    if (minutos === null || Number.isNaN(minutos)) return "Pendiente";

    const valor = Math.abs(minutos);
    const horas = Math.floor(valor / 60);
    const mins = valor % 60;

    if (horas === 0 && mins === 0) return "0 h";
    if (mins === 0) return `${horas} h`;
    return `${horas} h ${mins} min`;
  }

  function formatearHora(fechaHora) {
    return fechaHora.slice(11, 16);
  }

  function formatearTipo(tipo) {
    if (tipo === "entrada") return "Entrada";
    if (tipo === "salida") return "Salida";
    if (tipo === "salida_comida") return "Salida comida";
    if (tipo === "regreso_comida") return "Regreso comida";
    return tipo;
  }

  function estadoFacial(datosFaciales) {
    return datosFaciales ? "Registrado" : "Pendiente";
  }

  function calcularResumenUsuario(idUsuario) {
    const registrosUsuario = registros
      .filter((registro) => registro.id_usuario === idUsuario)
      .sort((a, b) => obtenerMinutos(a.hora) - obtenerMinutos(b.hora));

    const entrada = registrosUsuario.find((r) => r.tipo === "entrada");
    const salidaComida = registrosUsuario.find((r) => r.tipo === "salida_comida");
    const regresoComida = registrosUsuario.find((r) => r.tipo === "regreso_comida");
    const salida = registrosUsuario.find((r) => r.tipo === "salida");
    const ultimoRegistro = registrosUsuario[registrosUsuario.length - 1];

    if (!entrada || !salida) {
      return {
        entrada: entrada ? formatearHora(entrada.hora) : "Pendiente",
        salida: salida ? formatearHora(salida.hora) : "Pendiente",
        ultimoTipo: ultimoRegistro ? ultimoRegistro.tipo : "Sin registro",
        ultimaHora: ultimoRegistro ? formatearHora(ultimoRegistro.hora) : "--:--",
        minutosTrabajados: null,
        horasTrabajadas: "Incompleto",
        horasExtra: "0 h",
        horasPerdidas: "Pendiente",
      };
    }

    let minutosComida = 0;

    if (salidaComida && regresoComida) {
      minutosComida =
        obtenerMinutos(regresoComida.hora) - obtenerMinutos(salidaComida.hora);
    }

    const minutosTrabajados =
      obtenerMinutos(salida.hora) - obtenerMinutos(entrada.hora) - minutosComida;

    const diferencia = minutosTrabajados - MINUTOS_JORNADA_ESPERADA;

    return {
      entrada: formatearHora(entrada.hora),
      salida: formatearHora(salida.hora),
      ultimoTipo: ultimoRegistro ? ultimoRegistro.tipo : "Sin registro",
      ultimaHora: ultimoRegistro ? formatearHora(ultimoRegistro.hora) : "--:--",
      minutosTrabajados,
      horasTrabajadas: convertirHoras(minutosTrabajados),
      horasExtra: diferencia > 0 ? convertirHoras(diferencia) : "0 h",
      horasPerdidas: diferencia < 0 ? convertirHoras(diferencia) : "0 h",
    };
  }

  const resumenEmpleados = usuarios.map((usuario) => {
    const departamento = departamentos.find(
      (depa) => depa.id_departamento === usuario.id_departamento
    );

    const rol = roles.find((rol) => rol.id_rol === usuario.id_rol);
    const resumen = calcularResumenUsuario(usuario.id_usuario);

    return {
      ...usuario,
      departamento: departamento?.nombre_departamento || "Sin departamento",
      rol: rol?.nombre_rol || "Sin rol",
      iniciales: `${usuario.nombre[0]}${usuario.apellido_paterno[0]}`,
      ...resumen,
    };
  });

  const empleadosEnPlanta = resumenEmpleados.filter(
    (empleado) =>
      empleado.ultimoTipo === "entrada" ||
      empleado.ultimoTipo === "regreso_comida"
  ).length;

  const retardosHoy = registros.filter(
    (registro) =>
      registro.tipo === "entrada" &&
      obtenerMinutos(registro.hora) > 7 * 60 + 10
  ).length;

  const totalMinutosTrabajados = resumenEmpleados.reduce(
    (total, empleado) => total + (empleado.minutosTrabajados || 0),
    0
  );

  const asistenciaPorDepartamento = departamentos.map((depa) => {
    const empleadosDepa = resumenEmpleados.filter(
      (empleado) => empleado.id_departamento === depa.id_departamento
    );

    const enPlanta = empleadosDepa.filter(
      (empleado) =>
        empleado.ultimoTipo === "entrada" ||
        empleado.ultimoTipo === "regreso_comida"
    ).length;

    const retardos = empleadosDepa.filter((empleado) => {
      const entrada = registros.find(
        (registro) =>
          registro.id_usuario === empleado.id_usuario &&
          registro.tipo === "entrada"
      );

      return entrada && obtenerMinutos(entrada.hora) > 7 * 60 + 10;
    }).length;

    return {
      nombre: depa.nombre_departamento,
      abreviado: depa.nombre_departamento.slice(0, 4) + ".",
      presentes: enPlanta,
      retardos,
      totalEmpleados: empleadosDepa.length,
    };
  });

  const maxGrafica = Math.max(
    ...asistenciaPorDepartamento.map((item) => item.totalEmpleados),
    1
  );

  function toggleDetalles(idUsuario) {
    setSelectedUserId(selectedUserId === idUsuario ? null : idUsuario);
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <img src="/roceel-logo.png" alt="ROCEEL Logo" className="logo-img" />
          </div>

          <nav className="side-menu">
            <Link className="active" to="/admin/dashboard">
              <span>▦</span>
              Dashboard
            </Link>

            <Link to="/admin/registro-facial">
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
          <h1>Panel de Asistencia</h1>
          <p>viernes, 22 de mayo de 2026</p>
        </header>

        <section className="stats-grid three-cards">
          <div className="stat-card">
            <div>
              <p>Empleados en planta</p>
              <h2>{empleadosEnPlanta}</h2>
              <span>Sin salida registrada</span>
            </div>

            <div className="stat-icon blue">👥</div>
          </div>

          <div className="stat-card">
            <div>
              <p>Retardos hoy</p>
              <h2 className="orange-text">{retardosHoy}</h2>
              <span>Entrada después de 07:10</span>
            </div>

            <div className="stat-icon orange">⚠</div>
          </div>

          <div className="stat-card">
            <div>
              <p>Horas totales</p>
              <h2 className="green-text">
                {convertirHoras(totalMinutosTrabajados)}
              </h2>
              <span>Horas trabajadas calculadas</span>
            </div>

            <div className="stat-icon green">↗</div>
          </div>
        </section>

        <section className="filters-card">
          <div className="filter-group">
            <label>Departamento</label>
            <select defaultValue="todos">
              <option value="todos">Todos los departamentos</option>
              {departamentos.map((departamento) => (
                <option
                  key={departamento.id_departamento}
                  value={departamento.nombre_departamento}
                >
                  {departamento.nombre_departamento}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Fecha</label>
            <input type="date" defaultValue="2026-05-22" />
          </div>

          <div className="export-actions">
            <button type="button">Exportar Excel</button>
            <button type="button">Exportar PDF</button>
          </div>
        </section>

        <section className="dashboard-stack">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h2>Resumen en Tiempo Real</h2>
                <p>Vista de usuarios existentes y su estado biométrico.</p>
              </div>

              <span className="live-badge">
                <span></span>
                En vivo
              </span>
            </div>

            <div className="table-wrapper clean-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID Usuario</th>
                    <th>Empleado</th>
                    <th>Departamento</th>
                    <th>Rostro</th>
                    <th>Detalles</th>
                  </tr>
                </thead>

                <tbody>
                  {resumenEmpleados.map((empleado) => (
                    <Fragment key={empleado.id_usuario}>
                      <tr>
                        <td>{empleado.id_usuario}</td>

                        <td>
                          <div className="employee-cell">
                            <div className="avatar">{empleado.iniciales}</div>

                            <div>
                              <strong>
                                {empleado.nombre} {empleado.apellido_paterno}
                              </strong>
                              <p>{empleado.email}</p>
                            </div>
                          </div>
                        </td>

                        <td>{empleado.departamento}</td>

                        <td>
                          <span
                            className={
                              empleado.datos_faciales
                                ? "face-badge registered"
                                : "face-badge pending"
                            }
                          >
                            {estadoFacial(empleado.datos_faciales)}
                          </span>
                        </td>

                        <td>
                          <button
                            className="details-btn"
                            onClick={() => toggleDetalles(empleado.id_usuario)}
                          >
                            {selectedUserId === empleado.id_usuario
                              ? "Ocultar"
                              : "Ver detalles"}
                          </button>
                        </td>
                      </tr>

                      {selectedUserId === empleado.id_usuario && (
                        <tr className="details-row">
                          <td colSpan="5">
                            <div className="details-panel">
                              <div>
                                <span>Último movimiento</span>
                                <strong>{formatearTipo(empleado.ultimoTipo)}</strong>
                              </div>

                              <div>
                                <span>Última hora</span>
                                <strong>{empleado.ultimaHora}</strong>
                              </div>

                              <div>
                                <span>Entrada</span>
                                <strong>{empleado.entrada}</strong>
                              </div>

                              <div>
                                <span>Salida</span>
                                <strong>{empleado.salida}</strong>
                              </div>

                              <div>
                                <span>Horas trabajadas</span>
                                <strong>{empleado.horasTrabajadas}</strong>
                              </div>

                              <div>
                                <span>Horas extra</span>
                                <strong>{empleado.horasExtra}</strong>
                              </div>

                              <div>
                                <span>Horas perdidas</span>
                                <strong>{empleado.horasPerdidas}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-card full-chart-card">
            <div className="card-header">
              <div>
                <h2>Asistencia por Departamento</h2>
                <p>Turno matutino — hoy</p>
              </div>
            </div>

            <div className="attendance-chart">
              <div className="chart-y-axis">
                <span>{maxGrafica}</span>
                <span>{Math.ceil(maxGrafica * 0.75)}</span>
                <span>{Math.ceil(maxGrafica * 0.5)}</span>
                <span>{Math.ceil(maxGrafica * 0.25)}</span>
                <span>0</span>
              </div>

              <div className="chart-plot">
                <div className="grid-line line-24"></div>
                <div className="grid-line line-18"></div>
                <div className="grid-line line-12"></div>
                <div className="grid-line line-6"></div>
                <div className="grid-line line-0"></div>

                {asistenciaPorDepartamento.map((item) => {
                  const height = Math.max(
                    (item.totalEmpleados / maxGrafica) * 100,
                    8
                  );

                  return (
                    <div className="attendance-bar-item" key={item.nombre}>
                      <div
                        className="attendance-bar"
                        style={{ height: `${height}%` }}
                      ></div>
                      <p>{item.abreviado}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="attendance-legend">
              <span>
                <b className="legend-green"></b> Presentes
              </span>

              <span>
                <b className="legend-red"></b> Ausentes
              </span>

              <span>
                <b className="legend-yellow"></b> Retardos
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;