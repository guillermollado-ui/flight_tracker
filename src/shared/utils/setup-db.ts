import pool from './db';

const createTablesQuery = `
  -- 1. Tabla de Usuarios (Nuestra base de clientes y métrica de retención)
  CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      tier VARCHAR(50) DEFAULT 'free',
      accumulated_savings DECIMAL(10, 2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. Tabla de Configuración de Alertas (El radar personalizado)
  CREATE TABLE IF NOT EXISTS alerts_config (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      origin VARCHAR(10) NOT NULL,
      destination VARCHAR(50) NOT NULL,
      target_price DECIMAL(10, 2) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- 3. Tabla de Historial de Precios (Nuestra mina de oro de datos)
  CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      route VARCHAR(20) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'EUR',
      source VARCHAR(50),
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

async function setupDatabase() {
  try {
    console.log('[DB SETUP] Conectando con Render para construir la memoria...');
    const client = await pool.connect();
    
    await client.query(createTablesQuery);
    client.release();
    
    console.log('[DB SETUP] ¡Éxito! Las tablas (users, alerts_config, price_history) han sido creadas.');
    process.exit(0);
  } catch (error) {
    console.error('[DB SETUP ERROR] Fallo en la construcción:', error);
    process.exit(1);
  }
}

// Ejecutamos la función
setupDatabase();