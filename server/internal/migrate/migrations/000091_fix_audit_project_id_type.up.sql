-- Fix audit_logs.project_id type mismatch on databases where it was
-- created as TEXT instead of UUID. On fresh databases the column
-- does not exist yet and this is a no-op.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'project_id'
        AND data_type != 'uuid'
    ) THEN
        -- Drop the bad constraint first
        ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_project_id_fkey;
        -- Convert the column type
        ALTER TABLE audit_logs ALTER COLUMN project_id TYPE UUID USING project_id::UUID;
        -- Re-add the foreign key
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_project_id_fkey
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;
