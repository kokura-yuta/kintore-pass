CREATE TABLE "food_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recorded_date" date NOT NULL,
	"meal_type" text NOT NULL,
	"name" text NOT NULL,
	"calories" real NOT NULL,
	"protein_grams" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_records_meal_type_check" CHECK ("food_records"."meal_type" in ('朝食', '昼食', '夕食', '間食')),
	CONSTRAINT "food_records_calories_check" CHECK ("food_records"."calories" >= 0 and "food_records"."calories" <= 10000),
	CONSTRAINT "food_records_protein_check" CHECK ("food_records"."protein_grams" >= 0 and "food_records"."protein_grams" <= 1000)
);
--> statement-breakpoint
ALTER TABLE "food_records" ADD CONSTRAINT "food_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_records_user_date_created_idx" ON "food_records" USING btree ("user_id","recorded_date","created_at");