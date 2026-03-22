import pool from '../shared/utils/db';

export const calculateDealScore = async (route: string, currentPrice: number) => {
  try {
    // Buscamos los últimos 3 precios de esta ruta en la bóveda, ordenados por ID descendente
    const result = await pool.query(
      'SELECT price FROM price_history WHERE route = $1 ORDER BY id DESC LIMIT 3',
      [route]
    );

    const prices = result.rows.map(row => parseFloat(row.price));

    // Si la base de datos es muy nueva y no tenemos al menos 3 precios históricos, no podemos hacer la media
    if (prices.length < 3) {
      console.log(`[SCORING] 📊 Recopilando historial para ${route} (tenemos ${prices.length}/3 datos).`);
      return { isChollo: false, dealScore: 1, savings: 0 };
    }

    // p1 es el precio anterior más reciente, p2 el intermedio, p3 el más antiguo de la muestra
    const [p1, p2, p3] = prices; 
    
    // Aplicamos tu fórmula matemática exacta: Media Móvil Ponderada (50/30/20)
    const mediaMovilPonderada = (p1 * 0.50) + (p2 * 0.30) + (p3 * 0.20);
    
    // Calculamos el Deal Score y el ahorro real
    const dealScore = currentPrice / mediaMovilPonderada;
    const savings = mediaMovilPonderada - currentPrice;

    // Tu regla de oro: Score < 0.65 Y Ahorro > 50€
    const isChollo = dealScore < 0.65 && savings > 50;

    console.log(`[SCORING] 🧮 Análisis de la ruta ${route}:`);
    console.log(`   - Precio detectado ahora: ${currentPrice}€`);
    console.log(`   - Media histórica (WMA): ${mediaMovilPonderada.toFixed(2)}€`);
    console.log(`   - Deal Score: ${dealScore.toFixed(2)}`);
    console.log(`   - Ahorro potencial: ${savings.toFixed(2)}€`);
    
    if (isChollo) {
      console.log(`[SCORING] 🔥 ¡ALERTA DE CHOLLO DETECTADA! 🔥`);
    } else {
      console.log(`[SCORING] ⚖️ Precio dentro de los parámetros normales.`);
    }

    return { isChollo, dealScore, savings };

  } catch (error) {
    console.error('[SCORING ERROR] Fallo al calcular el algoritmo:', error);
    return { isChollo: false, dealScore: 1, savings: 0 };
  }
};