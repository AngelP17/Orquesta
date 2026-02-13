CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
    CREATE TYPE currency_code AS ENUM ('PAB', 'USD');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_tier') THEN
    CREATE TYPE risk_tier AS ENUM ('GREEN', 'YELLOW', 'RED', 'BLACK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  api_key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  ruc TEXT NOT NULL,
  risk_tier risk_tier NOT NULL DEFAULT 'GREEN',
  preferred_currency currency_code NOT NULL DEFAULT 'PAB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, email),
  UNIQUE (project_id, ruc)
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES sellers(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  currency currency_code NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, code, currency)
);

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency currency_code NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requires_payment_method', 'processing', 'succeeded', 'failed', 'canceled')),
  provider TEXT NOT NULL DEFAULT 'yappy',
  external_id TEXT,
  idempotency_key UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS fee_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  itbms_cents BIGINT NOT NULL CHECK (itbms_cents >= 0),
  currency currency_code NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'swept', 'waived')) DEFAULT 'pending',
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  swept_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency currency_code NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  external_id TEXT,
  idempotency_key UUID NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES sellers(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency currency_code NOT NULL,
  contra_entry_id UUID,
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
  payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
  itbms_cents BIGINT NOT NULL DEFAULT 0 CHECK (itbms_cents >= 0),
  metadata JSONB NOT NULL DEFAULT '{}',
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at),
  UNIQUE (idempotency_key)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS ledger_entries_default PARTITION OF ledger_entries DEFAULT;

CREATE TABLE IF NOT EXISTS ledger_entries_y2026m01 PARTITION OF ledger_entries
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS ledger_entries_y2026m02 PARTITION OF ledger_entries
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE OR REPLACE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_entries_immutable_update ON ledger_entries;
CREATE TRIGGER ledger_entries_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

DROP TRIGGER IF EXISTS ledger_entries_immutable_delete ON ledger_entries;
CREATE TRIGGER ledger_entries_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_isolation_sellers ON sellers;
CREATE POLICY seller_isolation_sellers ON sellers
USING (id = current_setting('app.current_seller_id', true)::UUID);

DROP POLICY IF EXISTS seller_isolation_payment_intents ON payment_intents;
CREATE POLICY seller_isolation_payment_intents ON payment_intents
USING (seller_id = current_setting('app.current_seller_id', true)::UUID);

DROP POLICY IF EXISTS seller_isolation_fee_obligations ON fee_obligations;
CREATE POLICY seller_isolation_fee_obligations ON fee_obligations
USING (seller_id = current_setting('app.current_seller_id', true)::UUID);

DROP POLICY IF EXISTS seller_isolation_payouts ON payouts;
CREATE POLICY seller_isolation_payouts ON payouts
USING (seller_id = current_setting('app.current_seller_id', true)::UUID);

DROP POLICY IF EXISTS seller_isolation_ledger_entries ON ledger_entries;
CREATE POLICY seller_isolation_ledger_entries ON ledger_entries
USING (seller_id = current_setting('app.current_seller_id', true)::UUID);
