CREATE TABLE IF NOT EXISTS status_checks (
    id         BIGSERIAL PRIMARY KEY,
    region     TEXT NOT NULL,
    component  TEXT NOT NULL,
    status     TEXT NOT NULL,
    latency_ms INT NOT NULL DEFAULT 0,
    message    TEXT NOT NULL DEFAULT '',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_checks_region_component_time
    ON status_checks (region, component, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_checks_time
    ON status_checks (checked_at);
