CREATE TABLE IF NOT EXISTS friend_blocks (
 blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id), CONSTRAINT friend_blocks_self CHECK(blocker_id<>blocked_id)
);
CREATE INDEX IF NOT EXISTS friend_blocks_blocked_idx ON friend_blocks(blocked_id);
CREATE TABLE IF NOT EXISTS friend_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 target_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason text NOT NULL CONSTRAINT friend_reports_reason CHECK(reason IN ('harassment','inappropriate','spam','other')),
 status text NOT NULL DEFAULT 'pending' CONSTRAINT friend_reports_status CHECK(status IN ('pending','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
 CONSTRAINT friend_reports_self CHECK(reporter_id<>target_id)
);
CREATE INDEX IF NOT EXISTS friend_reports_pending_idx ON friend_reports(status,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS friend_reports_open_idx ON friend_reports(reporter_id,target_id) WHERE status='pending';
ALTER TABLE friend_settings ADD COLUMN IF NOT EXISTS social_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE friend_reports ADD COLUMN IF NOT EXISTS reported_alias text;
ALTER TABLE friend_reports ADD COLUMN IF NOT EXISTS exercise_names jsonb NOT NULL DEFAULT '[]'::jsonb;
