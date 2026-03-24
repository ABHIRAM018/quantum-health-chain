import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'quantum_health_chain',
  user: 'postgres', password: 'Abhi@2504'
});

console.log('Starting full fix...\n');

// Step 1: Add missing columns if they don't exist
const columns = [
  ['specialization',   'TEXT'],
  ['license_number',   'TEXT'],
  ['hospital_id',      'UUID'],
  ['experience',       'INTEGER DEFAULT 0'],
  ['consultation_fee', 'NUMERIC(10,2) DEFAULT 0'],
  ['date_of_birth',    'DATE'],
  ['emergency_contact','TEXT'],
  ['insurance_id',     'UUID'],
  ['bank_name',        'TEXT'],
  ['routing_number',   'TEXT'],
  ['company_name',     'TEXT'],
  ['total_beds',       'INTEGER DEFAULT 0'],
  ['available_beds',   'INTEGER DEFAULT 0'],
];

for (const [col, type] of columns) {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    console.log(`✅ Column ${col} ready`);
  } catch(e) {
    console.log(`⚠️  Column ${col}: ${e.message}`);
  }
}

// Step 2: Fix passwords
const hash = await bcrypt.hash('password123', 10);
await pool.query(
  'UPDATE users SET password_hash=$1, failed_login_attempts=0, locked_until=NULL',
  [hash]
);
console.log('\n✅ All passwords set to password123');

// Step 3: Link doctors to hospital
const hospitals = await pool.query("SELECT id FROM users WHERE role='hospital' LIMIT 1");
const hospitalId = hospitals.rows[0]?.id;

if (hospitalId) {
  await pool.query(`
    UPDATE users SET
      hospital_id = $1,
      specialization = CASE
        WHEN name ILIKE '%wilson%' THEN 'Cardiology'
        WHEN name ILIKE '%johnson%' THEN 'Orthopedics'
        ELSE 'General Medicine'
      END,
      consultation_fee = CASE
        WHEN name ILIKE '%wilson%' THEN 200
        WHEN name ILIKE '%johnson%' THEN 250
        ELSE 150
      END,
      experience = CASE
        WHEN name ILIKE '%wilson%' THEN 10
        WHEN name ILIKE '%johnson%' THEN 15
        ELSE 5
      END
    WHERE role = 'doctor'
  `, [hospitalId]);
  console.log(`✅ Doctors linked to hospital: ${hospitalId}`);
} else {
  console.log('❌ No hospital found!');
}

// Step 4: Verify
const doctors = await pool.query(
  "SELECT id, name, hospital_id, specialization, consultation_fee FROM users WHERE role='doctor'"
);
console.log('\nDoctors after fix:');
doctors.rows.forEach(r => console.log(`  ${r.name} -> hospital_id: ${r.hospital_id}, spec: ${r.specialization}`));

// Step 5: Check what API returns for /api/users/role/doctor
const apiCheck = await pool.query(
  `SELECT id, email, role, name, phone, address,
          specialization, license_number, hospital_id,
          experience, consultation_fee
   FROM users WHERE role='doctor'`
);
console.log('\nAPI will return:');
apiCheck.rows.forEach(r => console.log(JSON.stringify(r)));

pool.end();
console.log('\n✅ All done! Refresh your browser.');
