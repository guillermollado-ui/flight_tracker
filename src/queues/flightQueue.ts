import { Queue } from 'bullmq';
import redisConnection from '../shared/utils/redis';

// Definimos la cola de búsqueda de vuelos
export const flightQueue = new Queue('flight-search', {
  connection: redisConnection
});

console.log('[QUEUE] Jefe de sala de espera (flight-search) activado.');