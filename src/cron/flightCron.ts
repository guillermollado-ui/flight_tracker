import cron from 'node-cron';
import { flightQueue } from '../queues/flightQueue';

// Configuramos el reloj: '* * * * *' significa "cada minuto"
// (Nota de tu arquitecta: Para que sea cada 12 horas, pondríamos '0 */12 * * *')
export const startCronJobs = () => {
  console.log('[CRON] ⏱️ Reloj interno activado. Vigilando los tiempos...');

  cron.schedule('0 */12 * * *', async () => {
    console.log('[CRON] 🔔 ¡Es la hora! Despertando al Infiltrado automáticamente...');
    try {
      // Inyectamos la misión en la sala de espera sin que tú toques nada
      await flightQueue.add('search-flight', {
        origin: 'MAD',
        destination: 'BKK',
        maxPrice: 600
      });
      console.log('[CRON] ✅ Misión automática programada con éxito.');
    } catch (error) {
      console.error('[CRON ERROR] Fallo al programar la misión:', error);
    }
  });
};