DROP TABLE IF EXISTS demo_feedback;
ALTER TABLE organizations DROP COLUMN IF EXISTS demo_expires_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS is_demo;
ALTER TABLE users DROP COLUMN IF EXISTS is_demo;
