import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

 Cargamos variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT  3000;

 Middlewares
app.use(cors());
app.use(express.json());

 Endpoint de prueba (Healthcheck)
app.get('', (req Request, res Response) = {
  res.status(200).json({
    status 'online',
    message 'Radar de Ineficiencias Aéreas operando.',
    timestamp new Date().toISOString()
  });
});

 Inicialización del servidor
app.listen(PORT, () = {
  console.log(`[SERVER] Motor encendido en el puerto ${PORT}`);
  console.log(`[SERVER] Entorno ${process.env.NODE_ENV  'development'}`);
});