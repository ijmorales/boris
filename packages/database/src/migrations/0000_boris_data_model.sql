CREATE TYPE "public"."ad_object_type" AS ENUM('CAMPAIGN', 'AD_SET', 'AD');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('META', 'GOOGLE_ADS', 'TIKTOK');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ad_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text,
	"currency" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_accounts_connection_external" UNIQUE("platform_connection_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "ad_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"type" "ad_object_type" NOT NULL,
	"name" text,
	"status" text NOT NULL,
	"parent_id" uuid,
	"platform_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_objects_account_external" UNIQUE("ad_account_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "platform" NOT NULL,
	"credentials" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spendings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_object_id" uuid NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" text NOT NULL,
	"impressions" bigint,
	"clicks" bigint,
	"conversions" bigint,
	"metrics" jsonb
);
--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_platform_connection_id_platform_connections_id_fk" FOREIGN KEY ("platform_connection_id") REFERENCES "public"."platform_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_objects" ADD CONSTRAINT "ad_objects_ad_account_id_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."ad_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_objects" ADD CONSTRAINT "ad_objects_parent_id_ad_objects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ad_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendings" ADD CONSTRAINT "spendings_ad_object_id_ad_objects_id_fk" FOREIGN KEY ("ad_object_id") REFERENCES "public"."ad_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_accounts_platform_connection_idx" ON "ad_accounts" USING btree ("platform_connection_id");--> statement-breakpoint
CREATE INDEX "ad_objects_ad_account_idx" ON "ad_objects" USING btree ("ad_account_id");--> statement-breakpoint
CREATE INDEX "ad_objects_parent_idx" ON "ad_objects" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "spendings_ad_object_idx" ON "spendings" USING btree ("ad_object_id");--> statement-breakpoint
CREATE INDEX "spendings_collected_at_idx" ON "spendings" USING btree ("collected_at");