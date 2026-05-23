import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const FECHA_HOY = "2026-05-22";
const PAGE_SIZE = 6;
const HORA_ENTRADA_ESPERADA = 8 * 60;
const TOLERANCIA_MINUTOS = 10;
const MINUTOS_JORNADA_ESPERADA = 9 * 60;

function Dashboard({ onLogout }) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState("todos");
  const [chartTab, setChartTab] = useState("grafica");
  const [currentPage, setCurrentPage] = useState(1);

  const departamentos = [
    { id_departamento: 1, nombre_departamento: "Mantenimiento" },
    { id_departamento: 2, nombre_departamento: "Maquinaria" },
    { id_departamento: 3, nombre_departamento: "Administracion" },
    { id_departamento: 4, nombre_departamento: "Logistica" },
  ];

  const roles = [
    { id_rol: 1, nombre_rol: "Administrador" },
    { id_rol: 2, nombre_rol: "Operador" },
  ];

  const usuarios = [
    { id_usuario: 1, nombre: "Carlos", apellido_paterno: "Mendoza", apellido_materno: "Rios", email: "carlos.mendoza@roceel.com", datos_faciales: true, id_departamento: 1, id_rol: 2 },
    { id_usuario: 2, nombre: "Diego", apellido_paterno: "Sanchez", apellido_materno: "Luna", email: "diego.sanchez@roceel.com", datos_faciales: true, id_departamento: 1, id_rol: 2 },
    { id_usuario: 3, nombre: "Ana", apellido_paterno: "Garcia", apellido_materno: "Lopez", email: "ana.garcia@roceel.com", datos_faciales: true, id_departamento: 2, id_rol: 2 },
    { id_usuario: 4, nombre: "Luis", apellido_paterno: "Torres", apellido_materno: "Vega", email: "luis.torres@roceel.com", datos_faciales: false, id_departamento: 2, id_rol: 2 },
    { id_usuario: 5, nombre: "Marta", apellido_paterno: "Flores", apellido_materno: "Cano", email: "marta.flores@roceel.com", datos_faciales: true, id_departamento: 2, id_rol: 2 },
    { id_usuario: 6, nombre: "Jorge", apellido_paterno: "Reyes", apellido_materno: "Diaz", email: "jorge.reyes@roceel.com", datos_faciales: false, id_departamento: 3, id_rol: 2 },
    { id_usuario: 7, nombre: "Paola", apellido_paterno: "Nava", apellido_materno: "Soto", email: "paola.nava@roceel.com", datos_faciales: true, id_departamento: 4, id_rol: 2 },
    { id_usuario: 8, nombre: "Ruben", apellido_paterno: "Ortiz", apellido_materno: "Mora", email: "ruben.ortiz@roceel.com", datos_faciales: false, id_departamento: 4, id_rol: 2 },
  ];

  const registros = [
    { id_registro: 1, id_usuario: 1, fecha: FECHA_HOY, hora: "2026-05-22 08:04:00", tipo: "entrada" },
    { id_registro: 2, id_usuario: 1, fecha: FECHA_HOY, hora: "2026-05-22 13:00:00", tipo: "salida_comida" },
    { id_registro: 3, id_usuario: 1, fecha: FECHA_HOY, hora: "2026-05-22 14:00:00", tipo: "regreso_comida" },
    { id_registro: 4, id_usuario: 1, fecha: FECHA_HOY, hora: "2026-05-22 18:05:00", tipo: "salida" },
    { id_registro: 5, id_usuario: 2, fecha: FECHA_HOY, hora: "2026-05-22 08:18:00", tipo: "entrada" },
    { id_registro: 6, id_usuario: 2, fecha: FECHA_HOY, hora: "2026-05-22 13:03:00", tipo: "salida_comida" },
    { id_registro: 7, id_usuario: 2, fecha: FECHA_HOY, hora: "2026-05-22 14:08:00", tipo: "regreso_comida" },
    { id_registro: 8, id_usuario: 3, fecha: FECHA_HOY, hora: "2026-05-22 07:58:00", tipo: "entrada" },
    { id_registro: 9, id_usuario: 3, fecha: FECHA_HOY, hora: "2026-05-22 18:00:00", tipo: "salida" },
    { id_registro: 10, id_usuario: 4, fecha: FECHA_HOY, hora: "2026-05-22 08:09:00", tipo: "entrada" },
    { id_registro: 11, id_usuario: 4, fecha: FECHA_HOY, hora: "2026-05-22 13:00:00", tipo: "salida_comida" },
    { id_registro: 12, id_usuario: 7, fecha: FECHA_HOY, hora: "2026-05-22 08:01:00", tipo: "entrada" },
  ];

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
    return fechaHora ? fechaHora.slice(11, 16) : "Pendiente";
  }

  function formatearTipo(tipo) {
    if (tipo === "entrada") return "Entrada";
    if (tipo === "salida") return "Salida";
    if (tipo === "salida_comida") return "Salida comida";
    if (tipo === "regreso_comida") return "Regreso comida";
    return tipo || "Sin registro";
  }

  function calcularResumenUsuario(idUsuario) {
    const registrosUsuario = registros
      .filter((registro) => registro.id_usuario === idUsuario && registro.fecha === FECHA_HOY)
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

    const minutosComida =
      salidaComida && regresoComida
        ? obtenerMinutos(regresoComida.hora) - obtenerMinutos(salidaComida.hora)
        : 0;

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

  const registrosHoy = registros.filter((registro) => registro.fecha === FECHA_HOY);
  const usuariosConRegistroHoy = new Set(registrosHoy.map((registro) => registro.id_usuario));
  const usuariosConEntradaHoy = new Set(
    registrosHoy
      .filter((registro) => registro.tipo === "entrada")
      .map((registro) => registro.id_usuario)
  );

  const resumenEmpleados = useMemo(
    () =>
      usuarios.map((usuario) => {
        const departamento = departamentos.find(
          (depa) => depa.id_departamento === usuario.id_departamento
        );
        const rol = roles.find((item) => item.id_rol === usuario.id_rol);
        const resumen = calcularResumenUsuario(usuario.id_usuario);

        return {
          ...usuario,
          departamento: departamento?.nombre_departamento || "Sin departamento",
          rol: rol?.nombre_rol || "Sin rol",
          iniciales: `${usuario.nombre[0]}${usuario.apellido_paterno[0]}`,
          ...resumen,
        };
      }),
    []
  );

  const empleadosEnPlanta = usuariosConRegistroHoy.size;
  const retardosHoy = registrosHoy.filter(
    (registro) =>
      registro.tipo === "entrada" &&
      obtenerMinutos(registro.hora) > HORA_ENTRADA_ESPERADA + TOLERANCIA_MINUTOS
  ).length;
  const faltasHoy = resumenEmpleados.filter(
    (empleado) => !usuariosConEntradaHoy.has(empleado.id_usuario)
  );

  const asistenciaPorDepartamento = departamentos.map((depa) => {
    const empleadosDepa = resumenEmpleados.filter(
      (empleado) => empleado.id_departamento === depa.id_departamento
    );
    const presentes = empleadosDepa.filter((empleado) =>
      usuariosConEntradaHoy.has(empleado.id_usuario)
    ).length;
    const retardos = empleadosDepa.filter((empleado) => {
      const entrada = registrosHoy.find(
        (registro) =>
          registro.id_usuario === empleado.id_usuario && registro.tipo === "entrada"
      );
      return entrada && obtenerMinutos(entrada.hora) > HORA_ENTRADA_ESPERADA + TOLERANCIA_MINUTOS;
    }).length;

    return {
      nombre: depa.nombre_departamento,
      abreviado: depa.nombre_departamento.slice(0, 4) + ".",
      presentes,
      retardos,
      totalEmpleados: empleadosDepa.length,
    };
  });

  const maxGrafica = Math.max(
    ...asistenciaPorDepartamento.map((item) => item.totalEmpleados),
    1
  );

  const resumenFiltrado = resumenEmpleados.filter((empleado) => {
    if (departmentFilter === "todos") return true;
    return empleado.id_departamento === Number(departmentFilter);
  });

  const totalPages = Math.max(Math.ceil(resumenFiltrado.length / PAGE_SIZE), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const resumenPaginado = resumenFiltrado.slice(pageStart, pageStart + PAGE_SIZE);

  function toggleDetalles(idUsuario) {
    setSelectedUserId(selectedUserId === idUsuario ? null : idUsuario);
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="sidebar-wordmark">ROCEEL</div>
          </div>

          <nav className="side-menu">
            <Link className="active" to="/admin/dashboard">
              <span>#</span>
              Dashboard
            </Link>

            <Link to="/admin/registro-facial">
              <span>o</span>
              Registro facial
            </Link>

            <button onClick={onLogout}>
              <span>&lt;</span>
              Cerrar sesion
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
              <span>Con registro el dia de hoy</span>
            </div>
            <div className="stat-icon blue">IN</div>
          </div>

          <div className="stat-card">
            <div>
              <p>Retardos hoy</p>
              <h2 className="orange-text">{retardosHoy}</h2>
              <span>Entrada despues de 08:10</span>
            </div>
            <div className="stat-icon orange">!</div>
          </div>

          <div className="stat-card">
            <div>
              <p>Faltas hoy</p>
              <h2 className="green-text">{faltasHoy.length}</h2>
              <span>No han checado entrada</span>
            </div>
            <div className="stat-icon green">--</div>
          </div>
        </section>

        <section className="filters-card">
          <div className="filter-group">
            <label>Departamento</label>
            <select
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="todos">Todos los departamentos</option>
              {departamentos.map((departamento) => (
                <option
                  key={departamento.id_departamento}
                  value={departamento.id_departamento}
                >
                  {departamento.nombre_departamento}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Fecha</label>
            <input type="date" defaultValue={FECHA_HOY} />
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
                <h2>Resumen en tiempo real</h2>
                <p>
                  {resumenFiltrado.length} empleados encontrados. Pagina{" "}
                  {safeCurrentPage} de {totalPages}.
                </p>
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
                  {resumenPaginado.map((empleado) => (
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
                            {empleado.datos_faciales ? "Registrado" : "Pendiente"}
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
                                <span>Ultimo movimiento</span>
                                <strong>{formatearTipo(empleado.ultimoTipo)}</strong>
                              </div>
                              <div>
                                <span>Ultima hora</span>
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

            <div className="pagination-bar">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                Anterior
              </button>

              <span>
                {resumenFiltrado.length === 0 ? 0 : pageStart + 1}-
                {Math.min(pageStart + PAGE_SIZE, resumenFiltrado.length)} de{" "}
                {resumenFiltrado.length}
              </span>

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="chart-card full-chart-card">
            <div className="card-header">
              <div>
                <h2>Asistencia por departamento</h2>
                <p>Asistieron hoy contra total del departamento</p>
              </div>

              <div className="chart-tabs">
                <button
                  type="button"
                  className={chartTab === "grafica" ? "active" : ""}
                  onClick={() => setChartTab("grafica")}
                >
                  Grafica
                </button>
                <button
                  type="button"
                  className={chartTab === "faltas" ? "active" : ""}
                  onClick={() => setChartTab("faltas")}
                >
                  Sin entrada
                </button>
              </div>
            </div>

            {chartTab === "grafica" ? (
              <>
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
                        (item.presentes / maxGrafica) * 100,
                        item.presentes > 0 ? 8 : 2
                      );

                      return (
                        <div className="attendance-bar-item" key={item.nombre}>
                          <div className="bar-count">
                            {item.presentes}-{item.totalEmpleados}
                          </div>
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
                    <b className="legend-green"></b> Asistieron
                  </span>
                  <span>
                    <b className="legend-red"></b> Sin entrada
                  </span>
                  <span>
                    <b className="legend-yellow"></b> Retardos
                  </span>
                </div>
              </>
            ) : (
              <div className="absences-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID Usuario</th>
                      <th>Empleado</th>
                      <th>Departamento</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {faltasHoy.map((empleado) => (
                      <tr key={empleado.id_usuario}>
                        <td>{empleado.id_usuario}</td>
                        <td>
                          {empleado.nombre} {empleado.apellido_paterno}
                        </td>
                        <td>{empleado.departamento}</td>
                        <td>
                          <span className="face-badge pending">Sin entrada</span>
                        </td>
                      </tr>
                    ))}

                    {faltasHoy.length === 0 && (
                      <tr>
                        <td colSpan="4">Todos los empleados checaron entrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
