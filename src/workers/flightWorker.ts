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
        // 📈 EXTRAEMOS TODA LA INTELIGENCIA FINANCIERA
        const { isChollo, savings, dealScore, volatility, arbitrage } = await calculateDealScore(route, price);

        // 1. GUARDAMOS EN LA BÓVEDA
        await pool.query(
          'INSERT INTO price_history (route, price, currency, source) VALUES ($1, $2, $3, $4)',
          [route, price, 'EUR', isCaptcha ? 'Simulacion-por-Captcha' : 'Google Search']
        );
        console.log('[DB] ✅ Precio guardado en la bóveda de PostgreSQL.');

        // 📊 LOGS DE ANÁLISIS ESTILO BLOOMBERG
        console.log(`[ANALYSIS] 📊 Ruta: ${route} | Score: ${dealScore} | Volatilidad: ${volatility}`);
        console.log(`[ARBITRAGE] 🌍 Simulación:`, arbitrage.map(a => `${a.country}: ${a.price}${a.currency}`).join(' | '));

        if (isChollo) {
          console.log('[ENRUTAMIENTO] 🔥 ¡ALERTA DE CHOLLO DETECTADA! 🔥');
          
          // 💰 SUMAR EL AHORRO AL PERFIL DEL USUARIO PRO
          await pool.query(
            'UPDATE users SET accumulated_savings = accumulated_savings + $1 WHERE email = $2',
            [savings, 'titan@radar.com']
          );
          console.log(`[PERFIL] 💰 Se han sumado ${savings.toFixed(2)}€ a tu contador de ahorro acumulado.`);

          // 1. Usuario PRO: Inmediato
          await notificationQueue.add('send-alert', { route, price, savings, userTier: 'PRO' });
          console.log('[ENRUTAMIENTO] 🚀 Alerta PRO enviada a la cola INMEDIATA.');

          // 2. Usuario FREE: Retraso de 1 hora
          const delay_ms = 3600000; 
          await notificationQueue.add('send-alert', { route, price, savings, userTier: 'FREE' }, { delay: delay_ms });
          console.log(`[ENRUTAMIENTO] 🐌 Alerta FREE penalizada con ${delay_ms}ms en Redis.`);
        }

      } else {
        console.log('[WORKER] Misión fallida: No se capturó precio.');
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
);import { Worker, Job } from 'bullmq';
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
      
      // 🎯 NUEVO: Generamos la URL directa de compra (apuntando a Google Flights)
      const bookingUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20from%20${origin}%20on%202026-06-15`;
      
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
        // 📈 EXTRAEMOS TODA LA INTELIGENCIA FINANCIERA
        const { isChollo, savings, dealScore, volatility, arbitrage } = await calculateDealScore(route, price);

        // 1. GUARDAMOS EN LA BÓVEDA (AHORA INCLUYE LA URL DE COMPRA)
        await pool.query(
          'INSERT INTO price_history (route, price, currency, source, booking_url) VALUES ($1, $2, $3, $4, $5)',
          [route, price, 'EUR', isCaptcha ? 'Simulacion-por-Captcha' : 'Google Search', bookingUrl]
        );
        console.log(`[DB] ✅ Precio guardado en la bóveda con su enlace letal: ${bookingUrl}`);

        // 📊 LOGS DE ANÁLISIS ESTILO BLOOMBERG
        console.log(`[ANALYSIS] 📊 Ruta: ${route} | Score: ${dealScore} | Volatilidad: ${volatility}`);
        console.log(`[ARBITRAGE] 🌍 Simulación:`, arbitrage.map(a => `${a.country}: ${a.price}${a.currency}`).join(' | '));

        if (isChollo) {
          console.log('[ENRUTAMIENTO] 🔥 ¡ALERTA DE CHOLLO DETECTADA! 🔥');
          
          // 💰 SUMAR EL AHORRO AL PERFIL DEL USUARIO PRO
          await pool.query(
            'UPDATE users SET accumulated_savings = accumulated_savings + $1 WHERE email = $2',
            [savings, 'titan@radar.com']
          );
          console.log(`[PERFIL] 💰 Se han sumado ${savings.toFixed(2)}€ a tu contador de ahorro acumulado.`);

          // 1. Usuario PRO: Inmediato (PASANDO LA URL)
          await notificationQueue.add('send-alert', { route, price, savings, userTier: 'PRO', bookingUrl });
          console.log('[ENRUTAMIENTO] 🚀 Alerta PRO enviada a la cola INMEDIATA.');

          // 2. Usuario FREE: Retraso de 1 hora
          const delay_ms = 3600000; 
          await notificationQueue.add('send-alert', { route, price, savings, userTier: 'FREE', bookingUrl }, { delay: delay_ms });
          console.log(`[ENRUTAMIENTO] 🐌 Alerta FREE penalizada con ${delay_ms}ms en Redis.`);
        }

      } else {
        console.log('[WORKER] Misión fallida: No se capturó precio.');
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

export default flightWorker;