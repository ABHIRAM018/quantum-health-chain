-- ─── POLICY ENROLLMENTS ──────────────────────────────────────
-- Allows patients to browse and enroll in insurance policies.
-- Run against quantum_health_chain database.

CREATE TABLE IF NOT EXISTS policy_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_id    UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  insurance_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','active','cancelled','expired')),
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  notes        TEXT,
  UNIQUE (patient_id, policy_id)   -- one enrollment per patient per policy
);

CREATE INDEX IF NOT EXISTS idx_enrollments_patient   ON policy_enrollments(patient_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_policy    ON policy_enrollments(policy_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_insurance ON policy_enrollments(insurance_id);