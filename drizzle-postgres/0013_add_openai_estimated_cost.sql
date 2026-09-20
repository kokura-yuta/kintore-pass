ALTER TABLE "openai_usage_records"
ADD COLUMN "estimated_cost_micros_yen" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "openai_usage_records"
ADD CONSTRAINT "openai_usage_cost_nonnegative_check"
CHECK ("openai_usage_records"."estimated_cost_micros_yen" >= 0);
