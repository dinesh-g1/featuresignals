ALTER TABLE flags ADD COLUMN category TEXT NOT NULL DEFAULT 'release'
  CHECK (category IN ('release', 'experiment', 'ops', 'permission'));

ALTER TABLE flags ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'rolled_out', 'deprecated', 'archived'));
