import express from 'express';
import { PORT } from './config.js';
import usuarioRoutes from './routes/usuarios.routes.js';
import registrosRoutes from './routes/registros.routes.js'
import cors from 'cors'; // Importar CORS

const app = express();

// poder usar el postman y ver lo delo body
app.use(express.json());

app.use(cors());
app.get("/", (req, res) => {
  res.send("Backend ROCEEL funcionando");
});
app.use(usuarioRoutes);
app.use(registrosRoutes)


app.listen(PORT); //abre servidor en puerto 4000
console.log(`Server is listening  on port ${PORT}`);
