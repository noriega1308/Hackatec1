import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 6;
const MINUTOS_JORNADA_ESPERADA = 9 * 60;
const HORA_LIMITE_ENTRADA = "08:10";
const HORA_PUNTUAL_DESTACADO = "07:30";

function Dashboard({ onLogout, view = "dashboard" }) {
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState("todos");
  const [chartTab, setChartTab] = useState("grafica");
  const [currentPage, setCurrentPage] = useState(1);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardData, setDashboardData] = useState({
    metricas: {
      empleadosEnPlanta: 0,
      retardosHoy: 0,
      faltasHoy: 0,
    },
    departamentos: [],
    empleadosActual: [],
    empleados: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isGestion = view === "gestion";

  useEffect(() => {
    const controller = new AbortController();

    async function cargarDashboard() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (fechaInicio) params.set("fechaInicio", fechaInicio);
        if (fechaFin) params.set("fechaFin", fechaFin);

        const response = await fetch(`${API_URL}/reportes/dashboard?${params}`, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Error al cargar dashboard");
        }

        setDashboardData(data);
        if (!fechaInicio) setFechaInicio(data.fechaInicio);
        if (!fechaFin) setFechaFin(data.fechaFin);
        setCurrentPage(1);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error cargando dashboard:", err);
          setError(err.message || "No se pudo conectar con el servidor");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    cargarDashboard();

    return () => controller.abort();
  }, [fechaInicio, fechaFin]);

  function obtenerMinutos(hora) {
    if (!hora) return null;
    const [hh, mm] = hora.slice(0, 5).split(":").map(Number);
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

  function formatearHora(hora) {
    if (!hora) return "Pendiente";
    const partes = String(hora).split(":");
    const horas = partes[0]?.padStart(2, "0") || "00";
    const minutos = partes[1]?.padStart(2, "0") || "00";
    return `${horas}:${minutos}`;
  }

  function formatearTipo(tipo) {
    if (tipo === "entrada") return "Entrada";
    if (tipo === "salida") return "Salida";
    if (tipo === "salida_comida") return "Salida comida";
    if (tipo === "regreso_comida") return "Regreso comida";
    return "Sin registro";
  }

  function calcularResumenEmpleado(empleado) {
    const entrada = obtenerMinutos(empleado.entrada);
    const salida = obtenerMinutos(empleado.salida);
    const salidaComida = obtenerMinutos(empleado.salida_comida);
    const regresoComida = obtenerMinutos(empleado.regreso_comida);

    if (entrada === null || salida === null) {
      return {
        minutosTrabajados: null,
        horasTrabajadas: "Incompleto",
        horasExtra: "0 h",
        horasPerdidas: "Pendiente",
      };
    }

    const minutosComida =
      salidaComida !== null && regresoComida !== null
        ? regresoComida - salidaComida
        : 0;

    const minutosTrabajados = salida - entrada - minutosComida;
    const diferencia = minutosTrabajados - MINUTOS_JORNADA_ESPERADA;

    return {
      minutosTrabajados,
      horasTrabajadas: convertirHoras(minutosTrabajados),
      horasExtra: diferencia > 0 ? convertirHoras(diferencia) : "0 h",
      horasPerdidas: diferencia < 0 ? convertirHoras(diferencia) : "0 h",
    };
  }

  const mapearResumenEmpleados = (empleados) =>
    empleados.map((empleado) => {
        const resumen = calcularResumenEmpleado(empleado);

        return {
          ...empleado,
          departamento: empleado.departamento || "Sin departamento",
          rowKey: `${empleado.id_usuario}-${empleado.fecha || "sin-fecha"}`,
          iniciales: `${empleado.nombre?.[0] || ""}${empleado.apellido_paterno?.[0] || ""}`,
          fechaVista: empleado.fecha || "Sin fecha",
          entradaVista: formatearHora(empleado.entrada),
          salidaVista: formatearHora(empleado.salida),
          ultimaHoraVista: formatearHora(empleado.ultima_hora),
          ...resumen,
        };
      });

  const resumenEmpleados = useMemo(
    () => mapearResumenEmpleados(dashboardData.empleados),
    [dashboardData.empleados]
  );

  const resumenActual = useMemo(
    () => mapearResumenEmpleados(dashboardData.empleadosActual),
    [dashboardData.empleadosActual]
  );

  const faltasHoy = resumenActual.filter((empleado) => !empleado.tiene_entrada);
  const retardosActual = resumenActual.filter(
    (empleado) => empleado.entradaVista !== "Pendiente" && empleado.entradaVista > HORA_LIMITE_ENTRADA
  );

  const asistenciaPorDepartamento = dashboardData.departamentos.map((departamento) => {
    const empleadosDepa = resumenActual.filter(
      (empleado) => empleado.id_departamento === departamento.id_departamento
    );
    const presentes = empleadosDepa.filter((empleado) => empleado.tiene_entrada).length;

    return {
      nombre: departamento.nombre_departamento,
      abreviado: `${departamento.nombre_departamento.slice(0, 4)}.`,
      presentes,
      totalEmpleados: empleadosDepa.length,
    };
  });

  const maxGrafica = Math.max(
    ...asistenciaPorDepartamento.map((item) => item.totalEmpleados),
    1
  );

  const resumenFiltrado = resumenEmpleados.filter((empleado) => {
    const matchesDepartment =
      departmentFilter === "todos" ||
      empleado.id_departamento === Number(departmentFilter);

    const fullName = `${empleado.nombre || ""} ${empleado.apellido_paterno || ""} ${
      empleado.apellido_materno || ""
    }`.toLowerCase();

    const matchesSearch = fullName.includes(searchTerm.trim().toLowerCase());

    return matchesDepartment && matchesSearch;
  });

  const totalPages = Math.max(Math.ceil(resumenFiltrado.length / PAGE_SIZE), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const resumenPaginado = resumenFiltrado.slice(pageStart, pageStart + PAGE_SIZE);

  function toggleDetalles(rowKey) {
    setSelectedRowKey(selectedRowKey === rowKey ? null : rowKey);
  }

  const selectedEmployee = resumenEmpleados.find(
    (empleado) => empleado.rowKey === selectedRowKey
  );

  const obtenerRegistrosIndividuales = () => {
    if (!selectedEmployee) return [];

    return resumenEmpleados.filter(
      (empleado) => empleado.id_usuario === selectedEmployee.id_usuario
    );
  };

  function buildCsv(empleados) {
    const headers = [
      "ID",
      "Fecha",
      "Nombre",
      "Departamento",
      "Entrada",
      "Salida comida",
      "Regreso comida",
      "Salida",
      "Horas trabajadas",
      "Horas extra",
      "Horas perdidas",
      "Ultimo movimiento",
    ];

    const rows = empleados.map((empleado) => [
      empleado.id_usuario,
      empleado.fechaVista,
      `${empleado.nombre} ${empleado.apellido_paterno}`,
      empleado.departamento,
      empleado.entradaVista,
      formatearHora(empleado.salida_comida),
      formatearHora(empleado.regreso_comida),
      empleado.salidaVista,
      empleado.horasTrabajadas,
      empleado.horasExtra,
      empleado.horasPerdidas,
      formatearTipo(empleado.ultimo_tipo),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
  }

  function descargarCsv(empleados, nombreArchivo) {
    const csv = buildCsv(empleados);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportarExcelGeneral() {
    descargarCsv(resumenFiltrado, `reporte-general-roceel-${fechaInicio}-${fechaFin}.csv`);
  }

  function exportarExcelIndividual() {
    if (!selectedEmployee) {
      alert("Abre los detalles de un empleado para exportar individual.");
      return;
    }

    const registrosEmpleado = obtenerRegistrosIndividuales();

    descargarCsv(
      registrosEmpleado,
      `reporte-${selectedEmployee.id_usuario}-${fechaInicio}-${fechaFin}.csv`
    );
  }

  function imprimirEmpleados(empleados, titulo) {
    const rows = empleados
      .map(
        (empleado) => `
          <tr>
            <td>${empleado.id_usuario}</td>
            <td>${empleado.fechaVista}</td>
            <td>${empleado.nombre} ${empleado.apellido_paterno}</td>
            <td>${empleado.departamento}</td>
            <td>${empleado.entradaVista}</td>
            <td>${formatearHora(empleado.salida_comida)}</td>
            <td>${formatearHora(empleado.regreso_comida)}</td>
            <td>${empleado.salidaVista}</td>
            <td>${empleado.horasTrabajadas}</td>
            <td>${empleado.horasExtra}</td>
            <td>${empleado.horasPerdidas}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=760");

    if (!printWindow) {
      alert("El navegador bloqueo la ventana de impresion.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { margin: 0 0 6px; }
            p { margin: 0 0 22px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${titulo}</h1>
          <p>ROCEEL | ${fechaInicio} al ${fechaFin}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Entrada</th>
                <th>Salida comida</th>
                <th>Regreso comida</th>
                <th>Salida</th>
                <th>Trabajadas</th>
                <th>Extra</th>
                <th>Perdidas</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function escaparHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function obtenerMinutosEntrada(empleado) {
    if (!empleado.entradaVista || empleado.entradaVista === "Pendiente") return null;
    return obtenerMinutos(empleado.entradaVista);
  }

  function agruparPuntualidad(empleados) {
    return empleados.reduce(
      (grupos, empleado) => {
        const entradaMinutos = obtenerMinutosEntrada(empleado);
        const destacadoMinutos = obtenerMinutos(HORA_PUNTUAL_DESTACADO);
        const limiteMinutos = obtenerMinutos(HORA_LIMITE_ENTRADA);

        if (entradaMinutos === null) {
          grupos.sinEntrada.push(empleado);
        } else if (entradaMinutos < destacadoMinutos) {
          grupos.destacados.push(empleado);
        } else if (entradaMinutos <= limiteMinutos) {
          grupos.tolerancia.push(empleado);
        } else {
          grupos.retardos.push(empleado);
        }

        return grupos;
      },
      {
        destacados: [],
        tolerancia: [],
        retardos: [],
        sinEntrada: [],
      }
    );
  }

  function porcentaje(cantidad, total) {
    if (!total) return 0;
    return Math.round((cantidad / total) * 100);
  }

  function crearFilasReporte(empleados, mostrarEstado = false) {
    if (empleados.length === 0) {
      const columnas = mostrarEstado ? 6 : 5;
      return `<tr><td colspan="${columnas}" class="empty-row">Sin empleados en esta categoria</td></tr>`;
    }

    return empleados
      .map(
        (empleado, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escaparHtml(empleado.fechaVista)}</td>
            <td>${escaparHtml(`${empleado.nombre} ${empleado.apellido_paterno}`)}</td>
            <td>${escaparHtml(empleado.departamento)}</td>
            <td>${escaparHtml(empleado.entradaVista)}</td>
            ${
              mostrarEstado
                ? `<td>${escaparHtml(empleado.ultimo_tipo ? formatearTipo(empleado.ultimo_tipo) : "Sin registro")}</td>`
                : ""
            }
          </tr>
        `
      )
      .join("");
  }

  function crearBarrasTiempo(empleados) {
    const buckets = new Map();

    empleados.forEach((empleado) => {
      if (!empleado.entradaVista || empleado.entradaVista === "Pendiente") return;
      buckets.set(empleado.entradaVista, (buckets.get(empleado.entradaVista) || 0) + 1);
    });

    const horasOrdenadas = Array.from(buckets.entries()).sort(([horaA], [horaB]) =>
      horaA.localeCompare(horaB)
    );

    if (horasOrdenadas.length === 0) {
      return `<div class="timeline-empty">No hay entradas registradas para el filtro actual.</div>`;
    }

    const maximo = Math.max(...horasOrdenadas.map(([, cantidad]) => cantidad), 1);

    return horasOrdenadas
      .map(([hora, cantidad]) => {
        const altura = 18 + (cantidad / maximo) * 58;
        const minutos = obtenerMinutos(hora);
        const clase =
          minutos < obtenerMinutos(HORA_PUNTUAL_DESTACADO)
            ? "early"
            : minutos <= obtenerMinutos(HORA_LIMITE_ENTRADA)
              ? "ok"
              : "late";

        return `
          <div class="timeline-bar">
            <span>${cantidad}</span>
            <b class="${clase}" style="height:${altura}px"></b>
            <small>${escaparHtml(hora)}</small>
          </div>
        `;
      })
      .join("");
  }

  function calcularMetricasPeriodo(empleados) {
    const diasEvaluados = empleados.length;
    const minutosEsperados = diasEvaluados * MINUTOS_JORNADA_ESPERADA;

    const minutosTrabajados = empleados.reduce((total, empleado) => {
      if (typeof empleado.minutosTrabajados !== "number") return total;
      return total + Math.max(empleado.minutosTrabajados, 0);
    }, 0);

    const minutosExtra = empleados.reduce((total, empleado) => {
      if (typeof empleado.minutosTrabajados !== "number") return total;
      const diferencia = empleado.minutosTrabajados - MINUTOS_JORNADA_ESPERADA;
      return total + Math.max(diferencia, 0);
    }, 0);

    const minutosPerdidos = Math.max(minutosEsperados - minutosTrabajados + minutosExtra, 0);

    return {
      diasEvaluados,
      minutosEsperados,
      minutosTrabajados,
      minutosExtra,
      minutosPerdidos,
    };
  }

  function imprimirReporteGeneral(empleados, opciones = {}) {
    const grupos = agruparPuntualidad(empleados);
    const metricasPeriodo = calcularMetricasPeriodo(empleados);
    const total = empleados.length;
    const destacadosPct = porcentaje(grupos.destacados.length, total);
    const toleranciaPct = porcentaje(grupos.tolerancia.length, total);
    const retardosPct = porcentaje(grupos.retardos.length, total);
    const sinEntradaPct = porcentaje(grupos.sinEntrada.length, total);
    const destacadoDeg = (grupos.destacados.length / Math.max(total, 1)) * 360;
    const toleranciaDeg = destacadoDeg + (grupos.tolerancia.length / Math.max(total, 1)) * 360;
    const retardosDeg = toleranciaDeg + (grupos.retardos.length / Math.max(total, 1)) * 360;
    const departamentoTexto =
      departmentFilter === "todos"
        ? "Todos los departamentos"
        : dashboardData.departamentos.find(
            (departamento) => departamento.id_departamento === Number(departmentFilter)
          )?.nombre_departamento || "Departamento filtrado";
    const tituloReporte = opciones.titulo || "ESTUDIO DE PUNTUALIDAD";
    const contextoReporte = opciones.contexto || departamentoTexto;
    const resumenTitulo = opciones.resumenTitulo || "Resumen general";
    const notaFiltro =
      opciones.notaFiltro ||
      "El reporte respeta los filtros de fecha, departamento y busqueda aplicados.";
    const detallePersona = opciones.detallePersona;
    const mostrarMetricasHoras = Boolean(opciones.mostrarMetricasHoras);

    const printWindow = window.open("", "_blank", "width=1440,height=900");

    if (!printWindow) {
      alert("El navegador bloqueo la ventana de impresion.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escaparHtml(tituloReporte)} ROCEEL</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #07111c;
              color: #f8fbff;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report {
              width: 100%;
              min-height: 100vh;
              padding: 16px;
              background:
                linear-gradient(115deg, rgba(22, 201, 145, 0.15), transparent 28%),
                radial-gradient(circle at 84% 8%, rgba(63, 116, 184, 0.18), transparent 24%),
                #07111c;
            }
            .hero {
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 18px;
              align-items: start;
              margin-bottom: 12px;
            }
            .hero h1 {
              margin: 0;
              font-size: 30px;
              line-height: 1;
              letter-spacing: .02em;
            }
            .hero p {
              margin: 8px 0 0;
              color: #b9d1e8;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .brand-print {
              text-align: right;
              font-size: 28px;
              font-weight: 950;
              letter-spacing: .12em;
              color: #eafff8;
            }
            .brand-print span {
              display: block;
              margin-top: 2px;
              font-size: 9px;
              letter-spacing: .32em;
              color: #b9d1e8;
            }
            .top-grid {
              display: grid;
              grid-template-columns: 1.15fr repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 10px;
            }
            .person-strip {
              display: grid;
              grid-template-columns: 1.25fr repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 10px;
            }
            .person-card {
              border: 1px solid rgba(185, 209, 232, .28);
              border-radius: 8px;
              background: rgba(6, 16, 27, .82);
              padding: 12px;
              min-height: 82px;
            }
            .person-card small {
              display: block;
              color: #9fc0dd;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .person-card strong {
              display: block;
              color: #f8fbff;
              font-size: 18px;
              line-height: 1.15;
            }
            .person-card span {
              display: block;
              color: #b9d1e8;
              font-size: 12px;
              margin-top: 5px;
              font-weight: 700;
            }
            .hours-strip {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 10px;
            }
            .hours-card {
              border: 1px solid rgba(185, 209, 232, .30);
              border-radius: 8px;
              background: #f8fbff;
              color: #101828;
              padding: 12px;
              min-height: 78px;
            }
            .hours-card small {
              display: block;
              color: #475467;
              font-size: 10px;
              font-weight: 950;
              letter-spacing: .08em;
              text-transform: uppercase;
            }
            .hours-card strong {
              display: block;
              margin-top: 6px;
              font-size: 24px;
              color: #07111c;
            }
            .hours-card span {
              color: #667085;
              font-size: 11px;
              font-weight: 800;
            }
            .hours-card.worked strong { color: #0f926d; }
            .hours-card.extra strong { color: #0865ba; }
            .hours-card.lost strong { color: #c2410c; }
            .metric-card {
              border: 1px solid rgba(185, 209, 232, .35);
              border-radius: 8px;
              padding: 12px;
              min-height: 90px;
              background: rgba(6, 16, 27, .82);
            }
            .metric-card.green { background: linear-gradient(135deg, #397f20, #62a835); }
            .metric-card.blue { background: linear-gradient(135deg, #06498f, #0871ce); }
            .metric-card.orange { background: linear-gradient(135deg, #d45a05, #ff8a09); }
            .metric-card.red { background: linear-gradient(135deg, #83201e, #d54a45); }
            .metric-card small {
              display: block;
              color: #eff8ff;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .metric-card strong {
              display: block;
              margin-top: 8px;
              font-size: 34px;
              line-height: 1;
            }
            .metric-card span {
              display: block;
              margin-top: 4px;
              color: #f4fbff;
              font-size: 13px;
              font-weight: 800;
            }
            .middle-grid {
              display: grid;
              grid-template-columns: .88fr 1.72fr;
              gap: 10px;
              margin-bottom: 10px;
            }
            .panel {
              border: 1px solid rgba(185, 209, 232, .28);
              border-radius: 8px;
              background: rgba(4, 13, 23, .88);
              overflow: hidden;
            }
            .panel h2 {
              margin: 0;
              padding: 10px 12px;
              font-size: 15px;
              text-transform: uppercase;
              letter-spacing: .04em;
              border-bottom: 1px solid rgba(185, 209, 232, .18);
            }
            .distribution {
              display: grid;
              grid-template-columns: 170px 1fr;
              gap: 14px;
              padding: 16px;
              align-items: center;
            }
            .donut {
              width: 160px;
              height: 160px;
              border-radius: 50%;
              background: conic-gradient(
                #6fbf38 0deg ${destacadoDeg}deg,
                #0871ce ${destacadoDeg}deg ${toleranciaDeg}deg,
                #ff7a00 ${toleranciaDeg}deg ${retardosDeg}deg,
                #d54a45 ${retardosDeg}deg 360deg
              );
              position: relative;
            }
            .donut::after {
              content: "${total}";
              position: absolute;
              inset: 42px;
              border-radius: 50%;
              background: #07111c;
              display: grid;
              place-items: center;
              color: #fff;
              font-size: 34px;
              font-weight: 950;
            }
            .legend-list {
              display: grid;
              gap: 8px;
              font-size: 12px;
            }
            .legend-row {
              display: grid;
              grid-template-columns: 12px 1fr auto;
              gap: 8px;
              align-items: center;
              color: #eaf5ff;
            }
            .dot {
              width: 12px;
              height: 12px;
              border-radius: 50%;
            }
            .timeline {
              padding: 16px 18px 18px;
            }
            .time-marks {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              margin-bottom: 14px;
              color: #dcecff;
              font-size: 12px;
              font-weight: 900;
              text-align: center;
            }
            .time-marks span {
              border-top: 2px solid rgba(185, 209, 232, .55);
              padding-top: 8px;
            }
            .time-marks .limit {
              color: #6df2b5;
              border-top-color: #6df2b5;
            }
            .timeline-bars {
              height: 104px;
              display: flex;
              align-items: end;
              gap: 7px;
              padding: 0 8px;
              border-bottom: 1px solid rgba(185, 209, 232, .25);
            }
            .timeline-bar {
              min-width: 34px;
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: end;
              gap: 4px;
              color: #cde3f9;
              font-size: 9px;
            }
            .timeline-bar b {
              width: 100%;
              max-width: 18px;
              border-radius: 3px 3px 0 0;
            }
            .timeline-bar .early { background: #6fbf38; }
            .timeline-bar .ok { background: #0871ce; }
            .timeline-bar .late { background: #ff7a00; }
            .timeline-empty {
              padding: 34px;
              color: #b9d1e8;
              text-align: center;
              border: 1px dashed rgba(185, 209, 232, .28);
              border-radius: 8px;
            }
            .category-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 10px;
            }
            .table-panel {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .table-panel h3 {
              margin: 0;
              padding: 9px 10px;
              color: #fff;
              font-size: 12px;
              text-transform: uppercase;
            }
            .table-panel.green h3 { background: #4f9729; }
            .table-panel.blue h3 { background: #0865ba; }
            .table-panel.orange h3 { background: #e66906; }
            .table-panel.red h3 { background: #b9322e; }
            table {
              width: 100%;
              border-collapse: collapse;
              background: #f8fbff;
              color: #111827;
            }
            th, td {
              border: 1px solid #d7e0ea;
              padding: 7px 8px;
              font-size: 11px;
              text-align: left;
            }
            th {
              background: #eef4fb;
              color: #142337;
              font-size: 10px;
              text-transform: uppercase;
            }
            .empty-row {
              text-align: center;
              color: #667085;
              padding: 16px;
            }
            .bottom-grid {
              display: grid;
              grid-template-columns: .95fr 1.15fr 1fr;
              gap: 10px;
            }
            .white-box {
              background: #f8fbff;
              color: #111827;
              border-radius: 8px;
              padding: 12px;
              min-height: 120px;
            }
            .white-box h2 {
              margin: 0 0 8px;
              font-size: 16px;
              color: #142337;
            }
            .summary-table td:first-child {
              font-weight: 800;
            }
            .observations {
              margin: 0;
              padding-left: 18px;
              color: #1f2937;
              font-size: 12px;
              line-height: 1.65;
            }
            .commitment {
              display: grid;
              place-items: center;
              text-align: center;
              gap: 8px;
            }
            .commitment strong {
              color: #142337;
              font-size: 18px;
              text-transform: uppercase;
            }
            .commitment span {
              color: #4f9729;
              font-weight: 950;
            }
          </style>
        </head>
        <body>
          <main class="report">
            <section class="hero">
              <div>
                <h1>${escaparHtml(tituloReporte)}</h1>
                <p>Entrada 08:00 AM | Tolerancia 10 minutos | Periodo: ${escaparHtml(fechaInicio)} al ${escaparHtml(fechaFin)} | ${escaparHtml(contextoReporte)}</p>
              </div>
              <div class="brand-print">ROCEEL<span>SERVICIOS ESPECIALIZADOS</span></div>
            </section>

            ${
              detallePersona
                ? `
                  <section class="person-strip">
                    <div class="person-card">
                      <small>Empleado</small>
                      <strong>${escaparHtml(detallePersona.nombre)}</strong>
                      <span>${escaparHtml(detallePersona.email)}</span>
                    </div>
                    <div class="person-card">
                      <small>ID usuario</small>
                      <strong>${escaparHtml(detallePersona.id)}</strong>
                    </div>
                    <div class="person-card">
                      <small>Departamento</small>
                      <strong>${escaparHtml(detallePersona.departamento)}</strong>
                    </div>
                    <div class="person-card">
                      <small>Rol</small>
                      <strong>${escaparHtml(detallePersona.rol)}</strong>
                    </div>
                    <div class="person-card">
                      <small>Periodo</small>
                      <strong>${escaparHtml(fechaInicio)} al ${escaparHtml(fechaFin)}</strong>
                    </div>
                  </section>
                `
                : ""
            }

            ${
              mostrarMetricasHoras
                ? `
                  <section class="hours-strip">
                    <div class="hours-card worked">
                      <small>Horas trabajadas</small>
                      <strong>${escaparHtml(convertirHoras(metricasPeriodo.minutosTrabajados))}</strong>
                      <span>Tiempo completo registrado</span>
                    </div>
                    <div class="hours-card">
                      <small>Horas esperadas</small>
                      <strong>${escaparHtml(convertirHoras(metricasPeriodo.minutosEsperados))}</strong>
                      <span>${metricasPeriodo.diasEvaluados} dias x 9 h</span>
                    </div>
                    <div class="hours-card extra">
                      <small>Horas extra</small>
                      <strong>${escaparHtml(convertirHoras(metricasPeriodo.minutosExtra))}</strong>
                      <span>Tiempo sobre jornada</span>
                    </div>
                    <div class="hours-card lost">
                      <small>Horas perdidas</small>
                      <strong>${escaparHtml(convertirHoras(metricasPeriodo.minutosPerdidos))}</strong>
                      <span>Contra horas esperadas</span>
                    </div>
                  </section>
                `
                : ""
            }

            <section class="top-grid">
              <div class="metric-card">
                <small>Total de dias evaluados</small>
                <strong>${total}</strong>
                <span>${escaparHtml(contextoReporte)}</span>
              </div>
              <div class="metric-card green">
                <small>Puntual destacado</small>
                <strong>${grupos.destacados.length}</strong>
                <span>${destacadosPct}% antes de 07:30</span>
              </div>
              <div class="metric-card blue">
                <small>Dentro de tolerancia</small>
                <strong>${grupos.tolerancia.length}</strong>
                <span>${toleranciaPct}% de 07:30 a 08:10</span>
              </div>
              <div class="metric-card orange">
                <small>Retardo real</small>
                <strong>${grupos.retardos.length}</strong>
                <span>${retardosPct}% despues de 08:10</span>
              </div>
              <div class="metric-card red">
                <small>Sin entrada</small>
                <strong>${grupos.sinEntrada.length}</strong>
                <span>${sinEntradaPct}% sin chequeo</span>
              </div>
            </section>

            <section class="middle-grid">
              <div class="panel">
                <h2>Distribucion por categoria</h2>
                <div class="distribution">
                  <div class="donut"></div>
                  <div class="legend-list">
                    <div class="legend-row"><span class="dot" style="background:#6fbf38"></span><b>Puntual destacado</b><span>${grupos.destacados.length} | ${destacadosPct}%</span></div>
                    <div class="legend-row"><span class="dot" style="background:#0871ce"></span><b>Dentro de tolerancia</b><span>${grupos.tolerancia.length} | ${toleranciaPct}%</span></div>
                    <div class="legend-row"><span class="dot" style="background:#ff7a00"></span><b>Retardo real</b><span>${grupos.retardos.length} | ${retardosPct}%</span></div>
                    <div class="legend-row"><span class="dot" style="background:#d54a45"></span><b>Sin entrada</b><span>${grupos.sinEntrada.length} | ${sinEntradaPct}%</span></div>
                  </div>
                </div>
              </div>

              <div class="panel">
                <h2>Distribucion de entradas en linea de tiempo</h2>
                <div class="timeline">
                  <div class="time-marks">
                    <span>Antes de 07:30</span>
                    <span>08:00 horario</span>
                    <span class="limit">08:10 limite</span>
                    <span>Despues de 08:10</span>
                  </div>
                  <div class="timeline-bars">${crearBarrasTiempo(empleados)}</div>
                </div>
              </div>
            </section>

            <section class="category-grid">
              <div class="panel table-panel green">
                <h3>Puntual destacado</h3>
                <table>
                  <thead><tr><th>#</th><th>Fecha</th><th>Nombre</th><th>Departamento</th><th>Entrada</th></tr></thead>
                  <tbody>${crearFilasReporte(grupos.destacados)}</tbody>
                </table>
              </div>
              <div class="panel table-panel blue">
                <h3>Dentro de tolerancia</h3>
                <table>
                  <thead><tr><th>#</th><th>Fecha</th><th>Nombre</th><th>Departamento</th><th>Entrada</th></tr></thead>
                  <tbody>${crearFilasReporte(grupos.tolerancia)}</tbody>
                </table>
              </div>
              <div class="panel table-panel orange">
                <h3>Retardo real</h3>
                <table>
                  <thead><tr><th>#</th><th>Fecha</th><th>Nombre</th><th>Departamento</th><th>Entrada</th></tr></thead>
                  <tbody>${crearFilasReporte(grupos.retardos)}</tbody>
                </table>
              </div>
              <div class="panel table-panel red">
                <h3>Sin entrada</h3>
                <table>
                  <thead><tr><th>#</th><th>Fecha</th><th>Nombre</th><th>Departamento</th><th>Entrada</th><th>Estado</th></tr></thead>
                  <tbody>${crearFilasReporte(grupos.sinEntrada, true)}</tbody>
                </table>
              </div>
            </section>

            <section class="bottom-grid">
              <div class="white-box">
                <h2>${escaparHtml(resumenTitulo)}</h2>
                <table class="summary-table">
                  <tbody>
                    <tr><td>Puntual destacado</td><td>${grupos.destacados.length}</td><td>${destacadosPct}%</td></tr>
                    <tr><td>Dentro de tolerancia</td><td>${grupos.tolerancia.length}</td><td>${toleranciaPct}%</td></tr>
                    <tr><td>Retardo real</td><td>${grupos.retardos.length}</td><td>${retardosPct}%</td></tr>
                    <tr><td>Sin entrada</td><td>${grupos.sinEntrada.length}</td><td>${sinEntradaPct}%</td></tr>
                    ${
                      mostrarMetricasHoras
                        ? `
                          <tr><td>Horas trabajadas</td><td>${escaparHtml(convertirHoras(metricasPeriodo.minutosTrabajados))}</td><td></td></tr>
                          <tr><td>Horas esperadas</td><td>${escaparHtml(convertirHoras(metricasPeriodo.minutosEsperados))}</td><td></td></tr>
                          <tr><td>Horas extra</td><td>${escaparHtml(convertirHoras(metricasPeriodo.minutosExtra))}</td><td></td></tr>
                          <tr><td>Horas perdidas</td><td>${escaparHtml(convertirHoras(metricasPeriodo.minutosPerdidos))}</td><td></td></tr>
                        `
                        : ""
                    }
                    <tr><td>Total</td><td>${total}</td><td>100%</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="white-box">
                <h2>Observaciones</h2>
                <ul class="observations">
                  <li>Horario establecido de entrada: 08:00 AM.</li>
                  <li>La tolerancia termina a las 08:10 AM.</li>
                  <li>Puntual destacado considera entradas antes de 07:30 AM.</li>
                  <li>Retardo real considera entradas despues de 08:10 AM.</li>
                  <li>${escaparHtml(notaFiltro)}</li>
                </ul>
              </div>
              <div class="white-box commitment">
                <strong>Comprometidos con la puntualidad,<br><span>comprometidos con la excelencia.</span></strong>
                <p>Disciplina | Responsabilidad | Productividad | Resultados</p>
              </div>
            </section>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function exportarPDFGeneral() {
    imprimirReporteGeneral(resumenFiltrado);
  }

  function exportarPDFIndividual() {
    if (!selectedEmployee) {
      alert("Abre los detalles de un empleado para exportar individual.");
      return;
    }

    const registrosEmpleado = obtenerRegistrosIndividuales();

    imprimirReporteGeneral(
      registrosEmpleado,
      {
        titulo: "REPORTE INDIVIDUAL DE PUNTUALIDAD",
        contexto: `${selectedEmployee.nombre} ${selectedEmployee.apellido_paterno} | ${selectedEmployee.departamento}`,
        resumenTitulo: "Resumen individual",
        notaFiltro: "El reporte individual considera todos los dias del empleado dentro del periodo seleccionado.",
        mostrarMetricasHoras: true,
        detallePersona: {
          id: selectedEmployee.id_usuario,
          nombre: `${selectedEmployee.nombre} ${selectedEmployee.apellido_paterno} ${
            selectedEmployee.apellido_materno || ""
          }`,
          email: selectedEmployee.email,
          departamento: selectedEmployee.departamento,
          rol: selectedEmployee.rol || "Sin rol",
        },
      }
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="sidebar-wordmark">ROCEEL</div>
          </div>

          <nav className="side-menu">
            <Link className={!isGestion ? "active" : ""} to="/admin/dashboard">
              <span>#</span>
              Dashboard
            </Link>

            <Link className={isGestion ? "active" : ""} to="/admin/gestion">
              <span>*</span>
              Gestion
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
            <h3>Admin</h3>
            <p>Administrador</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1>{isGestion ? "Gestion de asistencia" : "Panel de Asistencia"}</h1>
          <p>
            {isGestion
              ? `Tabla/export del ${fechaInicio || "--"} al ${fechaFin || "--"}.`
              : `Dashboard del dia actual: ${dashboardData.fechaActual || "--"}.`}
          </p>
        </header>

        {error && <div className="admin-login-error dashboard-error">{error}</div>}

        {!isGestion && <section className="stats-grid three-cards">
          <div className="stat-card">
            <div>
              <p>Empleados en planta</p>
              <h2>{loading ? "--" : dashboardData.metricas.empleadosEnPlanta}</h2>
              <span>Con registro el dia seleccionado</span>
            </div>
            <div className="stat-icon blue">IN</div>
          </div>

          <div className="stat-card">
            <div>
              <p>Retardos hoy</p>
              <h2 className="orange-text">
                {loading ? "--" : dashboardData.metricas.retardosHoy}
              </h2>
              <span>Entrada despues de 08:10</span>
            </div>
            <div className="stat-icon orange">!</div>
          </div>

          <div className="stat-card">
            <div>
              <p>Faltas hoy</p>
              <h2 className="green-text">{loading ? "--" : dashboardData.metricas.faltasHoy}</h2>
              <span>No han checado entrada</span>
            </div>
            <div className="stat-icon green">--</div>
          </div>
        </section>}

        {isGestion && <section className="filters-card">
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
              {dashboardData.departamentos.map((departamento) => (
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
            <label>Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(event) => {
                setFechaInicio(event.target.value);
                if (event.target.value > fechaFin) {
                  setFechaFin(event.target.value);
                }
              }}
            />
          </div>

          <div className="filter-group">
            <label>Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio}
              onChange={(event) => setFechaFin(event.target.value)}
            />
          </div>

          <div className="export-actions">
            <button type="button" onClick={exportarExcelGeneral}>
              Excel
            </button>
            <button type="button" onClick={exportarPDFGeneral}>
              PDF
            </button>
          </div>
        </section>}

        <section className="dashboard-stack">
          {isGestion && <div className="table-card">
            <div className="card-header">
              <div>
                <h2>Resumen en tiempo real</h2>
                <p>
                  {loading
                    ? "Cargando empleados..."
                    : `${resumenFiltrado.length} dias de asistencia encontrados. Pagina ${safeCurrentPage} de ${totalPages}.`}
                </p>
              </div>

              <span className="live-badge">
                <span></span>
                En vivo
              </span>
            </div>

            <div className="table-toolbar">
              <div className="filter-group search-group">
                <label>Buscar empleado</label>
                <input
                  type="search"
                  placeholder="Nombre o apellido"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="table-wrapper clean-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID Usuario</th>
                    <th>Fecha</th>
                    <th>Empleado</th>
                    <th>Departamento</th>
                    <th>Rostro</th>
                    <th>Detalles</th>
                  </tr>
                </thead>

                <tbody>
                  {resumenPaginado.map((empleado) => (
                    <Fragment key={empleado.rowKey}>
                      <tr>
                        <td>{empleado.id_usuario}</td>
                        <td>{empleado.fechaVista}</td>
                        <td>
                          <div className="employee-cell">
                            <div className="avatar">{empleado.iniciales || "?"}</div>
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
                            onClick={() => toggleDetalles(empleado.rowKey)}
                          >
                            {selectedRowKey === empleado.rowKey
                              ? "Ocultar"
                              : "Ver detalles"}
                          </button>
                        </td>
                      </tr>

                      {selectedRowKey === empleado.rowKey && (
                        <tr className="details-row">
                          <td colSpan="6">
                            <div className="details-panel">
                              <div>
                                <span>Fecha</span>
                                <strong>{empleado.fechaVista}</strong>
                              </div>
                              <div>
                                <span>Ultimo movimiento</span>
                                <strong>{formatearTipo(empleado.ultimo_tipo)}</strong>
                              </div>
                              <div>
                                <span>Ultima hora</span>
                                <strong>{empleado.ultimaHoraVista}</strong>
                              </div>
                              <div>
                                <span>Entrada</span>
                                <strong>{empleado.entradaVista}</strong>
                              </div>
                              <div>
                                <span>Salida</span>
                                <strong>{empleado.salidaVista}</strong>
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
                              <div className="detail-export-cell">
                                <span>Exportar individual</span>
                                <div className="detail-export-actions">
                                  <button
                                    type="button"
                                    onClick={exportarPDFIndividual}
                                    aria-label="Exportar PDF individual"
                                  >
                                    PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={exportarExcelIndividual}
                                    aria-label="Exportar Excel individual"
                                  >
                                    Excel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {!loading && resumenPaginado.length === 0 && (
                    <tr>
                      <td colSpan="6">No hay empleados para este filtro.</td>
                    </tr>
                  )}
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
          </div>}

          {!isGestion && <div className="chart-card full-chart-card">
            <div className="card-header">
              <div>
                <h2>Asistencia por departamento</h2>
                <p>Asistieron contra total del departamento</p>
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
                <button
                  type="button"
                  className={chartTab === "retardos" ? "active" : ""}
                  onClick={() => setChartTab("retardos")}
                >
                  Retardos
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
            ) : chartTab === "faltas" ? (
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

                    {!loading && faltasHoy.length === 0 && (
                      <tr>
                        <td colSpan="4">Todos los empleados checaron entrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="absences-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID Usuario</th>
                      <th>Empleado</th>
                      <th>Departamento</th>
                      <th>Entrada</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {retardosActual.map((empleado) => (
                      <tr key={empleado.id_usuario}>
                        <td>{empleado.id_usuario}</td>
                        <td>
                          {empleado.nombre} {empleado.apellido_paterno}
                        </td>
                        <td>{empleado.departamento}</td>
                        <td>{empleado.entradaVista}</td>
                        <td>
                          <span className="face-badge pending">Retardo</span>
                        </td>
                      </tr>
                    ))}

                    {!loading && retardosActual.length === 0 && (
                      <tr>
                        <td colSpan="5">No hay retardos registrados hoy.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
