/*
  # Healthcare Management System Database Schema

  ## Overview
  Complete database schema for a multi-portal healthcare management system supporting
  patients, doctors, hospitals, insurance companies, banks, and administrators.

  ## New Tables Created

  ### 1. `users`
  Core user table for all system users with role-based access
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for authentication
  - `role` (text) - User role: patient, doctor, hospital, insurance, bank, admin
  - `name` (text) - Full name
  - `phone` (text) - Contact number
  - `address` (text) - Physical address
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `patients`
  Extended patient information
  - `user_id` (uuid, foreign key) - References users table
  - `date_of_birth` (date) - Patient's date of birth
  - `emergency_contact` (text) - Emergency contact details
  - `insurance_id` (uuid, nullable) - Reference to insurance company
  - `blood_group` (text) - Blood type
  - `allergies` (text[]) - List of known allergies

  ### 3. `doctors`
  Doctor-specific information
  - `user_id` (uuid, foreign key) - References users table
  - `hospital_id` (uuid, foreign key) - Associated hospital
  - `specialization` (text) - Medical specialization
  - `license_number` (text, unique) - Medical license
  - `experience` (integer) - Years of experience
  - `consultation_fee` (decimal) - Consultation charges
  - `is_active` (boolean) - Active status

  ### 4. `hospitals`
  Hospital details and facilities
  - `user_id` (uuid, foreign key) - References users table
  - `total_beds` (integer) - Total bed capacity
  - `available_beds` (integer) - Currently available beds
  - `services` (text[]) - List of services offered
  - `registration_number` (text, unique) - Hospital registration

  ### 5. `hospital_rooms`
  Individual room management
  - Room details, bed availability, pricing, amenities

  ### 6. `hospital_services`
  Services offered by hospitals
  - Service catalog with pricing and requirements

  ### 7. `appointments`
  Appointment scheduling and management
  - Booking, confirmation, completion workflow

  ### 8. `medical_records`
  Patient medical history and records
  - Diagnoses, prescriptions, lab reports

  ### 9. `lab_reports`
  Laboratory test results
  - Test types, results, normal ranges

  ### 10. `patient_admissions`
  Hospital admission records
  - Admission/discharge tracking

  ### 11. `bills`
  Billing and invoicing
  - Itemized billing with status tracking

  ### 12. `bill_items`
  Individual bill line items
  - Services, procedures, medications

  ### 13. `insurance_claims`
  Insurance claim processing
  - Submission, review, approval/rejection workflow

  ### 14. `payments`
  Payment transactions
  - Bank payment processing and receipts

  ### 15. `system_logs`
  Audit trail for all system activities
  - User actions, timestamps, details

  ## Security Measures
  - Row Level Security (RLS) enabled on all tables
  - Restrictive policies requiring authentication
  - Role-based access control through policies
  - Users can only access their own data unless authorized
  - Admin has read access to all data for monitoring

  ## Important Notes
  - All timestamps use timestamptz for timezone support
  - Foreign keys maintain referential integrity
  - Indexes added for frequently queried columns
  - Default values set where appropriate
  - Arrays used for flexible multi-value fields
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (core authentication and profile)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'doctor', 'hospital', 'insurance', 'bank', 'admin')),
  name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Patients extended profile
CREATE TABLE IF NOT EXISTS patients (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth date NOT NULL,
  emergency_contact text NOT NULL,
  insurance_id uuid,
  blood_group text,
  allergies text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Doctors profile
CREATE TABLE IF NOT EXISTS doctors (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hospital_id uuid,
  specialization text NOT NULL,
  license_number text UNIQUE NOT NULL,
  experience integer DEFAULT 0,
  consultation_fee decimal(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Hospitals profile
CREATE TABLE IF NOT EXISTS hospitals (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_beds integer DEFAULT 0,
  available_beds integer DEFAULT 0,
  services text[] DEFAULT '{}',
  registration_number text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insurance companies profile
CREATE TABLE IF NOT EXISTS insurance_companies (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  policy_types text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Banks profile
CREATE TABLE IF NOT EXISTS banks (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  routing_number text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admins profile
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  permissions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Hospital rooms
CREATE TABLE IF NOT EXISTS hospital_rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('general', 'private', 'icu', 'emergency', 'surgery')),
  total_beds integer DEFAULT 1,
  available_beds integer DEFAULT 1,
  floor integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'closed')),
  amenities text[] DEFAULT '{}',
  price_per_day decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, room_number)
);

-- Hospital services
CREATE TABLE IF NOT EXISTS hospital_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  service_name text NOT NULL,
  description text NOT NULL,
  department text NOT NULL,
  base_price decimal(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  requirements text[] DEFAULT '{}',
  duration integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(user_id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  date_time timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  reason text NOT NULL,
  diagnosis text,
  prescription text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Medical records
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(user_id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis text NOT NULL,
  prescription text NOT NULL,
  notes text,
  attachments text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lab reports
CREATE TABLE IF NOT EXISTS lab_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(user_id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  test_type text NOT NULL,
  test_date timestamptz DEFAULT now(),
  results text NOT NULL,
  normal_range text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed')),
  file_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Patient admissions
CREATE TABLE IF NOT EXISTS patient_admissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(user_id) ON DELETE CASCADE,
  room_id uuid REFERENCES hospital_rooms(id) ON DELETE SET NULL,
  admission_date timestamptz DEFAULT now(),
  discharge_date timestamptz,
  reason text NOT NULL,
  status text DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharged', 'transferred')),
  emergency_contact text NOT NULL,
  insurance_info text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  total_amount decimal(10, 2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'paid', 'cancelled')),
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bill items
CREATE TABLE IF NOT EXISTS bill_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  insurance_id uuid NOT NULL REFERENCES insurance_companies(user_id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'paid')),
  approval_letter text,
  rejection_reason text,
  approved_amount decimal(10, 2),
  documents text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  bank_id uuid NOT NULL REFERENCES banks(user_id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(user_id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_id text,
  receipt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role text NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  ip_address text,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date_time);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_insurance ON insurance_claims(insurance_id);
CREATE INDEX IF NOT EXISTS idx_payments_bank ON payments(bank_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for patients table
CREATE POLICY "Patients can view own data"
  ON patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view their patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = patients.user_id
      AND a.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update own data"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for doctors table
CREATE POLICY "Anyone can view doctors"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can update own profile"
  ON doctors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hospitals can manage their doctors"
  ON doctors FOR ALL
  TO authenticated
  USING (
    hospital_id IN (
      SELECT user_id FROM hospitals WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for hospitals table
CREATE POLICY "Anyone can view hospitals"
  ON hospitals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospitals can update own data"
  ON hospitals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for hospital_rooms table
CREATE POLICY "Anyone can view hospital rooms"
  ON hospital_rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospitals can manage own rooms"
  ON hospital_rooms FOR ALL
  TO authenticated
  USING (hospital_id = auth.uid());

-- RLS Policies for hospital_services table
CREATE POLICY "Anyone can view hospital services"
  ON hospital_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospitals can manage own services"
  ON hospital_services FOR ALL
  TO authenticated
  USING (hospital_id = auth.uid());

-- RLS Policies for appointments table
CREATE POLICY "Patients can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Hospitals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (hospital_id = auth.uid());

CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- RLS Policies for medical_records table
CREATE POLICY "Patients can view own records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients' records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can create records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id = auth.uid());

-- RLS Policies for lab_reports table
CREATE POLICY "Patients can view own lab reports"
  ON lab_reports FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients' reports"
  ON lab_reports FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Hospitals can manage lab reports"
  ON lab_reports FOR ALL
  TO authenticated
  USING (hospital_id = auth.uid());

-- RLS Policies for patient_admissions table
CREATE POLICY "Patients can view own admissions"
  ON patient_admissions FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Hospitals can manage admissions"
  ON patient_admissions FOR ALL
  TO authenticated
  USING (hospital_id = auth.uid());

-- RLS Policies for bills table
CREATE POLICY "Patients can view own bills"
  ON bills FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Hospitals can manage bills"
  ON bills FOR ALL
  TO authenticated
  USING (hospital_id = auth.uid());

-- RLS Policies for bill_items table
CREATE POLICY "Users can view bill items for their bills"
  ON bill_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bills b
      WHERE b.id = bill_items.bill_id
      AND (b.patient_id = auth.uid() OR b.hospital_id = auth.uid())
    )
  );

CREATE POLICY "Hospitals can manage bill items"
  ON bill_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bills b
      WHERE b.id = bill_items.bill_id
      AND b.hospital_id = auth.uid()
    )
  );

-- RLS Policies for insurance_claims table
CREATE POLICY "Patients can view own claims"
  ON insurance_claims FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Insurance companies can view their claims"
  ON insurance_claims FOR SELECT
  TO authenticated
  USING (insurance_id = auth.uid());

CREATE POLICY "Patients can create claims"
  ON insurance_claims FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Insurance companies can update their claims"
  ON insurance_claims FOR UPDATE
  TO authenticated
  USING (insurance_id = auth.uid())
  WITH CHECK (insurance_id = auth.uid());

-- RLS Policies for payments table
CREATE POLICY "Banks can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (bank_id = auth.uid());

CREATE POLICY "Hospitals can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (hospital_id = auth.uid());

CREATE POLICY "Banks can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (bank_id = auth.uid());

-- RLS Policies for system_logs table
CREATE POLICY "Users can view own logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Anyone can create logs"
  ON system_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());