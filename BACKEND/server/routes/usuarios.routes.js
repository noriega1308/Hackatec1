import { Router } from "express";
import {
    createEmpleadoFacial,
    createUsuario,
    getEmpleadosFaciales,
    getUsuario,
    updateEmpleadoFacial
} from "../controllers/usuarios.controllers.js";


const router = Router();

router.post('/login',getUsuario);
router.post('/registro', createUsuario)
router.get('/api/empleados', getEmpleadosFaciales);
router.post('/api/empleados', createEmpleadoFacial);
router.put('/api/empleados/:id', updateEmpleadoFacial);


export default router;


