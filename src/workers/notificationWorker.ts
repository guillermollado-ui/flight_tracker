import { Worker, Job } from 'bullmq';
import redisConnection from '../shared/utils/redis';

const notificationWorker = new Worker(
  'notification-alerts',
  async (job: Job) => {
    const { route, price, savings, userTier } = job.data;
    
    console.log(`[NOTIFICACIÓN 📱] ¡Enviando push al móvil!`);
    console.log(`[NOTIFICACIÓN 📱] Ruta: ${route} | Precio: ${price}€ | Ahorro: ${savings.toFixed(2)}€`);
    
    // El repartidor ahora sabe exactamente qué mensaje imprimir
    if (userTier === 'PRO') {
      console.log(`[NOTIFICACIÓN 📱] Tipo de usuario: PRO (Entregado en tiempo real 🚀)`);
    } else {
      console.log(`[NOTIFICACIÓN 📱] Tipo de usuario: FREE (Entregado con 1 hora de retraso 🐌)`);
    }
    
    // Aquí en el futuro nos conectaremos con Firebase/Android para que suene el teléfono
    return { success: true };
  },
  { connection: redisConnection }
);

export default notificationWorker;