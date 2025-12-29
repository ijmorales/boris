-- Create organizations table
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_domain_unique" UNIQUE("domain")
);--> statement-breakpoint

-- Create users table (Clerk-synced)
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"organization_id" uuid,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);--> statement-breakpoint

-- Create seed organization for existing data
INSERT INTO "organizations" ("id", "name")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization');--> statement-breakpoint

-- Add organization_id to platform_connections with default for existing records
ALTER TABLE "platform_connections" ADD COLUMN "organization_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint

-- Remove the default after backfill
ALTER TABLE "platform_connections" ALTER COLUMN "organization_id" DROP DEFAULT;--> statement-breakpoint

-- Drop old clients index before changing column type
DROP INDEX IF EXISTS "clients_organization_idx";--> statement-breakpoint

-- Convert clients.organization_id from text to uuid and link to default org
ALTER TABLE "clients"
  DROP COLUMN "organization_id",
  ADD COLUMN "organization_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint

-- Remove the default after backfill
ALTER TABLE "clients" ALTER COLUMN "organization_id" DROP DEFAULT;--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create indexes
CREATE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "platform_connections_org_idx" ON "platform_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clients_organization_idx" ON "clients" USING btree ("organization_id");
