import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render requiere conexión segura (SSL) al conectarnos desde nuestro ordenador
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;