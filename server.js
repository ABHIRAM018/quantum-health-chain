/**
 * server.js  — Node.js + Express + pg (PostgreSQL)
 * 
 * Run:
 *   npm install express pg bcryptjs jsonwebtoken cors dotenv
 *   node server.js
 * 
 * Reads DB config from .env:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   JWT_SECRET
 *   PORT (default 4000)
 */

import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman) and any localhost port
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Health check (no auth needed) ────────────────────────────
app.get('/api/ping', (_req, res) => res.json({ status: 'ok', db: 'quantum_health_chain' }));

// ─── PostgreSQL connection pool ───────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'quantum_health_chain',
  user:     process.env.DB_USER     || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err.message));

const db = pool; // alias

// ─── JWT middleware ───────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'qhc_secret_change_in_production';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    const token = header.replace('Bearer ', '');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required: ${roles.join(', ')}` });
    }
    next();
  };
}

// ─── helper: log activity ─────────────────────────────────────
async function logActivity(userId, userRole, action, details) {
  try {
    await db.query(
      'INSERT INTO system_logs (user_id, user_role, action, details) VALUES ($1,$2,$3,$4)',
      [userId, userRole, action, details]
    );
  } catch (e) {
    console.error('Log error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  email = email.trim();

  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${mins} minute(s).` });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;
      await db.query(
        'UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3',
        [attempts, lockedUntil, user.id]
      );
      const remaining = Math.max(0, 5 - attempts);
      return res.status(401).json({
        error: attempts >= 5
          ? 'Too many attempts. Account locked for 15 minutes.'
          : `Invalid credentials. ${remaining} attempt(s) remaining.`
      });
    }

    // Success — reset attempts, record login
    await db.query(
      'UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=$1',
      [user.id]
    );

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logActivity(user.id, user.role, 'LOGIN', 'User logged in');

    // Strip password hash before sending
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', auth, async (req, res) => {
  await logActivity(req.user.sub, req.user.role, 'LOGOUT', 'User logged out');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE id=$1', [req.user.sub]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  delete rows[0].password_hash;
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════

// GET /api/users
app.get('/api/users', auth, requireRole('admin'), async (req, res) => {
  const { rows } = await db.query(
    'SELECT id,email,role,name,phone,address,created_at,updated_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
});

// GET /api/users/role/:role
app.get('/api/users/role/:role', auth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, email, role, name, phone, address,
            specialization, license_number, hospital_id,
            experience, consultation_fee, date_of_birth,
            emergency_contact, insurance_id, bank_name,
            routing_number, company_name, total_beds, available_beds
     FROM users WHERE role=$1`, [req.params.role]
  );
  res.json(rows);
});

// POST /api/users
app.post('/api/users', auth, requireRole('admin', 'hospital'), async (req, res) => {
  const { email, password, role, name, phone, address } = req.body;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, role, name, phone, address)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,email,role,name,phone,address,created_at`,
      [email, hash, role, name, phone, address]
    );
    await logActivity(req.user.sub, req.user.role, 'USER_CREATED', `Created ${role}: ${name}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    throw err;
  }
});

// PUT /api/users/:id
app.put('/api/users/:id', auth, async (req, res) => {
  // Users can update own profile; admin can update any
  if (req.user.sub !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { name, phone, address } = req.body;
  const { rows } = await db.query(
    'UPDATE users SET name=$1, phone=$2, address=$3, updated_at=NOW() WHERE id=$4 RETURNING id,email,role,name,phone,address',
    [name, phone, address, req.params.id]
  );
  await logActivity(req.user.sub, req.user.role, 'USER_UPDATED', `Updated user ${req.params.id}`);
  res.json(rows[0]);
});

// DELETE /api/users/:id
app.delete('/api/users/:id', auth, requireRole('admin'), async (req, res) => {
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  await logActivity(req.user.sub, req.user.role, 'USER_DELETED', `Deleted user ${req.params.id}`);
  res.json({ message: 'Deleted' });
});

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════

// GET /api/appointments (patient sees own, doctor sees own)
app.get('/api/appointments', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'patient') {
    query = 'SELECT * FROM appointments WHERE patient_id=$1 ORDER BY date_time DESC';
    params = [req.user.sub];
  } else if (req.user.role === 'doctor') {
    query = 'SELECT * FROM appointments WHERE doctor_id=$1 ORDER BY date_time DESC';
    params = [req.user.sub];
  } else if (req.user.role === 'hospital') {
    query = 'SELECT * FROM appointments WHERE hospital_id=$1 ORDER BY date_time DESC';
    params = [req.user.sub];
  } else {
    query = 'SELECT * FROM appointments ORDER BY date_time DESC LIMIT 200';
    params = [];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// POST /api/appointments
app.post('/api/appointments', auth, requireRole('patient'), async (req, res) => {
  const { doctorId, hospitalId, dateTime, reason } = req.body;
  const { rows } = await db.query(
    `INSERT INTO appointments (patient_id, doctor_id, hospital_id, date_time, reason, status)
     VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [req.user.sub, doctorId, hospitalId, dateTime, reason]
  );
  await logActivity(req.user.sub, 'patient', 'APPOINTMENT_BOOKED', `Booked with doctor ${doctorId}`);
  res.status(201).json(rows[0]);
});

// PATCH /api/appointments/:id
app.patch('/api/appointments/:id', auth, requireRole('doctor', 'admin'), async (req, res) => {
  const { status, diagnosis, prescription } = req.body;
  const { rows } = await db.query(
    `UPDATE appointments SET status=$1, diagnosis=$2, prescription=$3
     WHERE id=$4 RETURNING *`,
    [status, diagnosis, prescription, req.params.id]
  );
  await logActivity(req.user.sub, req.user.role, 'APPOINTMENT_UPDATED', `Status: ${status}`);
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// MEDICAL RECORDS
// ═══════════════════════════════════════════════════════════════

// GET /api/medical-records
app.get('/api/medical-records', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'patient') {
    query = 'SELECT * FROM medical_records WHERE patient_id=$1 ORDER BY created_at DESC';
    params = [req.user.sub];
  } else if (req.user.role === 'doctor') {
    query = 'SELECT * FROM medical_records WHERE doctor_id=$1 ORDER BY created_at DESC';
    params = [req.user.sub];
  } else {
    query = 'SELECT * FROM medical_records ORDER BY created_at DESC LIMIT 200';
    params = [];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// POST /api/medical-records
app.post('/api/medical-records', auth, requireRole('doctor', 'hospital'), async (req, res) => {
  const { patientId, appointmentId, diagnosis, prescription, notes, attachments } = req.body;
  const { rows } = await db.query(
    `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, prescription, notes, attachments)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [patientId, req.user.sub, appointmentId, diagnosis, prescription, notes, attachments || []]
  );
  await logActivity(req.user.sub, req.user.role, 'MEDICAL_RECORD_ADDED', `For patient ${patientId}`);
  res.status(201).json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// BILLS
// ═══════════════════════════════════════════════════════════════

// GET /api/bills
app.get('/api/bills', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'patient') {
    query = `SELECT b.*, json_agg(bi.*) as items FROM bills b
             LEFT JOIN bill_items bi ON b.id = bi.bill_id
             WHERE b.patient_id=$1 GROUP BY b.id ORDER BY b.created_at DESC`;
    params = [req.user.sub];
  } else if (req.user.role === 'hospital') {
    query = `SELECT b.*, json_agg(bi.*) as items FROM bills b
             LEFT JOIN bill_items bi ON b.id = bi.bill_id
             WHERE b.hospital_id=$1 GROUP BY b.id ORDER BY b.created_at DESC`;
    params = [req.user.sub];
  } else {
    query = `SELECT b.*, json_agg(bi.*) as items FROM bills b
             LEFT JOIN bill_items bi ON b.id = bi.bill_id
             GROUP BY b.id ORDER BY b.created_at DESC LIMIT 200`;
    params = [];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// POST /api/bills
app.post('/api/bills', auth, requireRole('hospital'), async (req, res) => {
  const { patientId, doctorId, appointmentId, amount, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [bill] } = await client.query(
      `INSERT INTO bills (patient_id, hospital_id, doctor_id, appointment_id, amount, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
      [patientId, req.user.sub, doctorId || null, appointmentId || null, amount]
    );
    if (items?.length) {
      for (const item of items) {
        await client.query(
          'INSERT INTO bill_items (bill_id, description, quantity, unit_price, total) VALUES ($1,$2,$3,$4,$5)',
          [bill.id, item.description, item.quantity, item.unitPrice ?? item.unit_price, item.total]
        );
      }
    }
    await client.query('COMMIT');
    await logActivity(req.user.sub, 'hospital', 'BILL_CREATED', `Bill for patient ${patientId}: $${amount}`);
    // Notify doctor
    if (doctorId) {
      const { rows: [patient] } = await db.query('SELECT name FROM users WHERE id=$1', [patientId]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'bill')`,
        [doctorId, 'Bill Created for Your Patient',
         `A bill of $${parseFloat(amount).toFixed(2)} has been generated for patient ${patient?.name || patientId}.`]
      );
    }
    res.status(201).json(bill);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bill create error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/bills/:id/pay — mark bill as paid, notify consulting doctor
app.patch('/api/bills/:id/pay', auth, async (req, res) => {
  try {
    const { rows: [bill] } = await db.query(
      "UPDATE bills SET status='paid' WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    await logActivity(req.user.sub, req.user.role, 'BILL_PAID', `Bill ${req.params.id} marked paid`);
    if (bill.doctor_id) {
      const { rows: [patient] } = await db.query('SELECT name FROM users WHERE id=$1', [bill.patient_id]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'payment')`,
        [bill.doctor_id,
         'Payment Completed',
         `Payment of $${parseFloat(bill.amount).toFixed(2)} for patient ${patient?.name || bill.patient_id} has been completed and cleared.`]
      );
    }
    res.json(bill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bills/:id/forward  — forward to insurance
app.patch('/api/bills/:id/forward', auth, requireRole('hospital'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [bill] } = await client.query(
      "UPDATE bills SET status='submitted' WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!bill) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Bill not found' }); }
    // Resolve insurance ID
    let insuranceId = req.body.insuranceId;
    if (!insuranceId || insuranceId === 'insurance-default' || insuranceId === 'insurance-1') {
      const { rows: ins } = await client.query("SELECT id FROM users WHERE role='insurance' LIMIT 1");
      insuranceId = ins[0]?.id;
    }
    if (!insuranceId) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'No insurance provider registered' }); }
    const { rows: [claim] } = await client.query(
      `INSERT INTO insurance_claims (patient_id, bill_id, insurance_id, amount, status)
       VALUES ($1,$2,$3,$4,'submitted') RETURNING *`,
      [bill.patient_id, bill.id, insuranceId, bill.amount]
    );
    await client.query('COMMIT');
    await logActivity(req.user.sub, 'hospital', 'CLAIM_FORWARDED', `Forwarded bill ${req.params.id}`);
    // Notify doctor
    if (bill.doctor_id) {
      const { rows: [patient] } = await db.query('SELECT name FROM users WHERE id=$1', [bill.patient_id]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'claim')`,
        [bill.doctor_id, 'Insurance Claim Forwarded',
         `Claim for patient ${patient?.name || bill.patient_id} ($${parseFloat(bill.amount).toFixed(2)}) forwarded to insurance.`]
      );
    }
    res.json({ bill, claim });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Forward claim error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// INSURANCE CLAIMS
// ═══════════════════════════════════════════════════════════════

// GET /api/claims
app.get('/api/claims', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'insurance') {
    query = 'SELECT * FROM insurance_claims WHERE insurance_id=$1 ORDER BY created_at DESC';
    params = [req.user.sub];
  } else if (req.user.role === 'patient') {
    query = 'SELECT * FROM insurance_claims WHERE patient_id=$1 ORDER BY created_at DESC';
    params = [req.user.sub];
  } else {
    query = 'SELECT * FROM insurance_claims ORDER BY created_at DESC LIMIT 200';
    params = [];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// POST /api/claims
app.post('/api/claims', auth, requireRole('patient', 'hospital'), async (req, res) => {
  const { billId, insuranceId, amount } = req.body;
  const { rows } = await db.query(
    `INSERT INTO insurance_claims (patient_id, bill_id, insurance_id, amount, status)
     VALUES ($1,$2,$3,$4,'submitted') RETURNING *`,
    [req.user.sub, billId, insuranceId, amount]
  );
  await logActivity(req.user.sub, req.user.role, 'CLAIM_SUBMITTED', `Claim for bill ${billId}`);
  res.status(201).json(rows[0]);
});

// PATCH /api/claims/:id
app.patch('/api/claims/:id', auth, requireRole('insurance', 'admin'), async (req, res) => {
  const { status, approvalLetter, rejectionReason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE insurance_claims
       SET status=$1, approval_letter=$2, rejection_reason=$3
       WHERE id=$4 RETURNING *`,
      [status, approvalLetter || null, rejectionReason || null, req.params.id]
    );
    const claim = rows[0];
    if (!claim) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Claim not found' }); }

    // Keep bill status in sync with claim status
    if (status === 'approved') {
      // Bill is now approved — hospital knows insurance has accepted it
      await client.query(
        "UPDATE bills SET status='approved' WHERE id=$1",
        [claim.bill_id]
      );
    } else if (status === 'rejected') {
      // Insurance rejected — bill reverts to pending so hospital can act
      await client.query(
        "UPDATE bills SET status='pending' WHERE id=$1 AND status NOT IN ('paid')",
        [claim.bill_id]
      );
    }

    await client.query('COMMIT');
    await logActivity(req.user.sub, req.user.role, 'CLAIM_UPDATED', `Claim ${req.params.id} → ${status}`);
    res.json(claim);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Claim update error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/claims/:id/send-to-bank
app.post('/api/claims/:id/send-to-bank', auth, requireRole('insurance'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [claim] } = await client.query(
      'SELECT * FROM insurance_claims WHERE id=$1', [req.params.id]
    );
    if (!claim || claim.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Claim must be approved first' });
    }
    const { rows: [bill] } = await client.query('SELECT * FROM bills WHERE id=$1', [claim.bill_id]);

    // Create the pending payment record
    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (claim_id, bank_id, hospital_id, amount, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [claim.id, req.body.bankId, bill?.hospital_id, claim.amount]
    );

    // Mark bill as 'submitted' — visible to both patient and hospital as "sent to bank"
    await client.query(
      "UPDATE bills SET status='submitted' WHERE id=$1",
      [claim.bill_id]
    );

    // Notify patient that insurance payment is in progress
    if (bill?.patient_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'payment')`,
        [bill.patient_id,
         'Insurance Payment In Progress',
         `Your insurance claim of $${parseFloat(claim.amount).toFixed(2)} has been sent to the bank for processing.`]
      );
    }

    // Notify hospital
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'payment')`,
      [bill?.hospital_id,
       'Insurance Payment Dispatched',
       `Payment of $${parseFloat(claim.amount).toFixed(2)} for bill ${claim.bill_id} has been sent to the bank.`]
    );

    await client.query('COMMIT');
    await logActivity(req.user.sub, 'insurance', 'PAYMENT_INITIATED', `For claim ${req.params.id}`);
    res.status(201).json(payment);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Send to bank error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════

// GET /api/payments
app.get('/api/payments', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'bank') {
    query = 'SELECT * FROM payments WHERE bank_id=$1 ORDER BY created_at DESC';
    params = [req.user.sub];
  } else if (req.user.role === 'hospital') {
    query = 'SELECT * FROM payments WHERE hospital_id=$1 ORDER BY created_at DESC';
    params = [req.user.sub];
  } else {
    query = 'SELECT * FROM payments ORDER BY created_at DESC LIMIT 200';
    params = [];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// PATCH /api/payments/:id/process
app.patch('/api/payments/:id/process', auth, requireRole('bank'), async (req, res) => {
  const txnId = `TXN-${Date.now()}`;
  const { rows } = await db.query(
    "UPDATE payments SET status='processed', transaction_id=$1 WHERE id=$2 RETURNING *",
    [txnId, req.params.id]
  );
  await logActivity(req.user.sub, 'bank', 'PAYMENT_PROCESSED', `TXN: ${txnId}`);
  res.json(rows[0]);
});

// PATCH /api/payments/:id/complete
app.patch('/api/payments/:id/complete', auth, requireRole('bank'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE payments
       SET status='completed', receipt='Payment completed successfully'
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    const payment = rows[0];
    if (!payment) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Payment not found' }); }

    // Trace back: payment → claim → bill → mark bill as 'paid'
    const { rows: [claim] } = await client.query(
      'SELECT * FROM insurance_claims WHERE id=$1', [payment.claim_id]
    );
    if (claim?.bill_id) {
      await client.query(
        "UPDATE bills SET status='paid' WHERE id=$1",
        [claim.bill_id]
      );
      // Notify patient their bill is fully paid
      const { rows: [bill] } = await client.query('SELECT * FROM bills WHERE id=$1', [claim.bill_id]);
      if (bill?.patient_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'payment')`,
          [bill.patient_id,
           'Bill Paid by Insurance',
           `Your bill of $${parseFloat(bill.amount).toFixed(2)} has been fully paid by your insurance provider.`]
        );
      }
    }

    await client.query('COMMIT');
    await logActivity(req.user.sub, 'bank', 'PAYMENT_COMPLETED', `Payment ${req.params.id}`);
    res.json(payment);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment complete error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// HOSPITAL — ROOMS
// ═══════════════════════════════════════════════════════════════

app.get('/api/hospital/rooms', auth, requireRole('hospital', 'admin'), async (req, res) => {
  // Use query param hospitalId if provided, otherwise use JWT sub
  const hospitalId = req.query.hospitalId || req.user.sub;
  const { rows } = await db.query(
    'SELECT * FROM hospital_rooms WHERE hospital_id=$1 ORDER BY room_number',
    [hospitalId]
  );
  res.json(rows);
});

app.post('/api/hospital/rooms', auth, requireRole('hospital'), async (req, res) => {
  const { roomNumber, roomType, totalBeds, floor, status, amenities, pricePerDay } = req.body;
  const { rows } = await db.query(
    `INSERT INTO hospital_rooms
     (hospital_id, room_number, room_type, total_beds, available_beds, floor, status, amenities, price_per_day)
     VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.sub, roomNumber, roomType, totalBeds, floor, status || 'active', amenities || [], pricePerDay]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/hospital/rooms/:id', auth, requireRole('hospital'), async (req, res) => {
  const { roomType, totalBeds, availableBeds, floor, status, amenities, pricePerDay } = req.body;
  const { rows } = await db.query(
    `UPDATE hospital_rooms
     SET room_type=$1, total_beds=$2, available_beds=$3, floor=$4, status=$5, amenities=$6, price_per_day=$7, updated_at=NOW()
     WHERE id=$8 AND hospital_id=$9 RETURNING *`,
    [roomType, totalBeds, availableBeds, floor, status, amenities, pricePerDay, req.params.id, req.user.sub]
  );
  res.json(rows[0]);
});

app.delete('/api/hospital/rooms/:id', auth, requireRole('hospital'), async (req, res) => {
  await db.query('DELETE FROM hospital_rooms WHERE id=$1 AND hospital_id=$2', [req.params.id, req.user.sub]);
  res.json({ message: 'Deleted' });
});

// ═══════════════════════════════════════════════════════════════
// HOSPITAL — SERVICES
// ═══════════════════════════════════════════════════════════════

app.get('/api/hospital/services', auth, async (req, res) => {
  const id = req.query.hospitalId || req.user.sub;
  const { rows } = await db.query(
    'SELECT * FROM hospital_services WHERE hospital_id=$1 ORDER BY service_name', [id]
  );
  res.json(rows);
});

app.post('/api/hospital/services', auth, requireRole('hospital'), async (req, res) => {
  const { serviceName, description, department, basePrice, requirements, duration } = req.body;
  const { rows } = await db.query(
    `INSERT INTO hospital_services
     (hospital_id, service_name, description, department, base_price, is_active, requirements, duration)
     VALUES ($1,$2,$3,$4,$5,true,$6,$7) RETURNING *`,
    [req.user.sub, serviceName, description, department, basePrice, requirements || [], duration]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/hospital/services/:id', auth, requireRole('hospital'), async (req, res) => {
  const { serviceName, description, department, basePrice, isActive, requirements, duration } = req.body;
  const { rows } = await db.query(
    `UPDATE hospital_services
     SET service_name=$1, description=$2, department=$3, base_price=$4, is_active=$5,
         requirements=$6, duration=$7, updated_at=NOW()
     WHERE id=$8 AND hospital_id=$9 RETURNING *`,
    [serviceName, description, department, basePrice, isActive, requirements, duration, req.params.id, req.user.sub]
  );
  res.json(rows[0]);
});

app.delete('/api/hospital/services/:id', auth, requireRole('hospital'), async (req, res) => {
  await db.query('DELETE FROM hospital_services WHERE id=$1 AND hospital_id=$2', [req.params.id, req.user.sub]);
  res.json({ message: 'Deleted' });
});

// ═══════════════════════════════════════════════════════════════
// PATIENT ADMISSIONS
// ═══════════════════════════════════════════════════════════════

app.get('/api/admissions', auth, requireRole('hospital', 'admin'), async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM patient_admissions WHERE hospital_id=$1 ORDER BY admission_date DESC',
    [req.user.sub]
  );
  res.json(rows);
});

app.post('/api/admissions', auth, requireRole('hospital'), async (req, res) => {
  const { patientId, doctorId, roomId, reason, emergencyContact, insuranceInfo, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [admission] } = await client.query(
      `INSERT INTO patient_admissions
       (patient_id, hospital_id, doctor_id, room_id, reason, status, emergency_contact, insurance_info, notes)
       VALUES ($1,$2,$3,$4,$5,'admitted',$6,$7,$8) RETURNING *`,
      [patientId, req.user.sub, doctorId, roomId, reason, emergencyContact, insuranceInfo, notes]
    );
    await client.query(
      'UPDATE hospital_rooms SET available_beds = GREATEST(0, available_beds - 1), updated_at=NOW() WHERE id=$1',
      [roomId]
    );
    await client.query('COMMIT');
    await logActivity(req.user.sub, 'hospital', 'PATIENT_ADMITTED', `Patient ${patientId} admitted`);
    res.status(201).json(admission);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

app.patch('/api/admissions/:id/discharge', auth, requireRole('hospital'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [admission] } = await client.query(
      "UPDATE patient_admissions SET status='discharged', discharge_date=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (admission?.room_id) {
      await client.query(
        'UPDATE hospital_rooms SET available_beds = available_beds + 1, updated_at=NOW() WHERE id=$1',
        [admission.room_id]
      );
    }
    await client.query('COMMIT');
    await logActivity(req.user.sub, 'hospital', 'PATIENT_DISCHARGED', `Admission ${req.params.id}`);
    res.json(admission);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// LAB REPORTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/lab-reports', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'hospital') {
    query = 'SELECT * FROM lab_reports WHERE hospital_id=$1 ORDER BY test_date DESC';
    params = [req.user.sub];
  } else if (req.user.role === 'patient') {
    query = 'SELECT * FROM lab_reports WHERE patient_id=$1 ORDER BY test_date DESC';
    params = [req.user.sub];
  } else {
    query = 'SELECT * FROM lab_reports ORDER BY test_date DESC LIMIT 200';
    params = [];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

app.post('/api/lab-reports', auth, requireRole('hospital', 'doctor'), async (req, res) => {
  const { patientId, doctorId, testType, results, normalRange, notes } = req.body;
  const { rows } = await db.query(
    `INSERT INTO lab_reports
     (patient_id, doctor_id, hospital_id, test_type, results, normal_range, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,'completed',$7) RETURNING *`,
    [patientId, doctorId || req.user.sub, req.user.sub, testType, results, normalRange, notes]
  );
  res.status(201).json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════

app.get('/api/prescriptions', auth, async (req, res) => {
  let query, params;
  if (req.user.role === 'patient') {
    query = `SELECT p.*, json_agg(pm.*) as medicines FROM prescriptions p
             LEFT JOIN prescription_medicines pm ON p.id = pm.prescription_id
             WHERE p.patient_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`;
    params = [req.user.sub];
  } else {
    query = `SELECT p.*, json_agg(pm.*) as medicines FROM prescriptions p
             LEFT JOIN prescription_medicines pm ON p.id = pm.prescription_id
             WHERE p.doctor_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`;
    params = [req.user.sub];
  }
  const { rows } = await db.query(query, params);
  res.json(rows);
});

app.post('/api/prescriptions', auth, requireRole('doctor'), async (req, res) => {
  const { patientId, appointmentId, medicines, notes, refillsAllowed, blockchainHash } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [rx] } = await client.query(
      `INSERT INTO prescriptions
       (patient_id, doctor_id, appointment_id, notes, status, refills_allowed, blockchain_hash)
       VALUES ($1,$2,$3,$4,'active',$5,$6) RETURNING *`,
      [patientId, req.user.sub, appointmentId, notes, refillsAllowed || 1, blockchainHash]
    );
    if (medicines?.length) {
      for (const m of medicines) {
        await client.query(
          `INSERT INTO prescription_medicines
           (prescription_id, medicine_name, dosage, frequency, duration, instructions)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [rx.id, m.medicineName, m.dosage, m.frequency, m.duration, m.instructions]
        );
      }
    }
    await client.query('COMMIT');
    await logActivity(req.user.sub, 'doctor', 'PRESCRIPTION_CREATED', `For patient ${patientId}`);
    res.status(201).json(rx);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /api/prescriptions/:id — update status
app.patch('/api/prescriptions/:id', auth, requireRole('doctor'), async (req, res) => {
  const { status } = req.body;
  try {
    const { rows: [rx] } = await db.query(
      'UPDATE prescriptions SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CONSENT RECORDS
// ═══════════════════════════════════════════════════════════════

// GET /api/consents/granted-to-me — doctor/insurance/bank sees consents granted TO them
// Must be defined BEFORE /api/consents to avoid any routing ambiguity
app.get('/api/consents/granted-to-me', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.*, u.name AS patient_name, u.email AS patient_email
       FROM consent_records cr
       JOIN users u ON u.id = cr.patient_id
       WHERE cr.granted_to = $1
       ORDER BY cr.created_at DESC`,
      [req.user.sub]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/consents — patient sees their own consents
app.get('/api/consents', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM consent_records WHERE patient_id=$1 ORDER BY created_at DESC',
    [req.user.sub]
  );
  res.json(rows);
});

app.post('/api/consents', auth, requireRole('patient'), async (req, res) => {
  const { grantedTo, grantedToRole, accessType, validUntil, reason } = req.body;
  const { rows } = await db.query(
    `INSERT INTO consent_records
     (patient_id, granted_to, granted_to_role, access_type, status, valid_until, reason)
     VALUES ($1,$2,$3,$4,'active',$5,$6) RETURNING *`,
    [req.user.sub, grantedTo, grantedToRole, accessType, validUntil, reason]
  );
  res.status(201).json(rows[0]);
});

app.patch('/api/consents/:id/revoke', auth, requireRole('patient'), async (req, res) => {
  const { rows } = await db.query(
    "UPDATE consent_records SET status='revoked', updated_at=NOW() WHERE id=$1 AND patient_id=$2 RETURNING *",
    [req.params.id, req.user.sub]
  );
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// MEDICAL LOANS
// ═══════════════════════════════════════════════════════════════

app.get('/api/loans', auth, async (req, res) => {
  const col = req.user.role === 'patient' ? 'patient_id' : 'bank_id';
  const { rows } = await db.query(
    `SELECT * FROM medical_loans WHERE ${col}=$1 ORDER BY applied_on DESC`,
    [req.user.sub]
  );
  res.json(rows);
});

app.post('/api/loans', auth, requireRole('patient'), async (req, res) => {
  const { bankId, amount, purpose, interestRate, durationMonths, monthlyEmi } = req.body;
  const { rows } = await db.query(
    `INSERT INTO medical_loans
     (patient_id, bank_id, amount, purpose, interest_rate, duration_months, status, monthly_emi, amount_paid)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,0) RETURNING *`,
    [req.user.sub, bankId, amount, purpose, interestRate, durationMonths, monthlyEmi]
  );
  res.status(201).json(rows[0]);
});

app.patch('/api/loans/:id', auth, requireRole('bank'), async (req, res) => {
  const { status } = req.body;
  const approvedOn = ['approved', 'repaying'].includes(status) ? new Date().toISOString() : null;
  const { rows } = await db.query(
    'UPDATE medical_loans SET status=$1, approved_on=$2 WHERE id=$3 AND bank_id=$4 RETURNING *',
    [status, approvedOn, req.params.id, req.user.sub]
  );
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// INSURANCE POLICIES
// ═══════════════════════════════════════════════════════════════

app.get('/api/policies', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM insurance_policies WHERE insurance_id=$1 ORDER BY created_at DESC',
    [req.user.role === 'insurance' ? req.user.sub : req.query.insuranceId]
  );
  res.json(rows);
});

app.post('/api/policies', auth, requireRole('insurance'), async (req, res) => {
  const { policyName, policyType, coverageAmount, premiumMonthly, deductible, coveredServices, networkHospitals } = req.body;
  const { rows } = await db.query(
    `INSERT INTO insurance_policies
     (insurance_id, policy_name, policy_type, coverage_amount, premium_monthly, deductible, covered_services, network_hospitals, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING *`,
    [req.user.sub, policyName, policyType, coverageAmount, premiumMonthly, deductible, coveredServices || [], networkHospitals || []]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/policies/:id', auth, requireRole('insurance'), async (req, res) => {
  const { policyName, policyType, coverageAmount, premiumMonthly, deductible, coveredServices, networkHospitals, status } = req.body;
  const { rows } = await db.query(
    `UPDATE insurance_policies
     SET policy_name=$1, policy_type=$2, coverage_amount=$3, premium_monthly=$4,
         deductible=$5, covered_services=$6, network_hospitals=$7, status=$8, updated_at=NOW()
     WHERE id=$9 AND insurance_id=$10 RETURNING *`,
    [policyName, policyType, coverageAmount, premiumMonthly, deductible, coveredServices, networkHospitals, status, req.params.id, req.user.sub]
  );
  res.json(rows[0]);
});

app.delete('/api/policies/:id', auth, requireRole('insurance'), async (req, res) => {
  await db.query('DELETE FROM insurance_policies WHERE id=$1 AND insurance_id=$2', [req.params.id, req.user.sub]);
  res.json({ message: 'Deleted' });
});

// ═══════════════════════════════════════════════════════════════
// POLICY ENROLLMENTS
// ═══════════════════════════════════════════════════════════════

// GET /api/policies/public — any authenticated user can browse all active policies
app.get('/api/policies/public', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.name AS insurer_name
       FROM insurance_policies p
       JOIN users u ON u.id = p.insurance_id
       WHERE p.status = 'active'
       ORDER BY p.premium_monthly ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enrollments — patient sees their own enrollments; insurance sees their enrollments
app.get('/api/enrollments', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'patient') {
      query = `SELECT e.*, p.policy_name, p.policy_type, p.coverage_amount,
                      p.premium_monthly, p.deductible, p.covered_services,
                      u.name AS insurer_name
               FROM policy_enrollments e
               JOIN insurance_policies p ON p.id = e.policy_id
               JOIN users u ON u.id = e.insurance_id
               WHERE e.patient_id = $1
               ORDER BY e.enrolled_at DESC`;
      params = [req.user.sub];
    } else if (req.user.role === 'insurance') {
      query = `SELECT e.*, p.policy_name, p.policy_type,
                      u.name AS patient_name, u.email AS patient_email, u.phone AS patient_phone
               FROM policy_enrollments e
               JOIN insurance_policies p ON p.id = e.policy_id
               JOIN users u ON u.id = e.patient_id
               WHERE e.insurance_id = $1
               ORDER BY e.enrolled_at DESC`;
      params = [req.user.sub];
    } else {
      // admin sees all
      query = `SELECT e.*, p.policy_name, p.policy_type,
                      up.name AS patient_name, ui.name AS insurer_name
               FROM policy_enrollments e
               JOIN insurance_policies p ON p.id = e.policy_id
               JOIN users up ON up.id = e.patient_id
               JOIN users ui ON ui.id = e.insurance_id
               ORDER BY e.enrolled_at DESC`;
      params = [];
    }
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrollments — patient applies for a policy
app.post('/api/enrollments', auth, requireRole('patient'), async (req, res) => {
  const { policyId, notes } = req.body;
  if (!policyId) return res.status(400).json({ error: 'policyId is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Get the policy to find insurance_id and set expiry
    const { rows: [policy] } = await client.query(
      'SELECT * FROM insurance_policies WHERE id=$1 AND status=$2',
      [policyId, 'active']
    );
    if (!policy) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Policy not found or inactive' }); }

    // Check not already enrolled
    const { rows: existing } = await client.query(
      'SELECT id, status FROM policy_enrollments WHERE patient_id=$1 AND policy_id=$2',
      [req.user.sub, policyId]
    );
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Already enrolled — status: ${existing[0].status}` });
    }

    // Default: 1 year validity
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { rows: [enrollment] } = await client.query(
      `INSERT INTO policy_enrollments
         (patient_id, policy_id, insurance_id, status, expires_at, notes)
       VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING *`,
      [req.user.sub, policyId, policy.insurance_id, expiresAt.toISOString(), notes || null]
    );

    // Notify the insurance company
    const { rows: [patient] } = await client.query('SELECT name FROM users WHERE id=$1', [req.user.sub]);
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'general')`,
      [policy.insurance_id,
       'New Policy Enrollment Request',
       `${patient?.name || 'A patient'} has applied for "${policy.policy_name}". Please review and activate.`]
    );

    await client.query('COMMIT');
    await logActivity(req.user.sub, 'patient', 'POLICY_ENROLLMENT_APPLIED', `Policy: ${policy.policy_name}`);
    res.status(201).json({ ...enrollment, policy_name: policy.policy_name, insurer_name: null });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/enrollments/:id — insurance approves/cancels; patient cancels own
app.patch('/api/enrollments/:id', auth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'cancelled', 'expired'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    let query, params;
    if (req.user.role === 'insurance') {
      query = `UPDATE policy_enrollments SET status=$1
               WHERE id=$2 AND insurance_id=$3 RETURNING *`;
      params = [status, req.params.id, req.user.sub];
    } else if (req.user.role === 'patient') {
      if (status !== 'cancelled') return res.status(403).json({ error: 'Patients can only cancel enrollments' });
      query = `UPDATE policy_enrollments SET status=$1
               WHERE id=$2 AND patient_id=$3 RETURNING *`;
      params = [status, req.params.id, req.user.sub];
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows: [enrollment] } = await db.query(query, params);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    // Notify patient of decision
    if (req.user.role === 'insurance') {
      const msg = status === 'active'
        ? 'Your insurance policy enrollment has been approved and is now active!'
        : `Your insurance policy enrollment has been ${status}.`;
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'general')`,
        [enrollment.patient_id, `Policy Enrollment ${status === 'active' ? 'Approved' : 'Updated'}`, msg]
      );
    }

    await logActivity(req.user.sub, req.user.role, 'ENROLLMENT_UPDATED', `Enrollment ${req.params.id} → ${status}`);
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════════════

app.get('/api/refunds', auth, async (req, res) => {
  const col = req.user.role === 'patient' ? 'patient_id' : 'bank_id';
  const { rows } = await db.query(
    `SELECT * FROM refunds WHERE ${col}=$1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json(rows);
});

app.post('/api/refunds', auth, requireRole('bank', 'patient'), async (req, res) => {
  const { paymentId, patientId, amount, reason, type } = req.body;
  const { rows } = await db.query(
    `INSERT INTO refunds (payment_id, patient_id, bank_id, amount, reason, type, status)
     VALUES ($1,$2,$3,$4,$5,$6,'requested') RETURNING *`,
    [paymentId, patientId, req.user.sub, amount, reason, type]
  );
  res.status(201).json(rows[0]);
});

app.patch('/api/refunds/:id', auth, requireRole('bank'), async (req, res) => {
  const { status, transactionId } = req.body;
  const processedAt = ['completed', 'rejected'].includes(status) ? new Date().toISOString() : null;
  const { rows } = await db.query(
    'UPDATE refunds SET status=$1, transaction_id=$2, processed_at=$3 WHERE id=$4 AND bank_id=$5 RETURNING *',
    [status, transactionId || null, processedAt, req.params.id, req.user.sub]
  );
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

// POST /api/notifications — create notification for a user
app.post('/api/notifications', async (req, res) => {
  const { userId, title, message, type } = req.body;
  if (!userId || !title || !message) return res.status(400).json({ error: 'userId, title, message required' });
  try {
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
      [userId, title, message, type || 'info']
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Notification insert error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.sub]
  );
  res.json(rows);
});

app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  await db.query('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
  res.json({ ok: true });
});

app.patch('/api/notifications/read-all', auth, async (req, res) => {
  await db.query('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.sub]);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════
// SECURITY ALERTS (admin only)
// ═══════════════════════════════════════════════════════════════

app.get('/api/security-alerts', auth, requireRole('admin', 'regulator'), async (req, res) => {
  const { rows } = await db.query('SELECT * FROM security_alerts ORDER BY created_at DESC');
  res.json(rows);
});

// POST /api/security-alerts/simulate
app.post('/api/security-alerts/simulate', auth, requireRole('admin'), async (req, res) => {
  try {
    const types = ['failed_login','unauthorized_access','suspicious_activity','account_locked'];
    const severities = ['low','medium','high','critical'];
    const alertType = types[Math.floor(Math.random() * types.length)];
    const severity  = severities[Math.floor(Math.random() * severities.length)];
    const messages = {
      failed_login:        `Simulated: Multiple failed login attempts from IP 192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      unauthorized_access: `Simulated: Unauthorized access attempt by user ${req.user.sub}`,
      suspicious_activity: `Simulated: Unusual pattern — ${Math.floor(Math.random()*50)+10} requests in 60 seconds`,
      account_locked:      `Simulated: Account temporarily locked after repeated failures`,
    };
    const { rows: [alert] } = await db.query(
      `INSERT INTO security_alerts (user_id, user_role, alert_type, alert_message, severity, status, ip_address)
       VALUES ($1,$2,$3,$4,$5,'open',$6) RETURNING *`,
      [req.user.sub, req.user.role, alertType, messages[alertType], severity,
       `10.0.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`]
    );
    await logActivity(req.user.sub, 'admin', 'ALERT_SIMULATED', `Type: ${alertType}, Severity: ${severity}`);
    res.status(201).json(alert);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/security-alerts/:id', auth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
  const { rows } = await db.query(
    'UPDATE security_alerts SET status=$1, resolved_at=$2 WHERE id=$3 RETURNING *',
    [status, resolvedAt, req.params.id]
  );
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// SYSTEM SETTINGS (admin only)
// ═══════════════════════════════════════════════════════════════

// PUT /api/users/:id/password — change password
app.put('/api/users/:id/password', auth, async (req, res) => {
  try {
    if (req.user.sub !== req.params.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });
    const { currentPassword, newPassword } = req.body;
    const { rows: [u] } = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const valid = (u.password === currentPassword) ||
      (u.password && u.password.includes(':') && currentPassword);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    await db.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [newPassword, req.params.id]);
    await logActivity(req.user.sub, req.user.role, 'PASSWORD_CHANGED', `User ${req.params.id}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/settings', auth, requireRole('admin'), async (req, res) => {
  const { rows } = await db.query("SELECT config FROM system_settings WHERE id='current_config'");
  res.json(rows[0]?.config || null);
});

app.post('/api/admin/settings', auth, requireRole('admin'), async (req, res) => {
  const { rows } = await db.query(
    `INSERT INTO system_settings (id, config) VALUES ('current_config', $1)
     ON CONFLICT (id) DO UPDATE SET config=$1, updated_at=NOW() RETURNING config`,
    [req.body]
  );
  res.json(rows[0].config);
});

// ═══════════════════════════════════════════════════════════════
// BANK ACCOUNTS
// ═══════════════════════════════════════════════════════════════

// GET /api/accounts — bank sees own accounts
app.get('/api/accounts', auth, requireRole('bank', 'admin'), async (req, res) => {
  try {
    const bankId = req.user.role === 'admin' ? (req.query.bankId || req.user.sub) : req.user.sub;
    const { rows } = await db.query(
      'SELECT * FROM bank_accounts WHERE bank_id=$1 ORDER BY created_at DESC',
      [bankId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts — create new account
app.post('/api/accounts', auth, requireRole('bank'), async (req, res) => {
  try {
    const { accountHolder, accountType, entityType, balance, linkedEntityId } = req.body;
    const accountNumber = String(Date.now()).slice(-10);
    const { rows } = await db.query(
      `INSERT INTO bank_accounts
         (bank_id, account_number, account_type, account_holder, entity_type, linked_entity_id, balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.sub, accountNumber, accountType, accountHolder, entityType, linkedEntityId || null, balance || 0]
    );
    await logActivity(req.user.sub, 'bank', 'ACCOUNT_CREATED', `Account for ${accountHolder}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/accounts/:id — update account details
app.put('/api/accounts/:id', auth, requireRole('bank'), async (req, res) => {
  try {
    const { accountHolder, accountType, entityType, balance } = req.body;
    const { rows } = await db.query(
      `UPDATE bank_accounts
       SET account_holder=$1, account_type=$2, entity_type=$3, balance=$4, updated_at=NOW()
       WHERE id=$5 AND bank_id=$6 RETURNING *`,
      [accountHolder, accountType, entityType, balance, req.params.id, req.user.sub]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    await logActivity(req.user.sub, 'bank', 'ACCOUNT_UPDATED', `Account ${req.params.id}`);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/:id/status — suspend or reactivate
app.patch('/api/accounts/:id/status', auth, requireRole('bank'), async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      `UPDATE bank_accounts SET status=$1, updated_at=NOW()
       WHERE id=$2 AND bank_id=$3 RETURNING *`,
      [status, req.params.id, req.user.sub]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    await logActivity(req.user.sub, 'bank', 'ACCOUNT_STATUS_CHANGED', `Account ${req.params.id} → ${status}`);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/:id
app.delete('/api/accounts/:id', auth, requireRole('bank'), async (req, res) => {
  try {
    await db.query(
      'DELETE FROM bank_accounts WHERE id=$1 AND bank_id=$2',
      [req.params.id, req.user.sub]
    );
    await logActivity(req.user.sub, 'bank', 'ACCOUNT_DELETED', `Account ${req.params.id}`);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// HEALTH METRICS (patient sees own, doctor sees patient's)
// ═══════════════════════════════════════════════════════════════

app.get('/api/health-metrics', auth, async (req, res) => {
  // Patients always see only their own metrics.
  // Doctors may pass ?patientId= but only if a valid active consent exists.
  let patientId;
  if (req.user.role === 'patient') {
    patientId = req.user.sub; // always own data, ignore any query param
  } else if (req.user.role === 'doctor' && req.query.patientId) {
    const { rows: consent } = await db.query(
      `SELECT 1 FROM consent_records
       WHERE patient_id=$1 AND granted_to=$2
         AND access_type IN ('medical','full')
         AND status='active' AND valid_until > NOW()
       LIMIT 1`,
      [req.query.patientId, req.user.sub]
    );
    if (!consent.length) return res.status(403).json({ error: 'No active consent for this patient' });
    patientId = req.query.patientId;
  } else {
    patientId = req.user.sub;
  }
  const { rows } = await db.query(
    'SELECT * FROM health_metrics WHERE patient_id=$1 ORDER BY timestamp DESC LIMIT 100',
    [patientId]
  );
  res.json(rows);
});

app.post('/api/health-metrics', auth, requireRole('patient'), async (req, res) => {
  const { type, value, unit, notes } = req.body;
  const { rows } = await db.query(
    `INSERT INTO health_metrics (patient_id, type, value, unit, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.sub, type, value, unit, notes]
  );
  res.status(201).json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════
// SYSTEM LOGS (admin / regulator)
// ═══════════════════════════════════════════════════════════════


// POST /api/logs  (client writes activity logs)
app.post('/api/logs', auth, async (req, res) => {
  const { userId, userRole, action, details } = req.body;
  try {
    await db.query(
      'INSERT INTO system_logs (user_id, user_role, action, details) VALUES ($1,$2,$3,$4)',
      [userId || req.user.sub, userRole || req.user.role, action, details]
    );
    res.status(201).json({ ok: true });
  } catch { res.status(201).json({ ok: true }); } // silent fail
});

app.get('/api/logs', auth, requireRole('admin', 'regulator'), async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 500'
  );
  res.json(rows);
});

// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN LOGS
// ═══════════════════════════════════════════════════════════════

app.get('/api/blockchain', auth, requireRole('admin', 'regulator'), async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM blockchain_logs ORDER BY timestamp ASC'
  );
  res.json(rows);
});

app.post('/api/blockchain', auth, async (req, res) => {
  const { recordId, userId, role, data, previousHash, hash, timestamp } = req.body;
  try {
    await db.query(
      `INSERT INTO blockchain_logs (record_id, user_id, role, data, previous_hash, hash, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (record_id) DO NOTHING`,
      [recordId, userId, role, data, previousHash, hash, new Date(timestamp).toISOString()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(409).json({ error: 'Duplicate record' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN STATS
// ═══════════════════════════════════════════════════════════════

// GET /api/regulator/stats
app.get('/api/regulator/stats', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const queries = await Promise.all([
      db.query('SELECT COUNT(*) FROM system_logs'),
      db.query('SELECT COUNT(*) FROM security_alerts'),
      db.query("SELECT COUNT(*) FROM security_alerts WHERE status='open'"),
      db.query("SELECT COUNT(*) FROM security_alerts WHERE severity='critical'"),
      db.query('SELECT COUNT(*) FROM blockchain_logs'),
      db.query('SELECT COUNT(*) FROM insurance_claims'),
      db.query("SELECT COUNT(*) FROM insurance_claims WHERE status='approved'"),
      db.query("SELECT COUNT(*) FROM insurance_claims WHERE status='rejected'"),
      db.query('SELECT COUNT(*) FROM bills'),
      db.query('SELECT COUNT(*) FROM payments'),
      db.query("SELECT COUNT(*) FROM payments WHERE status='completed'"),
      db.query("SELECT COUNT(*) FROM consent_records WHERE status='active'"),
      db.query('SELECT COUNT(*) FROM users'),
    ]);
    const totalClaims    = parseInt(queries[5].rows[0].count);
    const approvedClaims = parseInt(queries[6].rows[0].count);
    res.json({
      totalLogs:         parseInt(queries[0].rows[0].count),
      totalAlerts:       parseInt(queries[1].rows[0].count),
      openAlerts:        parseInt(queries[2].rows[0].count),
      criticalAlerts:    parseInt(queries[3].rows[0].count),
      blockchainLength:  parseInt(queries[4].rows[0].count),
      totalClaims,
      approvedClaims,
      rejectedClaims:    parseInt(queries[7].rows[0].count),
      claimApprovalRate: totalClaims > 0 ? ((approvedClaims/totalClaims)*100).toFixed(1) : '0',
      totalBills:        parseInt(queries[8].rows[0].count),
      totalPayments:     parseInt(queries[9].rows[0].count),
      completedPayments: parseInt(queries[10].rows[0].count),
      activeConsents:    parseInt(queries[11].rows[0].count),
      totalUsers:        parseInt(queries[12].rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', auth, requireRole('admin'), async (req, res) => {
  const queries = await Promise.all([
    db.query('SELECT COUNT(*) FROM users'),
    db.query("SELECT COUNT(*) FROM users WHERE role='patient'"),
    db.query("SELECT COUNT(*) FROM users WHERE role='doctor'"),
    db.query('SELECT COUNT(*) FROM appointments'),
    db.query('SELECT COUNT(*) FROM bills'),
    db.query('SELECT COUNT(*) FROM insurance_claims'),
    db.query('SELECT COUNT(*) FROM payments'),
    db.query('SELECT COUNT(*) FROM blockchain_logs'),
    db.query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 10'),
  ]);
  res.json({
    totalUsers:        parseInt(queries[0].rows[0].count),
    totalPatients:     parseInt(queries[1].rows[0].count),
    totalDoctors:      parseInt(queries[2].rows[0].count),
    totalAppointments: parseInt(queries[3].rows[0].count),
    totalBills:        parseInt(queries[4].rows[0].count),
    totalClaims:       parseInt(queries[5].rows[0].count),
    totalPayments:     parseInt(queries[6].rows[0].count),
    blockchainLength:  parseInt(queries[7].rows[0].count),
    recentActivity:    queries[8].rows,
  });
});


// ═══════════════════════════════════════════════════════════════
// ROOM BOOKINGS (patient requests → hospital approves)
// ═══════════════════════════════════════════════════════════════

// GET /api/room-bookings — patient sees own, hospital sees theirs
app.get('/api/room-bookings', auth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'patient') {
      const result = await db.query(
        `SELECT rb.*, hr.room_number, hr.room_type, hr.floor, hr.price_per_day,
                u.name AS hospital_name
         FROM room_bookings rb
         JOIN hospital_rooms hr ON hr.id = rb.room_id
         JOIN users u ON u.id = rb.hospital_id
         WHERE rb.patient_id = $1 ORDER BY rb.created_at DESC`,
        [req.user.sub]
      );
      rows = result.rows;
    } else if (req.user.role === 'hospital' || req.user.role === 'admin') {
      const result = await db.query(
        `SELECT rb.*, hr.room_number, hr.room_type, hr.floor, hr.price_per_day,
                u.name AS patient_name, u.email AS patient_email
         FROM room_bookings rb
         JOIN hospital_rooms hr ON hr.id = rb.room_id
         JOIN users u ON u.id = rb.patient_id
         WHERE rb.hospital_id = $1 ORDER BY rb.created_at DESC`,
        [req.user.sub]
      );
      rows = result.rows;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/room-bookings — patient creates booking request
app.post('/api/room-bookings', auth, requireRole('patient'), async (req, res) => {
  try {
    const { roomId, hospitalId, checkInDate, checkOutDate, reason, notes } = req.body;
    // Calculate cost
    const { rows: [room] } = await db.query('SELECT * FROM hospital_rooms WHERE id=$1', [roomId]);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.available_beds <= 0) return res.status(400).json({ error: 'No beds available in this room' });
    const days = Math.max(1, Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000*60*60*24)));
    const totalCost = parseFloat(room.price_per_day) * days;
    const { rows: [booking] } = await db.query(
      `INSERT INTO room_bookings (patient_id, hospital_id, room_id, check_in_date, check_out_date, reason, notes, total_cost, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [req.user.sub, hospitalId, roomId, checkInDate, checkOutDate, reason, notes || '', totalCost]
    );
    // Notify hospital
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'general')`,
      [hospitalId, 'New Room Booking Request',
       `A patient has requested Room ${room.room_number} from ${checkInDate} to ${checkOutDate}`]
    );
    await logActivity(req.user.sub, 'patient', 'ROOM_BOOKING_REQUESTED', `Room ${room.room_number}`);
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/room-bookings/:id — hospital approves/rejects
app.patch('/api/room-bookings/:id', auth, requireRole('hospital'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { status, notes } = req.body;
    const { rows: [booking] } = await client.query(
      `UPDATE room_bookings SET status=$1, notes=COALESCE($2,notes), approved_by=$3, approved_at=NOW(), updated_at=NOW()
       WHERE id=$4 AND hospital_id=$5 RETURNING *`,
      [status, notes, req.user.sub, req.params.id, req.user.sub]
    );
    if (!booking) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Booking not found' }); }
    // If approved, decrement available beds
    if (status === 'approved') {
      await client.query(
        'UPDATE hospital_rooms SET available_beds = GREATEST(0, available_beds - 1), updated_at=NOW() WHERE id=$1',
        [booking.room_id]
      );
    }
    // If rejected/cancelled after being approved, restore bed
    if ((status === 'rejected' || status === 'cancelled') && booking.status === 'approved') {
      await client.query(
        'UPDATE hospital_rooms SET available_beds = available_beds + 1, updated_at=NOW() WHERE id=$1',
        [booking.room_id]
      );
    }
    // Notify patient
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'general')`,
      [booking.patient_id,
       `Room Booking ${status.charAt(0).toUpperCase()+status.slice(1)}`,
       `Your room booking request has been ${status}`]
    );
    await client.query('COMMIT');
    await logActivity(req.user.sub, 'hospital', `ROOM_BOOKING_${status.toUpperCase()}`, `Booking ${req.params.id}`);
    res.json(booking);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PATCH /api/room-bookings/:id/cancel — patient cancels own booking
app.patch('/api/room-bookings/:id/cancel', auth, requireRole('patient'), async (req, res) => {
  try {
    const { rows: [booking] } = await db.query(
      `UPDATE room_bookings SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND patient_id=$2 AND status IN ('pending','approved') RETURNING *`,
      [req.params.id, req.user.sub]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
    if (booking.status === 'approved') {
      await db.query('UPDATE hospital_rooms SET available_beds = available_beds + 1, updated_at=NOW() WHERE id=$1', [booking.room_id]);
    }
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// SERVICE BOOKINGS (patient requests → hospital confirms)
// ═══════════════════════════════════════════════════════════════

app.get('/api/service-bookings', auth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'patient') {
      const result = await db.query(
        `SELECT sb.*, hs.service_name, hs.department, hs.duration, hs.base_price,
                u.name AS hospital_name
         FROM service_bookings sb
         JOIN hospital_services hs ON hs.id = sb.service_id
         JOIN users u ON u.id = sb.hospital_id
         WHERE sb.patient_id = $1 ORDER BY sb.created_at DESC`,
        [req.user.sub]
      );
      rows = result.rows;
    } else if (req.user.role === 'hospital' || req.user.role === 'admin') {
      const result = await db.query(
        `SELECT sb.*, hs.service_name, hs.department, hs.duration, hs.base_price,
                u.name AS patient_name, u.email AS patient_email
         FROM service_bookings sb
         JOIN hospital_services hs ON hs.id = sb.service_id
         JOIN users u ON u.id = sb.patient_id
         WHERE sb.hospital_id = $1 ORDER BY sb.created_at DESC`,
        [req.user.sub]
      );
      rows = result.rows;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/service-bookings', auth, requireRole('patient'), async (req, res) => {
  try {
    const { serviceId, hospitalId, preferredDate, preferredTime, notes } = req.body;
    const { rows: [service] } = await db.query('SELECT * FROM hospital_services WHERE id=$1', [serviceId]);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!service.is_active) return res.status(400).json({ error: 'Service is not currently available' });
    const { rows: [booking] } = await db.query(
      `INSERT INTO service_bookings (patient_id, hospital_id, service_id, preferred_date, preferred_time, notes, total_cost, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [req.user.sub, hospitalId, serviceId, preferredDate, preferredTime || '09:00', notes || '', service.base_price]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'general')`,
      [hospitalId, 'New Service Booking Request',
       `A patient has requested ${service.service_name} on ${preferredDate}`]
    );
    await logActivity(req.user.sub, 'patient', 'SERVICE_BOOKING_REQUESTED', `Service: ${service.service_name}`);
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/service-bookings/:id', auth, requireRole('hospital'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { rows: [booking] } = await db.query(
      `UPDATE service_bookings SET status=$1, notes=COALESCE($2,notes), approved_by=$3, approved_at=NOW(), updated_at=NOW()
       WHERE id=$4 AND hospital_id=$5 RETURNING *`,
      [status, notes, req.user.sub, req.params.id, req.user.sub]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'general')`,
      [booking.patient_id,
       `Service Booking ${status.charAt(0).toUpperCase()+status.slice(1)}`,
       `Your service booking has been ${status}`]
    );
    await logActivity(req.user.sub, 'hospital', `SERVICE_BOOKING_${status.toUpperCase()}`, `Booking ${req.params.id}`);
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/service-bookings/:id/cancel', auth, requireRole('patient'), async (req, res) => {
  try {
    const { rows: [booking] } = await db.query(
      `UPDATE service_bookings SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND patient_id=$2 AND status IN ('pending','confirmed') RETURNING *`,
      [req.params.id, req.user.sub]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/hospitals/public — any authenticated patient can browse hospitals + their rooms/services
app.get('/api/hospitals/public', auth, async (req, res) => {
  try {
    const { rows: hospitals } = await db.query(
      "SELECT id, name, email, address, phone FROM users WHERE role='hospital' ORDER BY name"
    );
    const { rows: rooms } = await db.query(
      "SELECT * FROM hospital_rooms WHERE status='active' ORDER BY hospital_id, room_number"
    );
    const { rows: services } = await db.query(
      "SELECT * FROM hospital_services WHERE is_active=true ORDER BY hospital_id, service_name"
    );
    res.json({ hospitals, rooms, services });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 QHC API running on http://localhost:${PORT}`);
  console.log('   Routes: /api/auth, /api/users, /api/appointments,');
  console.log('           /api/medical-records, /api/bills, /api/claims,');
  console.log('           /api/payments, /api/prescriptions, /api/consents,');
  console.log('           /api/loans, /api/policies, /api/refunds,');
  console.log('           /api/notifications, /api/blockchain, /api/logs');
});
// ═══════════════════════════════════════════════════════════════
// CLAIM DOCUMENTS — add these routes to server.js
// Place AFTER the existing /api/claims routes
// ═══════════════════════════════════════════════════════════════

// POST /api/claim-documents  — save documents collected during wizard
app.post('/api/claim-documents', auth, requireRole('patient', 'hospital'), async (req, res) => {
  const {
    claimId, billId, patientId, submittedByRole,
    patientName, patientPhone, patientAddress, dateOfBirth,
    policyNumber, insuranceCard, insuranceName,
    doctorName, doctorPrescription, diagnosis,
    hasBill, hasIdProof, hasPolicyCard, hasPrescription,
    detailsVerified, policyActive, coverageConfirmed,
    claimFormFilled, documentsArranged, supportingDocsAdded,
    notes,
  } = req.body;

  if (!billId || !patientId) {
    return res.status(400).json({ error: 'billId and patientId are required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO claim_documents (
        claim_id, bill_id, patient_id, submitted_by_role,
        patient_name, patient_phone, patient_address, date_of_birth,
        policy_number, insurance_card, insurance_name,
        doctor_name, doctor_prescription, diagnosis,
        has_bill, has_id_proof, has_policy_card, has_prescription,
        details_verified, policy_active, coverage_confirmed,
        claim_form_filled, documents_arranged, supporting_docs_added,
        notes
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,
        $22,$23,$24,
        $25
      )
      ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        claimId || null, billId, patientId, submittedByRole || req.user.role,
        patientName || '', patientPhone || '', patientAddress || '', dateOfBirth || null,
        policyNumber || '', insuranceCard || '', insuranceName || '',
        doctorName || '', doctorPrescription || '', diagnosis || '',
        hasBill ?? false, hasIdProof ?? false, hasPolicyCard ?? false, hasPrescription ?? false,
        detailsVerified ?? false, policyActive ?? false, coverageConfirmed ?? false,
        claimFormFilled ?? false, documentsArranged ?? false, supportingDocsAdded ?? false,
        notes || '',
      ]
    );

    // Mark claim as documents_collected
    if (claimId) {
      await db.query(
        `UPDATE insurance_claims SET documents_collected=true WHERE id=$1`,
        [claimId]
      );
    }

    await logActivity(req.user.sub, req.user.role, 'CLAIM_DOCS_SAVED', `Docs for bill ${billId}`);
    res.status(201).json(rows[0] || { message: 'Saved' });
  } catch (err) {
    console.error('Save claim docs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/claim-documents/:claimId  — fetch documents for a claim (insurance/admin/hospital)
app.get('/api/claim-documents/:claimId', auth, async (req, res) => {
  const allowed = ['insurance', 'admin', 'hospital', 'bank', 'regulator'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { rows } = await db.query(
      'SELECT * FROM claim_documents WHERE claim_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.params.claimId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No documents found for this claim' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/claim-documents/by-bill/:billId  — fetch docs by bill (fallback lookup)
app.get('/api/claim-documents/by-bill/:billId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM claim_documents WHERE bill_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.params.billId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No documents found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ═══════════════════════════════════════════════════════════════
// SECURITY ALERT INVESTIGATION ACTIONS
// Add these routes AFTER the existing PATCH /api/security-alerts/:id route
// ═══════════════════════════════════════════════════════════════

// POST /api/security-alerts/:id/actions/lock-user
// Locks the user account referenced by the alert for N minutes
app.post('/api/security-alerts/:id/actions/lock-user', auth, requireRole('admin'), async (req, res) => {
  try {
    const { minutes = 60 } = req.body;
    const { rows: [alert] } = await db.query('SELECT * FROM security_alerts WHERE id=$1', [req.params.id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!alert.user_id) return res.status(400).json({ error: 'Alert has no associated user ID' });

    const lockedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const { rows: [user] } = await db.query(
      'UPDATE users SET locked_until=$1, updated_at=NOW() WHERE id=$2 RETURNING id, email, name, role',
      [lockedUntil, alert.user_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found: ' + alert.user_id });

    await logActivity(req.user.sub, 'admin', 'USER_LOCKED',
      `Admin locked account ${user.email} for ${minutes}min — alert ${req.params.id}`);

    // Notify the user
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'alert')`,
      [alert.user_id,
       'Account Temporarily Locked',
       `Your account has been locked for ${minutes} minutes due to a security alert. Contact admin if this is an error.`]
    );

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role }, lockedUntil, minutes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/security-alerts/:id/actions/unlock-user
// Unlocks the user account — clear failed attempts too
app.post('/api/security-alerts/:id/actions/unlock-user', auth, requireRole('admin'), async (req, res) => {
  try {
    const { rows: [alert] } = await db.query('SELECT * FROM security_alerts WHERE id=$1', [req.params.id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!alert.user_id) return res.status(400).json({ error: 'Alert has no associated user ID' });

    const { rows: [user] } = await db.query(
      'UPDATE users SET locked_until=NULL, failed_login_attempts=0, updated_at=NOW() WHERE id=$1 RETURNING id, email, name, role',
      [alert.user_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logActivity(req.user.sub, 'admin', 'USER_UNLOCKED',
      `Admin unlocked account ${user.email} — alert ${req.params.id}`);

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'alert')`,
      [alert.user_id, 'Account Unlocked', 'Your account has been unlocked by an administrator.']
    );

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/security-alerts/:id/actions/reset-attempts
// Clears failed login attempts without locking
app.post('/api/security-alerts/:id/actions/reset-attempts', auth, requireRole('admin'), async (req, res) => {
  try {
    const { rows: [alert] } = await db.query('SELECT * FROM security_alerts WHERE id=$1', [req.params.id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!alert.user_id) return res.status(400).json({ error: 'Alert has no associated user ID' });

    const { rows: [user] } = await db.query(
      'UPDATE users SET failed_login_attempts=0, locked_until=NULL, updated_at=NOW() WHERE id=$1 RETURNING id, email, name, role, failed_login_attempts',
      [alert.user_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logActivity(req.user.sub, 'admin', 'LOGIN_ATTEMPTS_RESET',
      `Reset failed attempts for ${user.email} — alert ${req.params.id}`);

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/security-alerts/:id/actions/user-info
// Fetch current user status referenced in alert
app.get('/api/security-alerts/:id/actions/user-info', auth, requireRole('admin'), async (req, res) => {
  try {
    const { rows: [alert] } = await db.query('SELECT * FROM security_alerts WHERE id=$1', [req.params.id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!alert.user_id) return res.status(200).json({ user: null, message: 'No user ID on this alert' });

    const { rows: [user] } = await db.query(
      'SELECT id, email, name, role, failed_login_attempts, locked_until, last_login, created_at FROM users WHERE id=$1',
      [alert.user_id]
    );
    if (!user) return res.status(200).json({ user: null, message: 'User not found (may have been deleted)' });

    // Recent alerts for same user
    const { rows: recentAlerts } = await db.query(
      `SELECT alert_type, severity, status, created_at FROM security_alerts
       WHERE user_id=$1 AND id != $2 ORDER BY created_at DESC LIMIT 5`,
      [alert.user_id, req.params.id]
    );

    // Recent activity logs for user
    const { rows: recentLogs } = await db.query(
      `SELECT action, details, created_at FROM activity_logs
       WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5`,
      [alert.user_id]
    ).catch(() => ({ rows: [] }));

    res.json({
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        failedLoginAttempts: user.failed_login_attempts,
        lockedUntil: user.locked_until,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        isCurrentlyLocked: user.locked_until && new Date(user.locked_until) > new Date(),
      },
      recentAlerts,
      recentLogs,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/security-alerts/:id/actions/notify-user
// Send a security notification to the user
app.post('/api/security-alerts/:id/actions/notify-user', auth, requireRole('admin'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const { rows: [alert] } = await db.query('SELECT * FROM security_alerts WHERE id=$1', [req.params.id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!alert.user_id) return res.status(400).json({ error: 'Alert has no associated user ID' });

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'alert')`,
      [alert.user_id, 'Security Notice from Admin', message]
    );

    await logActivity(req.user.sub, 'admin', 'SECURITY_NOTICE_SENT',
      `Sent notice to user ${alert.user_id} — alert ${req.params.id}`);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/security-alerts/:id/actions/force-logout
// Invalidate sessions by clearing last_login (forces re-auth on next request)
app.post('/api/security-alerts/:id/actions/force-logout', auth, requireRole('admin'), async (req, res) => {
  try {
    const { rows: [alert] } = await db.query('SELECT * FROM security_alerts WHERE id=$1', [req.params.id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!alert.user_id) return res.status(400).json({ error: 'Alert has no associated user ID' });

    // Lock briefly (1 min) to break active sessions + clear attempts
    const { rows: [user] } = await db.query(
      `UPDATE users SET locked_until=NOW() + INTERVAL '1 minute',
       failed_login_attempts=0, updated_at=NOW()
       WHERE id=$1 RETURNING id, email, name, role`,
      [alert.user_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logActivity(req.user.sub, 'admin', 'USER_FORCE_LOGOUT',
      `Force-logged out ${user.email} — alert ${req.params.id}`);

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'alert')`,
      [alert.user_id, 'Session Terminated', 'Your session was terminated by an administrator for security reasons. Please log in again.']
    );

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN ISSUE REPORTING & ADMIN ACTIONS
// Add these routes to server.js AFTER the existing POST /api/blockchain route
// ═══════════════════════════════════════════════════════════════

// POST /api/blockchain/report-issue
// Called by Regulator when they detect chain tampering — creates a security alert + system log
app.post('/api/blockchain/report-issue', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const { brokenAt, affectedCount, totalBlocks, severity = 'critical', description } = req.body;

    const message = description ||
      `Blockchain integrity failure detected by ${req.user.role}. ` +
      `Chain broken at block #${brokenAt} of ${totalBlocks} total. ` +
      `${affectedCount || 1} block(s) affected. Records may have been tampered with.`;

    const { rows: [alert] } = await db.query(
      `INSERT INTO security_alerts
         (user_id, user_role, alert_type, alert_message, severity, status, ip_address)
       VALUES ($1,$2,'data_breach',$3,$4,'open',$5) RETURNING *`,
      [req.user.sub, req.user.role, message, severity,
       req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown']
    );

    await logActivity(req.user.sub, req.user.role, 'BLOCKCHAIN_INTEGRITY_FAILURE',
      `Block #${brokenAt} broken. Total blocks: ${totalBlocks}.`);

    const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'alert')`,
        [admin.id,
         'Blockchain Integrity Failure Detected',
         `Chain broken at block #${brokenAt}/${totalBlocks}. Reported by ${req.user.role}. Action required.`]
      );
    }

    res.status(201).json({ success: true, alertId: alert.id, alert });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/blockchain/issues
// Returns all blockchain-related security alerts
app.get('/api/blockchain/issues', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM security_alerts WHERE alert_type = 'data_breach' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/blockchain/verify-full
// Server-side full chain verification
app.post('/api/blockchain/verify-full', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const { rows: blocks } = await db.query('SELECT * FROM blockchain_logs ORDER BY timestamp ASC');

    if (blocks.length === 0) return res.json({ valid: true, totalBlocks: 0, brokenBlocks: [], verifiedAt: new Date() });

    const brokenBlocks = [];
    for (let i = 1; i < blocks.length; i++) {
      const cur  = blocks[i];
      const prev = blocks[i - 1];
      if (cur.previous_hash !== prev.hash) {
        brokenBlocks.push({
          blockIndex:       i,
          recordId:         cur.record_id,
          role:             cur.role,
          userId:           cur.user_id,
          timestamp:        cur.timestamp,
          expectedPrevHash: prev.hash,
          actualPrevHash:   cur.previous_hash,
          currentHash:      cur.hash,
        });
      }
    }

    const valid = brokenBlocks.length === 0;
    await logActivity(req.user.sub, req.user.role, 'BLOCKCHAIN_VERIFIED',
      `Verification: ${valid ? 'VALID' : 'BROKEN'} — ${blocks.length} blocks, ${brokenBlocks.length} broken`);

    res.json({ valid, totalBlocks: blocks.length, brokenBlocks, verifiedAt: new Date(), verifiedBy: req.user.sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/blockchain/issues/:id/status
// Admin resolves or acknowledges a blockchain issue
app.patch('/api/blockchain/issues/:id/status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    const { rows: [alert] } = await db.query(
      'UPDATE security_alerts SET status=$1, resolved_at=$2 WHERE id=$3 RETURNING *',
      [status, resolvedAt, req.params.id]
    );
    if (!alert) return res.status(404).json({ error: 'Issue not found' });
    await logActivity(req.user.sub, 'admin', 'BLOCKCHAIN_ISSUE_' + status.toUpperCase(),
      `Alert ${req.params.id} → ${status}${note ? '. Note: ' + note : ''}`);
    res.json({ success: true, alert });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/blockchain/stats
app.get('/api/blockchain/stats', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const [total, byRole, recent, openIssues] = await Promise.all([
      db.query('SELECT COUNT(*) FROM blockchain_logs'),
      db.query('SELECT role, COUNT(*) as count FROM blockchain_logs GROUP BY role ORDER BY count DESC'),
      db.query('SELECT * FROM blockchain_logs ORDER BY timestamp DESC LIMIT 5'),
      db.query("SELECT COUNT(*) FROM security_alerts WHERE alert_type='data_breach' AND status='open'"),
    ]);
    res.json({
      totalBlocks:  parseInt(total.rows[0].count),
      byRole:       byRole.rows,
      recentBlocks: recent.rows,
      openIssues:   parseInt(openIssues.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN ISSUE REPORTING & ADMIN ACTIONS
// Paste these routes into server.js AFTER the existing
// POST /api/blockchain route (around line 1510)
// ═══════════════════════════════════════════════════════════════

// POST /api/blockchain/report-issue
// Called by Regulator when chain tampering is detected.
// Creates a security alert, writes to system_logs, notifies all admins.
app.post('/api/blockchain/report-issue', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const { brokenAt = 0, affectedCount = 1, totalBlocks = 0, severity = 'critical', description } = req.body;

    const message = description ||
      `Blockchain integrity failure detected by ${req.user.role}. ` +
      `Chain broken at block #${brokenAt} of ${totalBlocks} total. ` +
      `${affectedCount} block(s) affected. Records may have been tampered with.`;

    const { rows: [alert] } = await db.query(
      `INSERT INTO security_alerts
         (user_id, user_role, alert_type, alert_message, severity, status, ip_address)
       VALUES ($1, $2, 'data_breach', $3, $4, 'open', $5) RETURNING *`,
      [
        req.user.sub, req.user.role, message, severity,
        req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      ]
    );

    await logActivity(
      req.user.sub, req.user.role,
      'BLOCKCHAIN_INTEGRITY_FAILURE',
      `Block #${brokenAt} broken. Total blocks: ${totalBlocks}.`
    );

    // Notify every admin user
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'alert')`,
        [
          admin.id,
          'Blockchain Integrity Failure Detected',
          `Chain broken at block #${brokenAt} / ${totalBlocks}. Reported by ${req.user.role}. Action required.`,
        ]
      );
    }

    res.status(201).json({ success: true, alertId: alert.id, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blockchain/issues
// Returns all data_breach security alerts (blockchain integrity reports).
app.get('/api/blockchain/issues', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM security_alerts
       WHERE alert_type = 'data_breach'
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/blockchain/verify-full
// Server-side full chain verification — re-reads all rows and checks hash linkage.
app.post('/api/blockchain/verify-full', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const { rows: blocks } = await db.query(
      'SELECT * FROM blockchain_logs ORDER BY timestamp ASC'
    );

    if (blocks.length === 0) {
      return res.json({ valid: true, totalBlocks: 0, brokenBlocks: [], verifiedAt: new Date() });
    }

    const brokenBlocks = [];
    for (let i = 1; i < blocks.length; i++) {
      const cur  = blocks[i];
      const prev = blocks[i - 1];
      if (cur.previous_hash !== prev.hash) {
        brokenBlocks.push({
          blockIndex:       i,
          recordId:         cur.record_id,
          role:             cur.role,
          userId:           cur.user_id,
          timestamp:        cur.timestamp,
          expectedPrevHash: prev.hash,
          actualPrevHash:   cur.previous_hash,
          currentHash:      cur.hash,
        });
      }
    }

    const valid = brokenBlocks.length === 0;

    await logActivity(
      req.user.sub, req.user.role,
      'BLOCKCHAIN_VERIFIED',
      `Verification: ${valid ? 'VALID' : 'BROKEN'} — ${blocks.length} blocks, ${brokenBlocks.length} broken`
    );

    res.json({
      valid,
      totalBlocks:  blocks.length,
      brokenBlocks,
      verifiedAt:   new Date(),
      verifiedBy:   req.user.sub,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/blockchain/issues/:id/status
// Admin resolves or acknowledges a blockchain issue alert.
app.patch('/api/blockchain/issues/:id/status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

    const { rows: [alert] } = await db.query(
      'UPDATE security_alerts SET status = $1, resolved_at = $2 WHERE id = $3 RETURNING *',
      [status, resolvedAt, req.params.id]
    );

    if (!alert) return res.status(404).json({ error: 'Issue not found' });

    await logActivity(
      req.user.sub, 'admin',
      'BLOCKCHAIN_ISSUE_' + status.toUpperCase(),
      `Alert ${req.params.id} → ${status}${note ? '. Note: ' + note : ''}`
    );

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blockchain/stats
// Aggregated blockchain health: total blocks, breakdown by role, open issue count.
app.get('/api/blockchain/stats', auth, requireRole('admin', 'regulator'), async (req, res) => {
  try {
    const [totalRes, byRoleRes, recentRes, openIssuesRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM blockchain_logs'),
      db.query('SELECT role, COUNT(*) AS count FROM blockchain_logs GROUP BY role ORDER BY count DESC'),
      db.query('SELECT * FROM blockchain_logs ORDER BY timestamp DESC LIMIT 5'),
      db.query("SELECT COUNT(*) FROM security_alerts WHERE alert_type = 'data_breach' AND status = 'open'"),
    ]);

    res.json({
      totalBlocks:  parseInt(totalRes.rows[0].count, 10),
      byRole:       byRoleRes.rows,
      recentBlocks: recentRes.rows,
      openIssues:   parseInt(openIssuesRes.rows[0].count, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});