ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "trial_choice_completed" boolean DEFAULT false NOT NULL;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "trial_used" boolean DEFAULT false NOT NULL;

ALTER TABLE "users"
ALTER COLUMN "trial_started_at" DROP DEFAULT,
ALTER COLUMN "trial_started_at" DROP NOT NULL,
ALTER COLUMN "trial_ends_at" DROP DEFAULT,
ALTER COLUMN "trial_ends_at" DROP NOT NULL;
