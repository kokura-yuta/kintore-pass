ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "trial_started_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone DEFAULT (now() + interval '7 days') NOT NULL;

CREATE INDEX IF NOT EXISTS "users_trial_ends_at_idx"
ON "users" ("trial_ends_at");
