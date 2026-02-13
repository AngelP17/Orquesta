CREATE INDEX IF NOT EXISTS idx_accounts_project_code_currency
ON accounts (project_id, code, currency);

CREATE INDEX IF NOT EXISTS idx_sellers_project_risk
ON sellers (project_id, risk_tier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_intents_project_created
ON payment_intents (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_intents_seller_created
ON payment_intents (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_obligations_pending
ON fee_obligations (project_id, seller_id, created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payouts_seller_created
ON payouts (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_seller_date
ON ledger_entries (seller_id, created_at DESC)
INCLUDE (amount_cents, currency, entry_type);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_intent
ON ledger_entries (payment_intent_id)
WHERE payment_intent_id IS NOT NULL;
