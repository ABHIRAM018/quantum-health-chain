-- ─── CLAIM DOCUMENTS ─────────────────────────────────────────
-- Stores collected documents for each insurance claim submission
-- Run this migration on your PostgreSQL database

CREATE TABLE IF NOT EXISTS claim_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id          UUID REFERENCES insurance_claims(id) ON DELETE CASCADE,
  bill_id           UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_by_role TEXT NOT NULL CHECK (submitted_by_role IN ('patient','hospital')),

  -- Patient / Customer details
  patient_name      TEXT NOT NULL,
  patient_phone     TEXT,
  patient_address   TEXT,
  date_of_birth     TEXT,

  -- Policy / Insurance
  policy_number     TEXT NOT NULL,
  insurance_card    TEXT,          -- insurance card number / member ID
  insurance_name    TEXT,          -- insurance company name as entered

  -- Medical
  doctor_name       TEXT,
  doctor_prescription TEXT,        -- prescription text / notes
  diagnosis         TEXT,

  -- Document checklist (true = attached/confirmed)
  has_bill          BOOLEAN NOT NULL DEFAULT FALSE,
  has_id_proof      BOOLEAN NOT NULL DEFAULT FALSE,
  has_policy_card   BOOLEAN NOT NULL DEFAULT FALSE,
  has_prescription  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Verification
  details_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  policy_active     BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Claim file preparation
  claim_form_filled BOOLEAN NOT NULL DEFAULT FALSE,
  documents_arranged BOOLEAN NOT NULL DEFAULT FALSE,
  supporting_docs_added BOOLEAN NOT NULL DEFAULT FALSE,

  -- Additional notes
  notes             TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_docs_claim   ON claim_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_docs_bill    ON claim_documents(bill_id);
CREATE INDEX IF NOT EXISTS idx_claim_docs_patient ON claim_documents(patient_id);

-- Also add notes column to insurance_claims for bank instructions
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS bank_notes TEXT;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS documents_collected BOOLEAN DEFAULT FALSE;