import { pool } from "../db.js";

export const getUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Correo y contrasena son requeridos" });
        }

        const [result] = await pool.query(
            `
            SELECT
                id_usuario,
                nombre,
                apellido_paterno,
                apellido_materno,
                email,
                datos_faciales,
                id_departamento,
                id_rol
            FROM usuarios
            WHERE email = ?
              AND password = ?
            LIMIT 1
            `,
            [email, password]
        );

        if (result.length <= 0) {
            return res.status(401).json({ message: "Usuario o contrasena incorrectos" });
        }

        res.json({
            message: "Login correcto",
            usuario: result[0]
        });
    } catch (error) {
        console.log("ERROR REAL EN LOGIN:", error);
        res.status(500).json({ message: "Error de conexion" });
    }
};

const existeEmail = async (email) => {
    const [result] = await pool.query(
        "SELECT id_usuario FROM usuarios WHERE email = ?",
        [email]
    );

    return result.length > 0;
};

export const createUsuario = async (req, res) => {
    try {
        const {
            nombre,
            email,
            password,
            apellido_paterno,
            apellido_materno,
            id_departamento,
            id_rol
        } = req.body;

        if (!nombre || !email || !password || !apellido_paterno) {
            return res.status(400).json({ message: "Faltan datos requeridos" });
        }

        const emailExiste = await existeEmail(email);

        if (emailExiste) {
            return res.status(400).json({ message: "Ya existe el email" });
        }

        const [result] = await pool.query(
            `
            INSERT INTO usuarios (
                nombre,
                email,
                password,
                apellido_paterno,
                apellido_materno,
                id_departamento,
                id_rol
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                nombre,
                email,
                password,
                apellido_paterno,
                apellido_materno || null,
                id_departamento || null,
                id_rol || 2
            ]
        );

        res.status(201).json({ insertID: result.insertId });
    } catch (error) {
        console.log("Error en createUsuario:", error);
        res.status(500).json({ message: "Error al registrar el usuario" });
    }
};

export const getEmpleadosFaciales = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT
                u.id_usuario AS id,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.email,
                u.datos_faciales AS descriptores_faciales,
                u.id_departamento,
                u.id_rol,
                d.nombre_departamento AS departamento
            FROM usuarios u
            LEFT JOIN departamentos d ON u.id_departamento = d.id_departamento
        `);

        res.json(result);
    } catch (error) {
        console.log("Error en getEmpleadosFaciales:", error);
        res.status(500).json({ message: "Error al obtener empleados" });
    }
};

export const createEmpleadoFacial = async (req, res) => {
    try {
        const { nombre, departamento, descriptores_faciales } = req.body;

        if (!nombre || !descriptores_faciales) {
            return res.status(400).json({ message: "Nombre y datos faciales son requeridos" });
        }

        const partesNombre = nombre.trim().split(/\s+/);
        const primerNombre = partesNombre[0] || "Empleado";
        const apellidoPaterno = partesNombre[1] || "SinApellido";
        const apellidoMaterno = partesNombre.slice(2).join(" ") || null;

        let idDepartamento = null;

        if (departamento) {
            const [departamentos] = await pool.query(
                "SELECT id_departamento FROM departamentos WHERE nombre_departamento = ?",
                [departamento]
            );

            if (departamentos.length > 0) {
                idDepartamento = departamentos[0].id_departamento;
            }
        }

        const email = `empleado_${Date.now()}@roocel.local`;
        const password = "";
        const idRolEmpleado = 2;

        const [result] = await pool.query(
            `
            INSERT INTO usuarios (
                nombre,
                apellido_paterno,
                apellido_materno,
                email,
                password,
                datos_faciales,
                id_departamento,
                id_rol
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                primerNombre,
                apellidoPaterno,
                apellidoMaterno,
                email,
                password,
                descriptores_faciales,
                idDepartamento,
                idRolEmpleado
            ]
        );

        res.status(201).json({
            status: "success",
            id: result.insertId,
            nombre: primerNombre
        });
    } catch (error) {
        console.log("Error en createEmpleadoFacial:", error);
        res.status(500).json({ message: "Error al registrar empleado" });
    }
};

export const updateEmpleadoFacial = async (req, res) => {
    try {
        const { id } = req.params;
        const { descriptores_faciales } = req.body;

        if (!descriptores_faciales) {
            return res.status(400).json({ message: "Datos faciales son requeridos" });
        }

        const [result] = await pool.query(
            "UPDATE usuarios SET datos_faciales = ? WHERE id_usuario = ?",
            [descriptores_faciales, id]
        );

        if (result.affectedRows <= 0) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        res.json({ status: "success", message: "Rostro actualizado correctamente" });
    } catch (error) {
        console.log("Error en updateEmpleadoFacial:", error);
        res.status(500).json({ message: "Error al actualizar rostro" });
    }
};
