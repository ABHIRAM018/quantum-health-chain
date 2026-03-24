-- ─── BANK ACCOUNTS ───────────────────────────────────────────
-- Run this against the quantum_health_chain database.
-- Adds a persistent bank_accounts table that AccountManagement.tsx uses.

CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL UNIQUE,
  account_type   TEXT NOT NULL CHECK (account_type IN ('checking','savings','business','escrow')),
  account_holder TEXT NOT NULL,
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('hospital','insurance','patient','doctor','other')),
  linked_entity_id UUID REFERENCES users(id) ON DELETE SET NULL,
  balance        NUMERIC(14,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank   ON bank_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_entity ON bank_accounts(linked_entity_id);

-- Seed one account per existing hospital/insurance/patient/doctor
-- so the UI is not empty on first load.
INSERT INTO bank_accounts (bank_id, account_number, account_type, account_holder, entity_type, linked_entity_id, balance)
SELECT
  (SELECT id FROM users WHERE role = 'bank' LIMIT 1),
  LPAD(((ROW_NUMBER() OVER (ORDER BY u.created_at)) * 111111 + 1000000000)::text, 10, '0'),
  CASE u.role
    WHEN 'hospital'  THEN 'business'
    WHEN 'insurance' THEN 'escrow'
    WHEN 'patient'   THEN 'checking'
    WHEN 'doctor'    THEN 'savings'
    ELSE 'checking'
  END,
  u.name,
  u.role,
  u.id,
  0
FROM users u
WHERE u.role IN ('hospital','insurance','patient','doctor')
ON CONFLICT (account_number) DO NOTHING;