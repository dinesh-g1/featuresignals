-- Reverse migration 104: Remove seeded data.
-- Does NOT drop tables — that's handled by migration 102 down.
DELETE FROM credit_balances WHERE bearer_id = 'ai_janitor';
DELETE FROM credit_packs WHERE bearer_id = 'ai_janitor';
DELETE FROM cost_bearers WHERE id = 'ai_janitor';
