import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'quantum_health_chain',
  user: 'postgres', password: 'Abhi@2504'
});

const doctors = await pool.query(
  `SELECT id, name, hospital_id, specialization, consultation_fee 
   FROM users WHERE role='doctor'`
);
console.log('Doctors in DB:');
doctors.rows.forEach(r => console.log(JSON.stringify(r)));

const hospitals = await pool.query(
  `SELECT id, name FROM users WHERE role='hospital'`
);
console.log('\nHospitals in DB:');
hospitals.rows.forEach(r => console.log(JSON.stringify(r)));

pool.end();
