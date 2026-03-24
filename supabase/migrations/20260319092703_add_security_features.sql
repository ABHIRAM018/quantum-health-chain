/*
  # Add Security Features for Healthcare System

  1. Security Enhancements
    - Enable pgcrypto extension for password hashing
    - Create secure password storage with bcrypt
    - Add JWT token management
    - Implement session tracking
    - Add audit logging for security events

  2. Tables Created
    - `user_sessions` - Track active user sessions with JWT tokens
    - `security_audit_log` - Log all authentication and security events
    - Update `users` table with proper security columns

  3. Security Features
    - Password hashing using bcrypt (pgcrypto)
    - JWT token storage and validation
    - Session management with expiration
    - Failed login attempt tracking
    - Security event logging

  4. Row Level Security (RLS)
    - Enable RLS on all security-related tables
    - Users can only access their own sessions
    - Admins can view audit logs
    - Strict access controls on all tables
*/

-- Enable pgcrypto extension for password hashing and encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing users table if it exists and recreate with proper security
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with enhanced security
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'doctor', 'hospital', 'insurance', 'bank', 'admin')),
  name text NOT NULL,
  phone text,
  address text,
  date_of_birth date,
  emergency_contact text,
  insurance_id text,
  
  -- Doctor specific fields
  specialization text,
  license_number text,
  hospital_id uuid,
  experience integer,
  consultation_fee numeric,
  
  -- Hospital specific fields
  total_beds integer,
  available_beds integer,
  services text[],
  
  -- Insurance specific fields
  company_name text,
  policy_types text[],
  
  -- Bank specific fields
  bank_name text,
  routing_number text,
  
  -- Admin specific fields
  permissions text[],
  
  -- Security fields
  is_active boolean DEFAULT true,
  is_email_verified boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  last_login timestamptz,
  password_changed_at timestamptz DEFAULT now(),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create user_sessions table for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_token text NOT NULL,
  refresh_token text,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  is_valid boolean DEFAULT true
);

-- Create indexes for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_jwt_token ON user_sessions(jwt_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create security_audit_log table for tracking security events
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'login_success', 'login_failed', 'logout', 'password_change',
    'password_reset_request', 'password_reset_complete',
    'account_locked', 'account_unlocked', 'session_expired',
    'token_refresh', 'unauthorized_access', 'role_change'
  )),
  email text,
  ip_address text,
  user_agent text,
  details jsonb,
  severity text CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);

-- Function to hash passwords using bcrypt
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(password text, password_hash text)
RETURNS boolean AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET is_valid = false
  WHERE expires_at < now() AND is_valid = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_email text,
  p_ip_address text,
  p_user_agent text,
  p_details jsonb,
  p_severity text
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id, event_type, email, ip_address, user_agent, details, severity
  ) VALUES (
    p_user_id, p_event_type, p_email, p_ip_address, p_user_agent, p_details, p_severity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login(p_email text)
RETURNS jsonb AS $$
DECLARE
  v_user users;
  v_attempts integer;
BEGIN
  SELECT * INTO v_user FROM users WHERE email = p_email;
  
  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'attempts', 0);
  END IF;
  
  v_attempts := COALESCE(v_user.failed_login_attempts, 0) + 1;
  
  -- Lock account after 5 failed attempts for 15 minutes
  IF v_attempts >= 5 THEN
    UPDATE users
    SET 
      failed_login_attempts = v_attempts,
      locked_until = now() + interval '15 minutes',
      updated_at = now()
    WHERE id = v_user.id;
    
    PERFORM log_security_event(
      v_user.id,
      'account_locked',
      p_email,
      NULL,
      NULL,
      jsonb_build_object('reason', 'too_many_failed_attempts', 'attempts', v_attempts),
      'warning'
    );
    
    RETURN jsonb_build_object('locked', true, 'attempts', v_attempts, 'locked_until', now() + interval '15 minutes');
  ELSE
    UPDATE users
    SET 
      failed_login_attempts = v_attempts,
      updated_at = now()
    WHERE id = v_user.id;
    
    RETURN jsonb_build_object('locked', false, 'attempts', v_attempts);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    failed_login_attempts = 0,
    locked_until = NULL,
    last_login = now(),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last activity timestamp
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS trigger AS $$
BEGIN
  NEW.last_activity := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last activity on session updates
CREATE TRIGGER trigger_update_session_activity
BEFORE UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users table
CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for user_sessions table
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for security_audit_log table
CREATE POLICY "Users can view own audit logs"
  ON security_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON security_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert demo users with hashed passwords
INSERT INTO users (
  email, password_hash, role, name, phone, date_of_birth, address, emergency_contact, insurance_id
) VALUES (
  'john.doe@email.com',
  hash_password('password123'),
  'patient',
  'John Doe',
  '+1-555-0123',
  '1990-05-15',
  '123 Main St, City, State 12345',
  '+1-555-0124',
  'insurance-1'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, phone, date_of_birth, address, emergency_contact
) VALUES (
  'jane.smith@email.com',
  hash_password('password123'),
  'patient',
  'Jane Smith',
  '+1-555-0125',
  '1985-08-22',
  '456 Oak Ave, City, State 12345',
  '+1-555-0126'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, specialization, license_number, hospital_id, experience, consultation_fee
) VALUES (
  'dr.wilson@hospital.com',
  hash_password('password123'),
  'doctor',
  'Dr. Sarah Wilson',
  'Cardiology',
  'MD-12345',
  NULL,
  10,
  200
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, specialization, license_number, hospital_id, experience, consultation_fee
) VALUES (
  'dr.johnson@hospital.com',
  hash_password('password123'),
  'doctor',
  'Dr. Michael Johnson',
  'Orthopedics',
  'MD-12346',
  NULL,
  15,
  250
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, address, phone, total_beds, available_beds, services
) VALUES (
  'admin@cityhospital.com',
  hash_password('password123'),
  'hospital',
  'City General Hospital',
  '789 Hospital Blvd, City, State 12345',
  '+1-555-0200',
  500,
  45,
  ARRAY['Emergency', 'Surgery', 'Cardiology', 'Orthopedics', 'Radiology']
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, company_name, policy_types
) VALUES (
  'claims@healthinsure.com',
  hash_password('password123'),
  'insurance',
  'HealthInsure Corp',
  'HealthInsure Corp',
  ARRAY['Basic', 'Premium', 'Family']
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, bank_name, routing_number
) VALUES (
  'payments@nationalbank.com',
  hash_password('password123'),
  'bank',
  'National Bank',
  'National Bank',
  '021000021'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, role, name, permissions
) VALUES (
  'admin@healthcare.com',
  hash_password('password123'),
  'admin',
  'System Administrator',
  ARRAY['full_access']
) ON CONFLICT (email) DO NOTHING;
