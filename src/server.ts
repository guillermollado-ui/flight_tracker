import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './shared/utils/db.js';
import redisConnection from './shared/utils/redis.js';
import { flightQueue } from './queues/flightQueue.js';
import './workers/flightWorker.js'; 
import './workers/notificationWorker.js'; 
import { startCronJobs } from './cron/flightCron.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'online', message: 'Radar de Ineficiencias Aéreas operando.' });
});

// RUTA DE EXPANSIÓN: Construye las nuevas tablas en la bóveda
app.get('/api/setup-db', async (req: Request, res: Response) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tier VARCHAR(50) DEFAULT 'FREE',
        accumulated_savings NUMERIC(10, 2) DEFAULT 0.00
      );

      CREATE TABLE IF NOT EXISTS user_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        target_price NUMERIC(10, 2) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      INSERT INTO users (email, tier) 
      VALUES ('titan@radar.com', 'PRO') 
      ON CONFLICT (email) DO NOTHING;
    `);

    res.status(200).json({ status: 'success', message: 'Bóveda expandida: Tablas de usuarios y alertas creadas.' });
  } catch (error) {
    console.error('[DB ERROR] Error al expandir la bóveda:', error);
    res.status(500).json({ status: 'error', message: 'No se pudo crear la estructura.' });
  }
});

app.get('/api/radar', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM price_history ORDER BY id DESC LIMIT 20');
    
    // Procesamos cada precio del historial para añadirle el Score y Volatilidad en tiempo real
    const radarCompleto = await Promise.all(result.rows.map(async (item) => {
      const metrics = await calculateDealScore(item.route, parseFloat(item.price));
      return { ...item, ...metrics };
    }));

    res.status(200).json({ status: 'success', radar: radarCompleto });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al cargar el Radar de élite.' });
  }
});

// 📱 ENDPOINT: Mis Alertas
app.get('/api/alerts/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM user_alerts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.status(200).json({ status: 'success', alertas: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener alertas.' });
  }
});

// 📱 ENDPOINT: Crear Nueva Alerta
app.post('/api/alerts', async (req: Request, res: Response) => {
  try {
    const { userId, origin, destination, targetPrice } = req.body;
    const result = await pool.query(
      'INSERT INTO user_alerts (user_id, origin, destination, target_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, origin, destination, targetPrice]
    );
    res.status(201).json({ status: 'success', message: 'Alerta activada', alerta: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear la alerta.' });
  }
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

app.get('/api/prices', async (req: Request, res: Response) => {
  try {
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
  startCronJobs(); 
});