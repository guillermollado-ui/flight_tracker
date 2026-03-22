import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './shared/utils/db';
import redisConnection from './shared/utils/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    message: 'Radar de Ineficiencias Aéreas operando.',
    timestamp: new Date().toISOString()
  });
});

// Endpoint táctico para verificar la conexión a la base de datos
app.get('/health/db', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.status(200).json({
      status: 'database_connected',
      time: result.rows[0].now,
      message: 'Conexión a PostgreSQL en Render establecida con éxito.'
    });
  } catch (error) {
    console.error('[DB ERROR] Error conectando a la base de datos:', error);
    res.status(500).json({
      status: 'database_error',
      error: 'No se pudo conectar a PostgreSQL'
    });
  }
});

// Endpoint táctico para verificar la conexión a Redis (La Sala de Espera)
app.get('/health/redis', async (req: Request, res: Response) => {
  try {
    await redisConnection.ping();
    res.status(200).json({
      status: 'redis_connected',
      message: 'Conexión a Upstash (Redis) establecida con éxito. Sala de espera lista.'
    });
  } catch (error) {
    console.error('[REDIS ERROR] Error conectando a Redis:', error);
    res.status(500).json({
      status: 'redis_error',
      error: 'No se pudo conectar a Upstash'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Motor encendido en el puerto ${PORT}`);
  console.log(`[SERVER] Entorno: ${process.env.NODE_ENV || 'development'}`);
});