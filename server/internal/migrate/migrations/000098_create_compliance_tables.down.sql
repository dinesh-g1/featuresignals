-- 000098_create_compliance_tables.down.sql

DROP TABLE IF EXISTS llm_interaction_log CASCADE;
DROP TABLE IF EXISTS llm_compliance_policies CASCADE;
DROP TABLE IF EXISTS redaction_rules CASCADE;
DROP TABLE IF EXISTS approved_llm_providers CASCADE;
