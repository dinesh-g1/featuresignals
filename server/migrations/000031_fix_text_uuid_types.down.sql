-- Revert UUID columns back to TEXT.

ALTER TABLE pending_registrations
    ALTER COLUMN id TYPE TEXT USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE sales_inquiries
    ALTER COLUMN org_id TYPE TEXT USING org_id::text;

ALTER TABLE sales_inquiries
    ALTER COLUMN id TYPE TEXT USING id::text,
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
