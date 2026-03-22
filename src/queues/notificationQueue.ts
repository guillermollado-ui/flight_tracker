import { Queue } from 'bullmq';
import redisConnection from '../shared/utils/redis';

// Esta es la sala de espera exclusiva para enviar los avisos a los móviles
export const notificationQueue = new Queue('notification-alerts', {
  connection: redisConnection
});

console.log('[QUEUE] Jefe de Notificaciones (notification-alerts) activado.');