const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quantum_health_chain',
  user: 'postgres',
  password: 'Abhi@2504'
});

async function run() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash:', hash);

  await pool.query(
    'UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL',
    [hash]
  );
  console.log('All passwords updated successfully!');

  // Verify
  const r = await pool.query('SELECT email, password_hash FROM users');
  for (const row of r.rows) {
    const match = await bcrypt.compare('password123', row.password_hash);
    console.log(row.email, '->', match ? 'OK' : 'FAILED');
  }

  pool.end();
}

run().catch(console.error);