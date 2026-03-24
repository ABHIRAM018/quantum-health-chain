import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'quantum_health_chain',
  user: 'postgres', password: 'Abhi@2504'
});

// Check hospitals
const hospitals = await pool.query("SELECT id, name FROM users WHERE role='hospital'");
console.log('Hospitals:');
hospitals.rows.forEach(r => console.log(' ', r.id, '-', r.name));

// Check doctors and their hospital_id
const doctors = await pool.query("SELECT id, name, hospital_id FROM users WHERE role='doctor'");
console.log('\nDoctors:');
doctors.rows.forEach(r => console.log(' ', r.id, '-', r.name, '-> hospital_id:', r.hospital_id));

// Fix: link doctors to the hospital
if (hospitals.rows.length > 0 && doctors.rows.length > 0) {
  const hospitalId = hospitals.rows[0].id;
  await pool.query("UPDATE users SET hospital_id = $1 WHERE role='doctor'", [hospitalId]);
  console.log('\nFixed! Linked all doctors to hospital:', hospitalId);
}

pool.end();
