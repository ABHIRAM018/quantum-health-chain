import pg from 'pg';
import jwt from 'jsonwebtoken';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'quantum_health_chain',
  user: 'postgres', password: 'Abhi@2504'
});

// Get hospital user
const { rows: [hospital] } = await pool.query("SELECT * FROM users WHERE role='hospital' LIMIT 1");
console.log('Hospital user id:', hospital.id);

// Create a valid JWT
const JWT_SECRET = 'change_this_to_a_long_random_secret_in_production';
const token = jwt.sign({ sub: hospital.id, email: hospital.email, role: hospital.role }, JWT_SECRET, { expiresIn: '1h' });
console.log('Token generated');

// Test the API
const res = await fetch(`http://localhost:4000/api/hospital/rooms?hospitalId=${hospital.id}`, {
  headers: { Authorization: `Bearer ${token}` }
});
console.log('Status:', res.status);
const data = await res.json();
console.log('Rooms returned:', data.length ?? data);
if (data.length > 0) console.log('First room:', JSON.stringify(data[0]));
else console.log('Response:', JSON.stringify(data));

pool.end();
