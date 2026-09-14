CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'apple' NOT NULL,
	"product_id" text NOT NULL,
	"original_transaction_id" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_subscriptions_original_transaction_id_unique" UNIQUE("original_transaction_id"),
	CONSTRAINT "user_subscriptions_provider_check" CHECK ("user_subscriptions"."provider" in ('apple')),
	CONSTRAINT "user_subscriptions_status_check" CHECK ("user_subscriptions"."status" in ('inactive', 'active', 'grace_period', 'expired', 'revoked')),
	CONSTRAINT "user_subscriptions_environment_check" CHECK ("user_subscriptions"."environment" in ('sandbox', 'production'))
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_subscriptions_status_expiry_idx" ON "user_subscriptions" USING btree ("status","expires_at");