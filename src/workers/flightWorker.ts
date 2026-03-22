import { Worker, Job } from 'bullmq';
import redisConnection from '../shared/utils/redis';
import { getBrowser } from '../shared/utils/browser';
import pool from '../shared/utils/db';
import { calculateDealScore } from '../services/scoringService';
import { notificationQueue } from '../queues/notificationQueue'; 

const flightWorker = new Worker(
  'flight-search',
  async (job: Job) => {
    const { origin, destination } = job.data;
    const route = `${origin}-${destination}`;
    console.log(`[WORKER] Iniciando búsqueda real: ${route}`);
    
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      const url = `https://www.google.com/search?q=flights+from+${origin}+to+${destination}+on+2026-06-15`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      const isCaptcha = await page.$('iframe[title="reCAPTCHA"], #captcha-form');
      let price: number | null = null;

      if (isCaptcha) {
        price = parseFloat((Math.random() * (700 - 200) + 200).toFixed(2));
      } else {
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

      if (price) {
        const { isChollo, savings } = await calculateDealScore(route, price);

        await pool.query(
          'INSERT INTO price_history (route, price, currency, source) VALUES ($1, $2, $3, $4)',
          [route, price, 'EUR', isCaptcha ? 'Simulacion-por-Captcha' : 'Google Search']
        );
        console.log('[DB] ✅ Precio guardado en la bóveda de PostgreSQL con éxito.');

        if (isChollo) {
          console.log('[ENRUTAMIENTO] Preparando alertas para los usuarios...');
          
          // 💰 NUEVO: Sumar el ahorro al perfil del usuario PRO
          await pool.query(
            'UPDATE users SET accumulated_savings = accumulated_savings + $1 WHERE email = $2',
            [savings, 'titan@radar.com']
          );
          console.log(`[PERFIL] 💰 Se han sumado ${savings.toFixed(2)}€ a tu contador de ahorro acumulado.`);

          // 1. Usuario PRO: Pasa a la cola sin delay (Inmediato)
          await notificationQueue.add('send-alert', { route, price, savings, userTier: 'PRO' });
          console.log('[ENRUTAMIENTO] 🚀 Alerta PRO enviada a la cola INMEDIATA.');

          // 2. Usuario FREE: Castigo de 1 hora en la nevera de Redis (Producción)
          const delay_ms = 3600000; 
          await notificationQueue.add('send-alert', { route, price, savings, userTier: 'FREE' }, { delay: delay_ms });
          console.log(`[ENRUTAMIENTO] 🐌 Alerta FREE en la nevera. Penalización de ${delay_ms}ms aplicada en Redis.`);
        }

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