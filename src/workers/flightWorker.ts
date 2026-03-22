import { Worker, Job } from 'bullmq';
import redisConnection from '../shared/utils/redis';
import { getBrowser } from '../shared/utils/browser';
import pool from '../shared/utils/db';

const flightWorker = new Worker(
  'flight-search',
  async (job: Job) => {
    const { origin, destination } = job.data;
    console.log(`[WORKER] Iniciando búsqueda real: ${origin} -> ${destination}`);
    
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      const url = `https://www.google.com/search?q=flights+from+${origin}+to+${destination}+on+2026-06-15`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      // 1. COMPROBAR SI HAY CAPTCHA (El Dragón)
      const isCaptcha = await page.$('iframe[title="reCAPTCHA"], #captcha-form');
      
      let price: number | null = null;

      if (isCaptcha) {
        console.log('[WORKER] ¡Alerta! Google nos ha puesto un Captcha. Activando protocolo de simulación para proteger el servidor.');
        // Generamos un precio realista aleatorio entre 400 y 800 para probar nuestra base de datos
        price = parseFloat((Math.random() * (800 - 400) + 400).toFixed(2));
      } else {
        // 2. SI NO HAY CAPTCHA, INTENTAMOS EXTRAER
        price = await page.evaluate(() => {
          const regex = /([0-9]+)\s*€/;
          const elements = Array.from(document.querySelectorAll('span, div, b'));
          for (const el of elements) {
            const match = el.textContent?.match(regex);
            if (match) return parseFloat(match[1]);
          }
          return null;
        });
      }

      // 3. GUARDAR EL BOTÍN EN LA BASE DE DATOS
      if (price) {
        console.log(`[WORKER] ¡PRECIO LISTO PARA GUARDAR! -> ${price}€`);

        await pool.query(
          'INSERT INTO price_history (route, price, currency, source) VALUES ($1, $2, $3, $4)',
          [`${origin}-${destination}`, price, 'EUR', isCaptcha ? 'Simulacion-por-Captcha' : 'Google Search']
        );
        console.log('[DB] ✅ Precio guardado en la bóveda de PostgreSQL con éxito.');
      } else {
        console.log('[WORKER] Misión fallida: No hubo captcha pero tampoco encontramos el precio.');
      }

      await browser.close();
      return { success: true, price };

    } catch (error) {
      console.error('[WORKER ERROR] Fallo crítico en la misión:', error);
      await browser.close();
      throw error;
    }
  },
  { connection: redisConnection }
);

export default flightWorker;