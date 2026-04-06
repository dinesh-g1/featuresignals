-- Fix TEXT columns that should be UUID for type consistency.
-- sales_inquiries.id and org_id were created as TEXT; organizations.id is UUID.
-- pending_registrations.id was created as TEXT; all other PKs are UUID.

ALTER TABLE sales_inquiries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE sales_inquiries
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE sales_inquiries
    ALTER COLUMN org_id TYPE UUID USING org_id::uuid;

ALTER TABLE pending_registrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE pending_registrations
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
