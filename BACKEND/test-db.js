const { Pool } = require('pg');

const pool = new Pool({
    user: 'user1_abd',
    host: 'localhost',
    database: 'Hack',
    password: '123',
    port: 5432,
});

async function test() {
    try {
        const res = await pool.query('SELECT id, nombre FROM empleados');
        console.log("Empleados registrados:", res.rows);
    } catch(e) {
        console.error("Connection error:", e.message);
    } finally {
        pool.end();
    }
}
test();
