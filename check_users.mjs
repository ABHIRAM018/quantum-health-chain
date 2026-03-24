import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'quantum_health_chain',
  user:     process.env.DB_USER     || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
});

async function checkUsers() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT id, email, failed_login_attempts, locked_until FROM users');
    console.table(res.rows);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err.message);
    process.exit(1);
  }
}

checkUsers();
