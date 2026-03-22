import { Worker, Job } from 'bullmq';
import redisConnection from '../shared/utils/redis';

// Este es el "cerebro" que procesará cada vuelo
const flightWorker = new Worker(
  'flight-search', // Debe ser el mismo nombre que la Queue
  async (job: Job) => {
    console.log(`[WORKER] Infiltrado trabajando en el Vuelo ID: ${job.id}`);
    console.log(`[WORKER] Datos recibidos:`, job.data);

    // Aquí es donde en el futuro irá el Scraper real.
    // De momento, simulamos una búsqueda de 3 segundos.
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(`[WORKER] ¡Misión cumplida! Vuelo ${job.data.origin} -> ${job.data.destination} procesado.`);
    
    return { success: true, saved: 150.50 }; // Simulamos un ahorro
  },
  { connection: redisConnection }
);

flightWorker.on('completed', (job) => {
  console.log(`[WORKER] Trabajo ${job.id} finalizado con éxito.`);
});

flightWorker.on('failed', (job, err) => {
  console.error(`[WORKER ERROR] El trabajo ${job?.id} ha fallado:`, err);
});

export default flightWorker;