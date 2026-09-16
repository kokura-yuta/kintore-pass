CREATE TABLE "openai_usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"request_id" uuid NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "openai_usage_feature_check" CHECK ("openai_usage_records"."feature" in ('chat', 'menu', 'body-analysis', 'summary')),
	CONSTRAINT "openai_usage_tokens_nonnegative_check" CHECK ("openai_usage_records"."input_tokens" >= 0 and "openai_usage_records"."output_tokens" >= 0 and "openai_usage_records"."total_tokens" >= 0)
);
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "summarized_message_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "openai_usage_records" ADD CONSTRAINT "openai_usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "openai_usage_user_created_idx" ON "openai_usage_records" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "openai_usage_feature_created_idx" ON "openai_usage_records" USING btree ("feature","created_at");