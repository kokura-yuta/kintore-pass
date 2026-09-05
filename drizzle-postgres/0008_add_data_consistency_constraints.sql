CREATE INDEX IF NOT EXISTS "body_analyses_user_status_analyzed_idx" ON "body_analyses" USING btree ("user_id","status","analyzed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "body_analysis_areas_analysis_idx" ON "body_analysis_areas" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_exercises_session_order_idx" ON "training_exercises" USING btree ("session_id","display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_sessions_user_performed_idx" ON "training_sessions" USING btree ("user_id","performed_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "training_sets_exercise_number_uidx" ON "training_sets" USING btree ("training_exercise_id","set_number");--> statement-breakpoint
ALTER TABLE "ai_request_guards" ADD CONSTRAINT "ai_request_guards_type_check" CHECK ("ai_request_guards"."request_type" in ('chat', 'menu', 'training-record', 'body-analysis'));--> statement-breakpoint
ALTER TABLE "body_analyses" ADD CONSTRAINT "body_analyses_status_check" CHECK ("body_analyses"."status" in ('pending', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "body_analysis_areas" ADD CONSTRAINT "body_analysis_areas_score_check" CHECK ("body_analysis_areas"."score" is null or ("body_analysis_areas"."score" >= 1 and "body_analysis_areas"."score" <= 10));--> statement-breakpoint
ALTER TABLE "training_exercises" ADD CONSTRAINT "training_exercises_display_order_check" CHECK ("training_exercises"."display_order" >= 0 and "training_exercises"."display_order" <= 29);--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_duration_check" CHECK ("training_sessions"."duration_minutes" is null or ("training_sessions"."duration_minutes" >= 1 and "training_sessions"."duration_minutes" <= 600));--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_condition_check" CHECK ("training_sessions"."condition_score" is null or ("training_sessions"."condition_score" >= 1 and "training_sessions"."condition_score" <= 10));--> statement-breakpoint
ALTER TABLE "training_sets" ADD CONSTRAINT "training_sets_number_check" CHECK ("training_sets"."set_number" >= 1 and "training_sets"."set_number" <= 20);--> statement-breakpoint
ALTER TABLE "training_sets" ADD CONSTRAINT "training_sets_weight_check" CHECK ("training_sets"."weight_kg" is null or ("training_sets"."weight_kg" >= 0 and "training_sets"."weight_kg" <= 1000));--> statement-breakpoint
ALTER TABLE "training_sets" ADD CONSTRAINT "training_sets_reps_check" CHECK ("training_sets"."reps" is null or ("training_sets"."reps" >= 0 and "training_sets"."reps" <= 1000));
