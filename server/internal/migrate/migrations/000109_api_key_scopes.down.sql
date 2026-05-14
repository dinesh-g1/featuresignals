-- Reverse migration 000109: Remove scopes column from api_keys table.

ALTER TABLE api_keys DROP COLUMN IF EXISTS scopes;
