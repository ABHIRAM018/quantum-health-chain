-- ================================================================
-- Quantum Health Chain — PostgreSQL Schema
-- Run this file against your PostgreSQL database:
--   psql -U postgres -d quantum_health_chain -f schema.sql
-- ================================================================

-- Create database (run separately as superuser if needed):
-- CREATE DATABASE quantum_health_chain;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL CHECK (role IN ('patient','doctor','hospital','insurance','bank','admin','regulator')),
  name                  TEXT NOT NULL,
  phone                 TEXT,
  address               TEXT,
  email_verified        BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ─── HOSPITAL ROOMS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_number     TEXT NOT NULL,
  room_type       TEXT NOT NULL CHECK (room_type IN ('general','private','icu','emergency','surgery')),
  total_beds      INTEGER NOT NULL DEFAULT 1,
  available_beds  INTEGER NOT NULL DEFAULT 1,
  floor           INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','closed')),
  amenities       TEXT[] DEFAULT '{}',
  price_per_day   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_hospital ON hospital_rooms(hospital_id);

-- ─── HOSPITAL SERVICES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_name  TEXT NOT NULL,
  description   TEXT DEFAULT '',
  department    TEXT NOT NULL,
  base_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  requirements  TEXT[] DEFAULT '{}',
  duration      INTEGER DEFAULT 30,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_hospital ON hospital_services(hospital_id);

-- ─── APPOINTMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_time   TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  reason      TEXT NOT NULL DEFAULT '',
  diagnosis   TEXT,
  prescription TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor   ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(date_time);

-- ─── MEDICAL RECORDS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis       TEXT NOT NULL DEFAULT '',
  prescription    TEXT NOT NULL DEFAULT '',
  notes           TEXT DEFAULT '',
  attachments     TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_records_doctor  ON medical_records(doctor_id);

-- ─── LAB REPORTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_type     TEXT NOT NULL,
  test_date     TIMESTAMPTZ DEFAULT NOW(),
  results       TEXT NOT NULL DEFAULT '',
  normal_range  TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','reviewed')),
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_patient  ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_hospital ON lab_reports(hospital_id);

-- ─── PATIENT ADMISSIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_admissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id           UUID REFERENCES hospital_rooms(id) ON DELETE SET NULL,
  admission_date    TIMESTAMPTZ DEFAULT NOW(),
  discharge_date    TIMESTAMPTZ,
  reason            TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted','discharged','transferred')),
  emergency_contact TEXT DEFAULT '',
  insurance_info    TEXT,
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admissions_hospital ON patient_admissions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient  ON patient_admissions(patient_id);

-- ─── BILLS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','paid')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add doctor_id if upgrading existing DB
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='doctor_id') THEN
    ALTER TABLE bills ADD COLUMN doctor_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bills_patient  ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_hospital ON bills(hospital_id);

-- ─── BILL ITEMS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total       NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);

-- ─── INSURANCE CLAIMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id           UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  insurance_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected')),
  approval_letter   TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_patient   ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_insurance ON insurance_claims(insurance_id);

-- ─── PAYMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  bank_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','completed','failed')),
  transaction_id  TEXT,
  receipt         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_bank    ON payments(bank_id);
CREATE INDEX IF NOT EXISTS idx_payments_hospital ON payments(hospital_id);

-- ─── SYSTEM LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  user_role   TEXT NOT NULL,
  action      TEXT NOT NULL,
  details     TEXT DEFAULT '',
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_user      ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp DESC);

-- ─── CONSENT RECORDS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_to      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_to_role TEXT NOT NULL,
  access_type     TEXT NOT NULL CHECK (access_type IN ('medical','financial','full')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  valid_until     TIMESTAMPTZ NOT NULL,
  reason          TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_patient ON consent_records(patient_id);

-- ─── PRESCRIPTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id   UUID REFERENCES appointments(id) ON DELETE SET NULL,
  notes            TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  refills_allowed  INTEGER DEFAULT 1,
  refills_used     INTEGER DEFAULT 0,
  blockchain_hash  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor  ON prescriptions(doctor_id);

-- ─── PRESCRIPTION MEDICINES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_medicines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name   TEXT NOT NULL,
  dosage          TEXT NOT NULL,
  frequency       TEXT NOT NULL,
  duration        TEXT NOT NULL,
  instructions    TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_medicines_prescription ON prescription_medicines(prescription_id);

-- ─── SECURITY ALERTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,
  user_role     TEXT,
  alert_type    TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  severity      TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved')),
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_status   ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON security_alerts(severity);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  action_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, read);

-- ─── MEDICAL LOANS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_loans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  purpose         TEXT NOT NULL,
  interest_rate   NUMERIC(5,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','repaying','completed')),
  monthly_emi     NUMERIC(12,2) NOT NULL,
  amount_paid     NUMERIC(12,2) DEFAULT 0,
  applied_on      TIMESTAMPTZ DEFAULT NOW(),
  approved_on     TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_loans_bank    ON medical_loans(bank_id);
CREATE INDEX IF NOT EXISTS idx_loans_patient ON medical_loans(patient_id);

-- ─── INSURANCE POLICIES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_name       TEXT NOT NULL,
  policy_type       TEXT NOT NULL CHECK (policy_type IN ('basic','premium','family','senior','critical')),
  coverage_amount   NUMERIC(14,2) NOT NULL,
  premium_monthly   NUMERIC(10,2) NOT NULL,
  deductible        NUMERIC(10,2) DEFAULT 0,
  covered_services  TEXT[] DEFAULT '{}',
  network_hospitals TEXT[] DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_insurance ON insurance_policies(insurance_id);

-- ─── REFUNDS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  reason          TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('full','partial')),
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','completed','rejected')),
  transaction_id  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_bank    ON refunds(bank_id);
CREATE INDEX IF NOT EXISTS idx_refunds_patient ON refunds(patient_id);

-- ─── HEALTH METRICS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('blood_pressure','heart_rate','temperature','weight','blood_sugar')),
  value       TEXT NOT NULL,
  unit        TEXT NOT NULL,
  notes       TEXT,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_patient ON health_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_type    ON health_metrics(type);

-- ─── SYSTEM SETTINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id          TEXT PRIMARY KEY DEFAULT 'current_config',
  config      JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BLOCKCHAIN LOGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blockchain_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id     TEXT NOT NULL UNIQUE,
  user_id       TEXT NOT NULL,
  role          TEXT NOT NULL,
  data          TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  hash          TEXT NOT NULL UNIQUE,
  timestamp     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_hash      ON blockchain_logs(hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_timestamp ON blockchain_logs(timestamp ASC);

-- ─── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','hospital_rooms','hospital_services',
    'patient_admissions','consent_records','prescriptions','insurance_policies'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || t || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t
      );
    END IF;
  END LOOP;
END $$;

-- ─── SEED: default admin user ────────────────────────────────
-- Password: admin123  (bcrypt hash — change in production)
INSERT INTO users (email, password_hash, role, name)
VALUES (
  'admin@healthcare.com',
  '$2b$10$MnJyGSF6EQi6nq1cvhWCfuHLz6YzEFpj5/DYoRWUz6tVg1F3FKGRi',  -- admin123
  'admin',
  'System Administrator'
) ON CONFLICT (email) DO NOTHING;

-- Password: password123
INSERT INTO users (email, password_hash, role, name, phone, address)
VALUES
  ('john.doe@email.com',        '$2b$10$qpkExyjz8lWUf0gWp1sZFOpiFIfhjvV38IcEIRAg2Z3K6s7/5z6Na', 'patient',   'John Doe',             '+1-555-0123', '123 Main St'),
  ('dr.wilson@hospital.com',    '$2b$10$qpkExyjz8lWUf0gWp1sZFOpiFIfhjvV38IcEIRAg2Z3K6s7/5z6Na', 'doctor',    'Dr. Sarah Wilson',     '+1-555-0200', NULL),
  ('admin@cityhospital.com',    '$2b$10$qpkExyjz8lWUf0gWp1sZFOpiFIfhjvV38IcEIRAg2Z3K6s7/5z6Na', 'hospital',  'City General Hospital', '+1-555-0300', '456 Hospital Ave'),
  ('claims@healthinsure.com',   '$2b$10$qpkExyjz8lWUf0gWp1sZFOpiFIfhjvV38IcEIRAg2Z3K6s7/5z6Na', 'insurance', 'HealthInsure Co',      '+1-555-0400', NULL),
  ('payments@nationalbank.com', '$2b$10$qpkExyjz8lWUf0gWp1sZFOpiFIfhjvV38IcEIRAg2Z3K6s7/5z6Na', 'bank',      'National Bank',        '+1-555-0500', NULL),
  ('regulator@healthgov.in',    '$2b$10$qpkExyjz8lWUf0gWp1sZFOpiFIfhjvV38IcEIRAg2Z3K6s7/5z6Na', 'regulator', 'Health Regulator',     '+1-555-0600', NULL)
ON CONFLICT (email) DO NOTHING;