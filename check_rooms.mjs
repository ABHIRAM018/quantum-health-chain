import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'quantum_health_chain',
  user: 'postgres', password: 'Abhi@2504'
});

console.log('=== Hospital Rooms ===');
const rooms = await pool.query('SELECT * FROM hospital_rooms LIMIT 5');
console.log('Count:', rooms.rows.length);
if (rooms.rows.length > 0) {
  console.log('Sample row:', JSON.stringify(rooms.rows[0], null, 2));
} else {
  console.log('NO ROOMS IN DATABASE!');
}

console.log('\n=== Hospital Services ===');
const svcs = await pool.query('SELECT * FROM hospital_services LIMIT 5');
console.log('Count:', svcs.rows.length);
if (svcs.rows.length > 0) {
  console.log('Sample row:', JSON.stringify(svcs.rows[0], null, 2));
} else {
  console.log('NO SERVICES IN DATABASE!');
}

console.log('\n=== Users (hospital role) ===');
const h = await pool.query("SELECT id, name FROM users WHERE role='hospital'");
h.rows.forEach(r => console.log(r.id, '-', r.name));

pool.end();
