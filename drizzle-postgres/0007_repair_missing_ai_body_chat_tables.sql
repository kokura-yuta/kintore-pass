-- 過去のスナップショットには存在するが作成SQLが不足していた6テーブルを補う
CREATE TABLE IF NOT EXISTS "body_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary" text,
	"goal_difference" text,
	"analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "body_analysis_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"body_part" text NOT NULL,
	"score" integer,
	"priority" text,
	"observation" text,
	"recommendation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generated_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"training_session_id" uuid,
	"performed_at" timestamp with time zone,
	"recommended_body_part" text NOT NULL,
	"reason" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"advice" text[] NOT NULL,
	"condition_score" integer,
	"request_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generated_menu_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"exercise_name" text NOT NULL,
	"body_part" text NOT NULL,
	"body_area" text,
	"target_weight_kg" real,
	"target_reps" text NOT NULL,
	"sets" integer NOT NULL,
	"rest_seconds" integer NOT NULL,
	"note" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT '新しい相談' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- すでにAIメニューテーブルだけ存在する環境にも新しい実施情報列を追加する
ALTER TABLE "ai_generated_menus" ADD COLUMN IF NOT EXISTS "training_session_id" uuid;
--> statement-breakpoint
ALTER TABLE "ai_generated_menus" ADD COLUMN IF NOT EXISTS "performed_at" timestamp with time zone;
--> statement-breakpoint

-- 既存環境と新規環境の両方で、外部キーを重複させずに追加する
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'body_analyses_user_id_users_id_fk') THEN
  ALTER TABLE "body_analyses" ADD CONSTRAINT "body_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'body_analysis_areas_analysis_id_body_analyses_id_fk') THEN
  ALTER TABLE "body_analysis_areas" ADD CONSTRAINT "body_analysis_areas_analysis_id_body_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."body_analyses"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_menus_user_id_users_id_fk') THEN
  ALTER TABLE "ai_generated_menus" ADD CONSTRAINT "ai_generated_menus_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_menus_training_session_id_training_sessions_id_fk') THEN
  ALTER TABLE "ai_generated_menus" ADD CONSTRAINT "ai_generated_menus_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_menus_training_session_id_unique') THEN
  ALTER TABLE "ai_generated_menus" ADD CONSTRAINT "ai_generated_menus_training_session_id_unique" UNIQUE("training_session_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_menu_exercises_menu_id_ai_generated_menus_id_fk') THEN
  ALTER TABLE "ai_generated_menu_exercises" ADD CONSTRAINT "ai_generated_menu_exercises_menu_id_ai_generated_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."ai_generated_menus"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_conversations_user_id_users_id_fk') THEN
  ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_conversation_id_chat_conversations_id_fk') THEN
  ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint

-- 不足していた検索用インデックスを、新規・既存どちらの環境にも追加する
CREATE INDEX IF NOT EXISTS "ai_generated_menus_user_created_idx" ON "ai_generated_menus" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_menu_exercises_menu_order_idx" ON "ai_generated_menu_exercises" USING btree ("menu_id", "display_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_user_updated_idx" ON "chat_conversations" USING btree ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_created_idx" ON "chat_messages" USING btree ("conversation_id", "created_at");
