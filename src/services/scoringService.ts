import pool from '../shared/utils/db';

export const calculateDealScore = async (route: string, currentPrice: number) => {
  try {
    const result = await pool.query(
      'SELECT price FROM price_history WHERE route = $1 ORDER BY id DESC LIMIT 10',
      [route]
    );

    const prices = result.rows.map(row => parseFloat(row.price));

    if (prices.length < 3) {
      return { 
        isChollo: false, 
        dealScore: 1, 
        savings: 0, 
        volatility: 'Baja', 
        arbitrage: [] 
      };
    }

    // 1. CÁLCULO DE MEDIA PONDERADA (WMA)
    const [p1, p2, p3] = prices; 
    const mediaMovilPonderada = (p1 * 0.50) + (p2 * 0.30) + (p3 * 0.20);
    
    // Calculamos y redondeamos de inmediato para evitar errores de precisión
    const dealScore = Number((currentPrice / mediaMovilPonderada).toFixed(2));
    const savings = Number((mediaMovilPonderada - currentPrice).toFixed(2));

    // 2. CÁLCULO DE VOLATILIDAD (Análisis de riesgo financiero)
    const avg = prices.reduce((a, b) => a + b) / prices.length;
    const squareDiffs = prices.map(p => Math.pow(p - avg, 2));
    const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b) / prices.length);
    const volatility = stdDev > (avg * 0.15) ? 'Alta 🔥' : 'Estable ❄️';

    // 3. SIMULACIÓN DE ARBITRAJE GEOGRÁFICO
    // Mantenemos la lógica de moneda pero aseguramos decimales limpios
    const arbitrage = [
      { country: 'España', price: currentPrice, currency: 'EUR' },
      { country: 'Polonia', price: Number((currentPrice * 0.88).toFixed(2)), currency: 'PLN' },
      { country: 'Turquía', price: Number((currentPrice * 0.82).toFixed(2)), currency: 'TRY' }
    ];

    // La decisión del chollo se basa ahora en los números limpios que verá el usuario
    const isChollo = dealScore < 0.65 && savings > 50;

    return { 
      isChollo, 
      dealScore, 
      savings, 
      volatility, 
      arbitrage 
    };

  } catch (error) {
    console.error('[SCORING ERROR]:', error);
    return { 
      isChollo: false, 
      dealScore: 1, 
      savings: 0, 
      volatility: 'Baja', 
      arbitrage: [] 
    };
  }
};