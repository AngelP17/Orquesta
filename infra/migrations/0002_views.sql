CREATE OR REPLACE VIEW seller_balance_summary AS
SELECT
  le.project_id,
  le.seller_id,
  le.currency,
  COALESCE(SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount_cents ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN le.entry_type = 'debit' THEN le.amount_cents ELSE 0 END), 0) AS balance_cents,
  MAX(le.created_at) AS last_entry_at
FROM ledger_entries le
WHERE le.seller_id IS NOT NULL
GROUP BY le.project_id, le.seller_id, le.currency;

CREATE OR REPLACE VIEW platform_fee_summary AS
SELECT
  fo.project_id,
  DATE_TRUNC('day', fo.created_at) AS day,
  fo.currency,
  SUM(fo.amount_cents) AS fee_cents,
  SUM(fo.itbms_cents) AS itbms_cents,
  COUNT(*) AS obligations_count
FROM fee_obligations fo
GROUP BY fo.project_id, DATE_TRUNC('day', fo.created_at), fo.currency;

CREATE OR REPLACE VIEW itbms_monthly_summary AS
SELECT
  fo.project_id,
  TO_CHAR(DATE_TRUNC('month', fo.created_at), 'YYYY-MM') AS period,
  fo.currency,
  SUM(fo.itbms_cents) AS itbms_liability_cents,
  COUNT(*) FILTER (WHERE fo.status = 'swept') AS swept_count,
  COUNT(*) FILTER (WHERE fo.status = 'pending') AS pending_count
FROM fee_obligations fo
GROUP BY fo.project_id, TO_CHAR(DATE_TRUNC('month', fo.created_at), 'YYYY-MM'), fo.currency;
