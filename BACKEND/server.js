const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentado por los descriptores faciales

// === CONFIGURACIÓN DE BASE DE DATOS ===
// Recuerda cambiar estos datos por los de tu servidor local de PostgreSQL
const pool = new Pool({
    user: 'user1_abd',
    host: 'localhost',
    database: 'Hack', // Cambia por el nombre de tu bd
    password: '123',     // Cambia por tu contraseña
    port: 5432,
});

// === RUTAS ===

// Obtener todos los empleados (Para cargar los modelos en el kiosko)
app.get('/api/empleados', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM empleados');
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener empleados:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Registrar un nuevo empleado
app.post('/api/empleados', async (req, res) => {
    const { nombre, departamento, descriptores_faciales } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO empleados (nombre, departamento, descriptores_faciales) VALUES ($1, $2, $3) RETURNING *',
            [nombre, departamento, descriptores_faciales]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error al registrar empleado:", err);
        res.status(500).json({ error: 'Error al guardar el empleado' });
    }
});

// Registrar asistencia
app.post('/api/asistencia', async (req, res) => {
    const { empleadoId } = req.body;

    // Aquí puedes agregar la lógica para determinar si es ENTRADA o SALIDA.
    // Por simplicidad, pondremos 'ENTRADA' o puedes consultar el último movimiento.
    const tipoMovimiento = 'ENTRADA';

    try {
        const result = await pool.query(
            'INSERT INTO asistencia (empleado_id, tipo_movimiento) VALUES ($1, $2) RETURNING *',
            [empleadoId, tipoMovimiento]
        );

        // Buscar el nombre del empleado para devolverlo al frontend
        const empResult = await pool.query('SELECT nombre FROM empleados WHERE id = $1', [empleadoId]);
        const nombreEmpleado = empResult.rows.length > 0 ? empResult.rows[0].nombre : 'Empleado';

        res.status(201).json({ status: 'success', data: result.rows[0], nombre: nombreEmpleado });
    } catch (err) {
        console.error("Error al registrar asistencia:", err);
        res.status(500).json({ status: 'error', message: 'Error al registrar la asistencia' });
    }
});

// === INICIAR SERVIDOR ===
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en el puerto ${PORT}`);
});
