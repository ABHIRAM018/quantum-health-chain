-- ================================================================
-- Quantum Health Chain — Seed Data
-- Run AFTER schema.sql:
--   psql -U postgres -d quantum_health_chain -f seed.sql
--
-- Passwords are bcrypt hashes of 'password123'
-- ================================================================

-- Clear existing data (safe re-run)
TRUNCATE notifications, system_logs, blockchain_logs, security_alerts,
         prescription_medicines, prescriptions, consent_records,
         medical_loans, insurance_policies, refunds,
         payments, insurance_claims, bill_items, bills,
         lab_reports, patient_admissions, hospital_services,
         hospital_rooms, medical_records, appointments, users
CASCADE;

-- ─── USERS ───────────────────────────────────────────────────
-- bcrypt hash of 'password123' (cost 10)
INSERT INTO users (id, email, password_hash, role, name, phone, address) VALUES
-- Patients
('a1000000-0000-0000-0000-000000000001', 'john.doe@email.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'patient',
 'John Doe', '+1-555-0123', '123 Main St, City, State 12345'),

('a1000000-0000-0000-0000-000000000002', 'jane.smith@email.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'patient',
 'Jane Smith', '+1-555-0125', '456 Oak Ave, City, State 12345'),

-- Hospital (must exist before doctors reference it)
('a3000000-0000-0000-0000-000000000001', 'admin@cityhospital.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'hospital',
 'City General Hospital', '+1-555-0200', '789 Hospital Blvd, City, State 12345'),

-- Doctors
('a2000000-0000-0000-0000-000000000001', 'dr.wilson@hospital.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'doctor',
 'Dr. Sarah Wilson', '+1-555-0301', NULL),

('a2000000-0000-0000-0000-000000000002', 'dr.johnson@hospital.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'doctor',
 'Dr. Michael Johnson', '+1-555-0302', NULL),

-- Insurance
('a4000000-0000-0000-0000-000000000001', 'claims@healthinsure.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'insurance',
 'HealthInsure Corp', '+1-555-0400', '100 Insurance Ave'),

-- Bank
('a5000000-0000-0000-0000-000000000001', 'payments@nationalbank.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'bank',
 'National Bank', '+1-555-0500', '200 Finance St'),

-- Admin
('a6000000-0000-0000-0000-000000000001', 'admin@healthcare.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'admin',
 'System Administrator', '+1-555-0600', NULL),

-- Regulator
('a7000000-0000-0000-0000-000000000001', 'regulator@gov.health.com',
 '$2b$10$AYeMAcCSVDu.SkT5RySOPuhQixRqeR3ZFSDIMhmfHQkaWBBze/LWG', 'regulator',
 'Health Regulatory Authority', '+1-555-0700', NULL);

-- ─── DOCTOR EXTRA FIELDS (stored in users.address/phone for now) ─
-- Doctor specialization is stored in the users table via extra columns
-- The server.js /api/users/role/doctor endpoint returns all columns
-- Add extra columns to users table for doctor-specific fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='specialization') THEN
    ALTER TABLE users ADD COLUMN specialization TEXT;
    ALTER TABLE users ADD COLUMN license_number TEXT;
    ALTER TABLE users ADD COLUMN hospital_id UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN consultation_fee NUMERIC(10,2) DEFAULT 0;
    ALTER TABLE users ADD COLUMN date_of_birth DATE;
    ALTER TABLE users ADD COLUMN emergency_contact TEXT;
    ALTER TABLE users ADD COLUMN insurance_id UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE users ADD COLUMN bank_name TEXT;
    ALTER TABLE users ADD COLUMN routing_number TEXT;
    ALTER TABLE users ADD COLUMN company_name TEXT;
    ALTER TABLE users ADD COLUMN total_beds INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN available_beds INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update doctor-specific fields
UPDATE users SET
  specialization = 'Cardiology',
  license_number = 'MD-12345',
  hospital_id = 'a3000000-0000-0000-0000-000000000001',
  experience = 10,
  consultation_fee = 200
WHERE id = 'a2000000-0000-0000-0000-000000000001';

UPDATE users SET
  specialization = 'Orthopedics',
  license_number = 'MD-12346',
  hospital_id = 'a3000000-0000-0000-0000-000000000001',
  experience = 15,
  consultation_fee = 250
WHERE id = 'a2000000-0000-0000-0000-000000000002';

-- Update hospital-specific fields
UPDATE users SET
  total_beds = 500,
  available_beds = 45
WHERE id = 'a3000000-0000-0000-0000-000000000001';

-- Update patient-specific fields
UPDATE users SET
  date_of_birth = '1990-05-15',
  emergency_contact = '+1-555-0124',
  insurance_id = 'a4000000-0000-0000-0000-000000000001'
WHERE id = 'a1000000-0000-0000-0000-000000000001';

UPDATE users SET
  date_of_birth = '1985-08-22',
  emergency_contact = '+1-555-0126'
WHERE id = 'a1000000-0000-0000-0000-000000000002';

-- Update bank/insurance-specific fields
UPDATE users SET bank_name = 'National Bank', routing_number = '021000021'
WHERE id = 'a5000000-0000-0000-0000-000000000001';

UPDATE users SET company_name = 'HealthInsure Corp'
WHERE id = 'a4000000-0000-0000-0000-000000000001';

-- ─── HOSPITAL ROOMS ──────────────────────────────────────────
INSERT INTO hospital_rooms (hospital_id, room_number, room_type, total_beds, available_beds, floor, price_per_day, amenities) VALUES
('a3000000-0000-0000-0000-000000000001', '101', 'general',  4, 2, 1, 150.00, ARRAY['TV','WiFi']),
('a3000000-0000-0000-0000-000000000001', '201', 'private',  1, 1, 2, 350.00, ARRAY['TV','WiFi','AC','Sofa']),
('a3000000-0000-0000-0000-000000000001', '301', 'icu',      2, 1, 3, 800.00, ARRAY['Monitoring','Ventilator']),
('a3000000-0000-0000-0000-000000000001', '001', 'emergency', 6, 3, 1, 500.00, ARRAY['Emergency Equipment']);

-- ─── HOSPITAL SERVICES ───────────────────────────────────────
INSERT INTO hospital_services (hospital_id, service_name, description, department, base_price, duration) VALUES
('a3000000-0000-0000-0000-000000000001', 'General Consultation', 'Outpatient doctor consultation', 'General', 200.00, 30),
('a3000000-0000-0000-0000-000000000001', 'ECG Test',             'Electrocardiogram test',         'Cardiology', 150.00, 20),
('a3000000-0000-0000-0000-000000000001', 'Blood Test',           'Complete blood count',           'Pathology', 100.00, 15),
('a3000000-0000-0000-0000-000000000001', 'X-Ray',                'Chest or limb X-ray',            'Radiology', 200.00, 20),
('a3000000-0000-0000-0000-000000000001', 'Knee Surgery',         'Arthroscopic knee surgery',      'Orthopedics', 5000.00, 120);

SELECT 'Seed complete. All passwords are: password123' AS result;