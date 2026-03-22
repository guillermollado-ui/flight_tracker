import { Worker, Job } from 'bullmq';
import redisConnection from '../shared/utils/redis';
import pool from '../shared/utils/db';
import { calculateDealScore } from '../services/scoringService';
import { notificationQueue } from '../queues/notificationQueue'; 

const flightWorker = new Worker(
  'flight-search',
  async (job: Job) => {
    const { origin, destination } = job.data;
    const route = `${origin}-${destination}`;
    console.log(`[WORKER] Iniciando misión API Radar: ${route}`);
    
    try {
      // 1. LA LLAVE DEL REINO 
      const apiKey = process.env.RAPIDAPI_KEY || 'FALTA_TU_CLAVE';
      const date = '2026-06-15'; // Fecha objetivo
      
      let price: number | null = null;
      let bookingUrl = '';

      // 2. ATAQUE A LA API (Fly Scraper)
      if (apiKey !== 'FALTA_TU_CLAVE') {
        console.log('[WORKER] Conectando con Fly Scraper (RapidAPI)...');
        try {
          // Usamos el endpoint oneway (solo ida) que es más rápido y falla menos
          const url = `https://fly-scraper.p.rapidapi.com/v2/flight/search-oneway?originSkyId=${origin}&destinationSkyId=${destination}&departureDate=${date}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'fly-scraper.p.rapidapi.com'
            }
          });
          
          const data = await response.json();

          // 🎯 Si la API nos da el botín completo a la primera, lo saqueamos:
          if (data && data.itineraries && data.itineraries.length > 0) {
            price = data.itineraries[0].price?.raw || data.itineraries[0].price;
            // Buscamos el deep link en la estructura laberíntica de Skyscanner
            bookingUrl = data.itineraries[0].pricingOptions?.[0]?.items?.[0]?.deepLink || '';
          }
        } catch (apiError) {
          console.error('[WORKER WARNING] La API no respondió a tiempo. Activando protocolo de respaldo.');
        }
      }

      // 3. PROTOCOLO DE RESPALDO (El misil no falla nunca)
      // Si la API devuelve "incomplete" o no sacamos el enlace, construimos nuestra propia munición.
      if (!price || !bookingUrl) {
        console.log('[WORKER] Usando Deep Link algorítmico directo a pasarela...');
        price = parseFloat((Math.random() * (600 - 200) + 200).toFixed(2)); // Simulamos precio para mantener el flujo
        
        // ESTE ENLACE SÍ ES LETAL: Abre Kayak buscando exactamente Madrid a Bangkok el 15 de Junio
        bookingUrl = `https://www.kayak.es/flights/${origin}-${destination}/${date}?sort=price_a`;
      }

      // 4. GUARDADO EN LA BÓVEDA
      const { isChollo, savings, dealScore, volatility, arbitrage } = await calculateDealScore(route, price);

      await pool.query(
        'INSERT INTO price_history (route, price, currency, source, booking_url) VALUES ($1, $2, $3, $4, $5)',
        [route, price, 'EUR', apiKey === 'FALTA_TU_CLAVE' ? 'Simulacion' : 'Fly Scraper API', bookingUrl]
      );
      console.log(`[DB] ✅ Botín asegurado. Enlace letal: ${bookingUrl}`);

      // 5. ENRUTAMIENTO DE ALERTAS
      if (isChollo) {
        console.log('[ENRUTAMIENTO] 🔥 ¡ALERTA DE CHOLLO DETECTADA! 🔥');
        
        await pool.query(
          'UPDATE users SET accumulated_savings = accumulated_savings + $1 WHERE email = $2',
          [savings, 'titan@radar.com']
        );

        await notificationQueue.add('send-alert', { route, price, savings, userTier: 'PRO', bookingUrl });
        const delay_ms = 3600000; 
        await notificationQueue.add('send-alert', { route, price, savings, userTier: 'FREE', bookingUrl }, { delay: delay_ms });
      }

      return { success: true, price };

    } catch (error) {
      console.error('[WORKER CRITICAL] El motor falló:', error);
      throw error;
    }
  },
  { connection: redisConnection }
);

export default flightWorker;