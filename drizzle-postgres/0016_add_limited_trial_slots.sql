CREATE TABLE IF NOT EXISTS "premium_trial_slots" (
  "slot_number" integer PRIMARY KEY NOT NULL,
  "user_id" uuid UNIQUE,
  "claimed_at" timestamp with time zone,
  CONSTRAINT "premium_trial_slots_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "premium_trial_slots_number_check"
    CHECK ("slot_number" >= 1 AND "slot_number" <= 20)
);

CREATE INDEX IF NOT EXISTS "premium_trial_slots_user_idx"
  ON "premium_trial_slots" USING btree ("user_id");

-- 先着20枠を事前に作成する。再実行しても重複しない。
INSERT INTO "premium_trial_slots" ("slot_number")
SELECT slot_number
FROM generate_series(1, 20) AS slot_number
ON CONFLICT ("slot_number") DO NOTHING;

-- この変更より前に体験を開始済みの利用者も、開始日時が早い順に既存20枠へ割り当てる。
WITH ranked_existing_users AS (
  SELECT
    "id" AS "user_id",
    COALESCE("trial_started_at", "created_at") AS "claimed_at",
    ROW_NUMBER() OVER (
      ORDER BY COALESCE("trial_started_at", "created_at"), "id"
    )::integer AS "slot_number"
  FROM "users"
  WHERE "trial_used" = true
  ORDER BY COALESCE("trial_started_at", "created_at"), "id"
  LIMIT 20
)
UPDATE "premium_trial_slots" AS slots
SET
  "user_id" = ranked."user_id",
  "claimed_at" = ranked."claimed_at"
FROM ranked_existing_users AS ranked
WHERE slots."slot_number" = ranked."slot_number"
  AND slots."user_id" IS NULL;
