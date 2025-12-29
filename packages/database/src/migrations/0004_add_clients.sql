-- Create clients table and add client_id to ad_accounts
-- Wrapped in transaction for atomic execution

BEGIN;

-- Create clients table
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add client_id to ad_accounts (only if column doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ad_accounts' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE "ad_accounts" ADD COLUMN "client_id" uuid;
    END IF;
END $$;

-- Add foreign key constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ad_accounts_client_id_clients_id_fk'
    ) THEN
        ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_client_id_clients_id_fk"
            FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "clients_name_idx" ON "clients" USING btree ("name");
CREATE INDEX IF NOT EXISTS "ad_accounts_client_idx" ON "ad_accounts" USING btree ("client_id");

COMMIT;
