import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './shared/utils/db';
import redisConnection from './shared/utils/redis';
import { flightQueue } from './queues/flightQueue';
import './workers/flightWorker'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'online', message: 'Radar de Ineficiencias Aéreas operando.' });
});

app.get('/test-job', async (req: Request, res: Response) => {
  try {
    const job = await flightQueue.add('search-flight', {
      origin: 'MAD',
      destination: 'BKK',
      maxPrice: 600
    });

    res.status(200).json({
      status: 'job_added',
      jobId: job.id,
      message: 'Vuelo Madrid -> Bangkok añadido a la cola del Infiltrador.'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'No se pudo añadir el trabajo.' });
  }
});

// NUEVO: La mirilla a nuestra bóveda de PostgreSQL arreglada
app.get('/api/prices', async (req: Request, res: Response) => {
  try {
    // Le pedimos absolutamente todo a la tabla sin filtros que la confundan
    const result = await pool.query('SELECT * FROM price_history');
    res.status(200).json({
      status: 'success',
      total_encontrados: result.rowCount,
      botin: result.rows
    });
  } catch (error) {
    console.error('[DB ERROR] Error al abrir la bóveda:', error);
    res.status(500).json({ status: 'error', message: 'No se pudo acceder a los datos.' });
  }
});

app.get('/health/db', async (req: Request, res: Response) => {
  const client = await pool.connect();
  const result = await client.query('SELECT NOW()');
  client.release();
  res.status(200).json({ status: 'database_connected', time: result.rows[0].now });
});

app.get('/health/redis', async (req: Request, res: Response) => {
  await redisConnection.ping();
  res.status(200).json({ status: 'redis_connected' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Motor encendido en el puerto ${PORT}`);
});