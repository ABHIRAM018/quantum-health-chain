-- Room booking requests (patient → hospital)
CREATE TABLE IF NOT EXISTS room_bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id          UUID NOT NULL REFERENCES hospital_rooms(id) ON DELETE CASCADE,
  check_in_date    DATE NOT NULL,
  check_out_date   DATE NOT NULL,
  reason           TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  notes            TEXT DEFAULT '',
  total_cost       NUMERIC(12,2) DEFAULT 0,
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_bookings_patient  ON room_bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_hospital ON room_bookings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room     ON room_bookings(room_id);

-- Service booking requests (patient → hospital)
CREATE TABLE IF NOT EXISTS service_bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES hospital_services(id) ON DELETE CASCADE,
  preferred_date   DATE NOT NULL,
  preferred_time   TEXT NOT NULL DEFAULT '09:00',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','rejected')),
  notes            TEXT DEFAULT '',
  total_cost       NUMERIC(12,2) DEFAULT 0,
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_bookings_patient  ON service_bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_hospital ON service_bookings(hospital_id);