import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// BullMQ exige maxRetriesPerRequest en null para funcionar de forma segura
const redisConnection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  tls: {
    rejectUnauthorized: false
  }
});

redisConnection.on('connect', () => {
  console.log('[REDIS] Conexión establecida con la sala de espera (Upstash).');
});

redisConnection.on('error', (error) => {
  console.error('[REDIS ERROR] Fallo en la conexión:', error);
});

export default redisConnection;