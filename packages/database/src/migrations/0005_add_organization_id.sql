-- Add organization_id to clients table for multi-tenant support
-- Nullable for now until organizations feature is implemented

BEGIN;

-- Add organization_id column
ALTER TABLE "clients" ADD COLUMN "organization_id" text;

-- Create index for efficient organization filtering
CREATE INDEX IF NOT EXISTS "clients_organization_idx" ON "clients" USING btree ("organization_id");

COMMIT;
