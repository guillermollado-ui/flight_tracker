import { Worker, Job } from 'bullmq';
import redisConnection from '../shared/utils/redis';
import { getBrowser } from '../shared/utils/browser';

const flightWorker = new Worker(
  'flight-search',
  async (job: Job) => {
    console.log(`[WORKER] Infiltrado iniciando misión para Vuelo ID: ${job.id}`);
    
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Configuramos un User-Agent humano para despistar
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const url = `https://www.google.com/travel/flights?q=Flights%20to%20${job.data.destination}%20from%20${job.data.origin}%20on%202026-05-15`;
      
      console.log(`[WORKER] Navegando a: ${url}`);
      
      // Vamos a la web y esperamos a que cargue el contenido principal
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Hacemos una captura de pantalla para demostrar que hemos entrado
      // Se guardará en la raíz de tu proyecto como 'ultimo_vuelo.png'
      await page.screenshot({ path: 'ultimo_vuelo.png' });

      console.log(`[WORKER] ¡Misión cumplida! Captura guardada como ultimo_vuelo.png`);
      
      await browser.close();
      return { success: true, screenshot: 'ultimo_vuelo.png' };

    } catch (error) {
      console.error('[WORKER ERROR] Fallo en la navegación:', error);
      await browser.close();
      throw error;
    }
  },
  { connection: redisConnection }
);

export default flightWorker;