-- FeatureSignals ClickHouse Schema v1
-- Evaluation events analytics store
-- Replaces PostgreSQL for high-volume evaluation event storage
--
-- PRS Requirements: FS-S0-DATA-010 through FS-S0-DATA-015
-- Lifecycle Stage: Stage 0 — Raw Material Collection
-- Product: Data Infrastructure
--
-- Design decisions:
--   - MergeTree engine with monthly partitioning for efficient time-range queries
--   - ORDER BY (org_id, flag_key, evaluated_at) for tenant-scoped analytics
--   - Bloom filter indexes on flag_key and org_id for fast point lookups
--   - Materialized views pre-aggregate hourly and daily rollups for dashboards
--   - TTL: raw events 90 days, hourly rollups 365 days, daily rollups 365 days
--   - Array(String) for segment_keys enables efficient multi-value filtering
--   - JSON-as-String for attributes; queried via ClickHouse JSON functions
--
-- Performance targets (from PERFORMANCE_BUDGETS.md §8):
--   - Sustained ingestion: 10,000 events/s
--   - Burst ingestion: 50,000 events/s
--   - End-to-end pipeline latency: < 500ms p99

-- ============================================================
-- 1. EVALUATION EVENTS — Main table
-- ============================================================
CREATE TABLE IF NOT EXISTS eval_events (
    -- Identity (multi-tenant boundary: org_id)
    org_id          String,
    project_id      String,
    environment_id  String,
    flag_key        String,
    flag_id         String,

    -- Evaluation result
    variant         String DEFAULT '',
    value           String DEFAULT '',
    reason          String DEFAULT '',
    rule_id         String DEFAULT '',

    -- SDK context (hashed for privacy; raw user keys never leave SDK)
    user_key_hash   String DEFAULT '',
    sdk_name        String DEFAULT '',
    sdk_version     String DEFAULT '',
    sdk_mode        String DEFAULT '',

    -- Performance
    latency_us      Int64 DEFAULT 0,
    cache_hit       UInt8 DEFAULT 0,

    -- Context (JSON as String for flexibility, queried via JSON functions)
    attributes      String DEFAULT '{}',
    segment_keys    Array(String) DEFAULT [],

    -- Event timestamp (partitioning key)
    evaluated_at    DateTime64(3) DEFAULT now64(3),

    -- Ingestion timestamp (for deduplication and pipeline latency measurement)
    ingested_at     DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(evaluated_at)
ORDER BY (org_id, flag_key, evaluated_at)
TTL evaluated_at + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- ============================================================
-- 2. INDEXES — Optimize common query patterns
-- ============================================================

-- Bloom filter for fast flag_key lookups (cardinality: thousands per org)
ALTER TABLE eval_events
ADD INDEX IF NOT EXISTS idx_flag_key flag_key TYPE bloom_filter GRANULARITY 4;

-- Bloom filter for org-scoped queries (cardinality: low hundreds)
ALTER TABLE eval_events
ADD INDEX IF NOT EXISTS idx_org_id org_id TYPE bloom_filter GRANULARITY 4;

-- Minmax for time-range queries (leverages partitioning)
ALTER TABLE eval_events
ADD INDEX IF NOT EXISTS idx_evaluated_at evaluated_at TYPE minmax GRANULARITY 1;

-- Bloom filter on sdk_name for SDK distribution analytics
ALTER TABLE eval_events
ADD INDEX IF NOT EXISTS idx_sdk_name sdk_name TYPE bloom_filter GRANULARITY 4;

-- ============================================================
-- 3. MATERIALIZED VIEWS — Pre-computed aggregations
-- ============================================================

-- 3a. Hourly evaluation counts by flag
-- Powers: per-flag volume charts, latency percentiles
CREATE MATERIALIZED VIEW IF NOT EXISTS eval_counts_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (org_id, flag_key, hour)
TTL hour + INTERVAL 365 DAY
SETTINGS index_granularity = 8192
AS SELECT
    org_id,
    flag_key,
    toStartOfHour(evaluated_at) AS hour,
    count() AS eval_count,
    sum(cache_hit) AS cache_hits,
    avg(latency_us) AS avg_latency_us,
    quantile(0.50)(latency_us) AS p50_latency_us,
    quantile(0.95)(latency_us) AS p95_latency_us,
    quantile(0.99)(latency_us) AS p99_latency_us
FROM eval_events
GROUP BY org_id, flag_key, hour;

-- 3b. Daily evaluation counts by org
-- Powers: billing metering, org-level usage dashboards
CREATE MATERIALIZED VIEW IF NOT EXISTS eval_counts_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (org_id, day)
TTL day + INTERVAL 365 DAY
SETTINGS index_granularity = 8192
AS SELECT
    org_id,
    toStartOfDay(evaluated_at) AS day,
    count() AS eval_count,
    uniq(flag_key) AS active_flags,
    avg(latency_us) AS avg_latency_us
FROM eval_events
GROUP BY org_id, day;

-- 3c. Variant distribution by flag (hourly)
-- Powers: A/B test variant distribution charts
CREATE MATERIALIZED VIEW IF NOT EXISTS eval_variants_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (org_id, flag_key, variant, hour)
TTL hour + INTERVAL 365 DAY
SETTINGS index_granularity = 8192
AS SELECT
    org_id,
    flag_key,
    variant,
    toStartOfHour(evaluated_at) AS hour,
    count() AS variant_count
FROM eval_events
WHERE variant != ''
GROUP BY org_id, flag_key, variant, hour;

-- 3d. SDK distribution (hourly)
-- Powers: SDK version adoption tracking, deprecation planning
CREATE MATERIALIZED VIEW IF NOT EXISTS eval_sdk_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (org_id, sdk_name, sdk_version, hour)
TTL hour + INTERVAL 90 DAY
SETTINGS index_granularity = 8192
AS SELECT
    org_id,
    sdk_name,
    sdk_version,
    toStartOfHour(evaluated_at) AS hour,
    count() AS eval_count,
    avg(latency_us) AS avg_latency_us
FROM eval_events
WHERE sdk_name != ''
GROUP BY org_id, sdk_name, sdk_version, hour;

-- ============================================================
-- 4. DICTIONARIES — Lookup tables for org/project names
-- ============================================================
-- Note: Dictionaries would be populated from PostgreSQL via
-- `clickhouse-dictionary-source`. Placeholder for Phase 2 when
-- dashboard joins org_id → org name without cross-system queries.
--
-- CREATE DICTIONARY IF NOT EXISTS org_names
-- (
--     org_id String,
--     org_name String
-- )
-- PRIMARY KEY org_id
-- SOURCE(POSTGRESQL(
--     PORT 5432 HOST 'postgres' USER 'clickhouse_ro' PASSWORD '[secret]'
--     DB 'featuresignals' TABLE 'organizations'
-- ))
-- LIFETIME(MIN 300 MAX 600)
-- LAYOUT(HASHED());

-- ============================================================
-- 5. QUERY PATTERNS — Reference examples
-- ============================================================

-- 5a. Per-flag evaluation volume (last 24 hours, hourly buckets):
-- SELECT
--     toStartOfHour(evaluated_at) AS hour,
--     count() AS cnt
-- FROM eval_events
-- WHERE org_id = 'org_xxx'
--   AND flag_key = 'my-feature'
--   AND evaluated_at >= now() - INTERVAL 24 HOUR
-- GROUP BY hour
-- ORDER BY hour;

-- 5b. Latency percentiles per flag (last 7 days from materialized view):
-- SELECT
--     flag_key,
--     avg(avg_latency_us) AS avg_us,
--     max(p99_latency_us) AS p99_us
-- FROM eval_counts_hourly
-- WHERE org_id = 'org_xxx'
--   AND hour >= now() - INTERVAL 7 DAY
-- GROUP BY flag_key
-- ORDER BY avg_us DESC;

-- 5c. Variant distribution (from materialized view):
-- SELECT
--     variant,
--     sum(variant_count) AS total
-- FROM eval_variants_hourly
-- WHERE org_id = 'org_xxx'
--   AND flag_key = 'my-feature'
--   AND hour >= now() - INTERVAL 24 HOUR
-- GROUP BY variant
-- ORDER BY total DESC;

-- 5d. Active flags per org (from materialized view):
-- SELECT
--     max(active_flags) AS peak_active_flags
-- FROM eval_counts_daily
-- WHERE org_id = 'org_xxx'
--   AND day >= now() - INTERVAL 30 DAY;

-- ============================================================
-- 6. RETENTION POLICY
-- ============================================================
-- Raw events:     90 days (TTL on eval_events)
-- Hourly rollups: 365 days (TTL on eval_counts_hourly, eval_variants_hourly, eval_sdk_hourly)
-- Daily rollups:  365 days (TTL on eval_counts_daily)
--
-- Enterprise customers may request extended retention (up to 7 years).
-- For extended retention, create a separate table with longer TTL and
-- use a materialized view that filters by org_id IN (enterprise_orgs).
