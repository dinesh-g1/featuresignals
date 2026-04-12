ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS data_region TEXT NOT NULL DEFAULT 'us';
