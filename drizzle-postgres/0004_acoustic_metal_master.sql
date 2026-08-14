CREATE TABLE "training_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"exercise_name" text NOT NULL,
	"body_part" text NOT NULL,
	"body_area" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" integer,
	"condition_score" integer,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" real,
	"reps" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_exercises" ADD CONSTRAINT "training_exercises_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sets" ADD CONSTRAINT "training_sets_training_exercise_id_training_exercises_id_fk" FOREIGN KEY ("training_exercise_id") REFERENCES "public"."training_exercises"("id") ON DELETE cascade ON UPDATE no action;