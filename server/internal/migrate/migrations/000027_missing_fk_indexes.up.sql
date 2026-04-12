-- Migration 000027: Add missing FK indexes.
-- PostgreSQL does NOT auto-index FK columns; these are silent performance
-- drains on DELETE cascades and JOIN queries.

CREATE INDEX IF NOT EXISTS idx_api_keys_env_id ON api_keys(env_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requestor_id ON approval_requests(requestor_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_reviewer_id ON approval_requests(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_one_time_tokens_user_id ON one_time_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_token_revocations_org_id ON token_revocations(org_id);
