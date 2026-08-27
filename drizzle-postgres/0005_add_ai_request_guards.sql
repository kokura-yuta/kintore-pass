CREATE TABLE "ai_request_guards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" text NOT NULL,
	"request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_request_guards" ADD CONSTRAINT "ai_request_guards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_request_guards_user_type_request_uidx" ON "ai_request_guards" USING btree ("user_id","request_type","request_id");
--> statement-breakpoint
CREATE INDEX "ai_request_guards_user_created_idx" ON "ai_request_guards" USING btree ("user_id","created_at");
