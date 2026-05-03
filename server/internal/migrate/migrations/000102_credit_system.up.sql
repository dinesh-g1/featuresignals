-- Migration 102: Credit system for cost-bearing features (AI Janitor, future add-ons).
-- Replaces the old 5-metric infrastructure billing model with a pre-paid credit system.
-- All monetary values stored in paise (smallest currency unit) to avoid float precision issues.
-- 1 INR = 100 paise. INR 1,999.00 = 199900 paise.

-- Cost bearers represent features that incur marginal cost per use.
-- Each bearer has a unique ID and defines the unit of consumption displayed to customers.
CREATE TABLE IF NOT EXISTS cost_bearers (
    id              TEXT PRIMARY KEY,            -- e.g., "ai_janitor"
    display_name    TEXT NOT NULL,               -- e.g., "AI Janitor Actions"
    description     TEXT NOT NULL,               -- e.g., "Scan repositories for stale flags..."
    unit_name       TEXT NOT NULL,               -- e.g., "scan credit"
    free_units      INT  NOT NULL DEFAULT 0,     -- included per month on Free tier
    pro_units       INT  NOT NULL DEFAULT 0,     -- included per month on Pro tier
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit packs are purchasable bundles of units for a cost bearer.
CREATE TABLE IF NOT EXISTS credit_packs (
    id              TEXT PRIMARY KEY,            -- e.g., "ai_janitor_starter"
    bearer_id       TEXT NOT NULL REFERENCES cost_bearers(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,               -- e.g., "Starter"
    credits         INT  NOT NULL,               -- e.g., 50
    price_paise     BIGINT NOT NULL,             -- price in INR paise (e.g., 24900 = INR 249.00)
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-organization credit balance for each cost bearer.
-- Balance is atomically decremented on consumption via UPDATE...RETURNING.
CREATE TABLE IF NOT EXISTS credit_balances (
    org_id          TEXT NOT NULL,
    bearer_id       TEXT NOT NULL REFERENCES cost_bearers(id) ON DELETE CASCADE,
    balance         INT  NOT NULL DEFAULT 0,     -- remaining credits
    lifetime_used   INT  NOT NULL DEFAULT 0,     -- total credits ever consumed
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, bearer_id)
);

-- Record of every credit pack purchase for audit trail and invoice generation.
CREATE TABLE IF NOT EXISTS credit_purchases (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    pack_id         TEXT NOT NULL REFERENCES credit_packs(id),
    bearer_id       TEXT NOT NULL REFERENCES cost_bearers(id),
    credits         INT  NOT NULL,
    price_paise     BIGINT NOT NULL,
    invoice_id      TEXT,                        -- FK to invoices table once invoice is generated
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Record of every credit consumption for audit trail.
-- idempotency_key prevents double-charge on retry (unique partial index below).
CREATE TABLE IF NOT EXISTS credit_consumptions (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    bearer_id       TEXT NOT NULL REFERENCES cost_bearers(id),
    operation       TEXT NOT NULL,               -- e.g., "scan_repo", "analyze_flag", "apply_fix"
    credits         INT  NOT NULL,               -- credits consumed (positive integer)
    metadata        JSONB,                       -- e.g., {"repo": "org/repo", "flags_found": 5}
    idempotency_key TEXT,                        -- prevents double-charge on retry
    consumed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track monthly credit grants to ensure idempotency.
-- One row per org per bearer per billing period. Prevents double-granting.
CREATE TABLE IF NOT EXISTS monthly_credit_grants (
    org_id          TEXT NOT NULL,
    bearer_id       TEXT NOT NULL REFERENCES cost_bearers(id) ON DELETE CASCADE,
    period_start    DATE NOT NULL,               -- first day of billing period
    credits_granted INT  NOT NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, bearer_id, period_start)
);

-- Indexes for query performance.
CREATE INDEX IF NOT EXISTS idx_credit_balances_org ON credit_balances(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_org ON credit_purchases(org_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_invoice ON credit_purchases(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_consumptions_org ON credit_consumptions(org_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_consumptions_bearer ON credit_consumptions(org_id, bearer_id, consumed_at DESC);

-- Unique partial index: prevents duplicate consumption via the same idempotency key.
-- Only applies to rows with non-null idempotency_key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_consumptions_idem
    ON credit_consumptions(org_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
