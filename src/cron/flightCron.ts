import cron from 'node-cron';
import { flightQueue } from '../queues/flightQueue';
import pool from '../shared/utils/db'; // Importamos la conexión a la bóveda

export const startCronJobs = () => {
  console.log('[CRON] ⏱️ Reloj interno activado. Vigilando los tiempos...');

  cron.schedule('0 */12 * * *', async () => {
    console.log('[CRON] 🔔 ¡Es la hora! Leyendo las estrategias de los usuarios...');
    try {
      // Buscamos todas las rutas únicas que los usuarios quieren vigilar
      const result = await pool.query('SELECT DISTINCT origin, destination FROM user_alerts WHERE active = true');
      const routes = result.rows;

      if (routes.length === 0) {
        console.log('[CRON] 📭 El radar está en silencio. No hay alertas activas en la bóveda.');
        return;
      }

      console.log(`[CRON] 🎯 Se encontraron ${routes.length} rutas activas. Desplegando Infiltrados...`);

      // Por cada ruta que los usuarios han pedido, mandamos una misión a la sala de espera
      for (const route of routes) {
        await flightQueue.add('search-flight', {
          origin: route.origin,
          destination: route.destination
        });
        console.log(`[CRON] ✅ Misión programada en la sala de espera: ${route.origin} -> ${route.destination}`);
      }

    } catch (error) {
      console.error('[CRON ERROR] Fallo al programar las misiones dinámicas:', error);
    }
  });
};