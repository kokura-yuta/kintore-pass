CREATE TABLE friend_notification_preferences (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE TABLE friend_notification_subscriptions (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 PRIMARY KEY(user_id,friend_id), CONSTRAINT friend_notification_subscriptions_self CHECK(user_id<>friend_id)
);
--> statement-breakpoint
CREATE TABLE friend_push_devices (
 installation_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 clerk_session_id text NOT NULL,
 push_token text NOT NULL CONSTRAINT friend_push_devices_push_token_unique UNIQUE,
 active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX friend_push_devices_user_idx ON friend_push_devices(user_id);
--> statement-breakpoint
CREATE TABLE friend_push_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
 performed_on date NOT NULL,
 notification_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Tokyo')::date,
 created_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 finished_at timestamptz,
 CONSTRAINT friend_push_outbox_daily_idx UNIQUE(sender_id,recipient_id,notification_day)
);
--> statement-breakpoint
CREATE INDEX friend_push_outbox_pending_idx ON friend_push_outbox(created_at) WHERE claimed_at IS NULL AND finished_at IS NULL;
--> statement-breakpoint
CREATE TABLE friend_push_receipts (
 ticket_id text PRIMARY KEY,
 installation_hash text NOT NULL REFERENCES friend_push_devices(installation_hash) ON DELETE CASCADE,
 push_token text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 checked_at timestamptz
);
--> statement-breakpoint
CREATE FUNCTION enqueue_friend_training_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.performed_at > now() THEN RETURN NEW; END IF;
 INSERT INTO friend_push_outbox(sender_id,recipient_id,session_id,performed_on)
 SELECT NEW.user_id,p.user_id,NEW.id,(NEW.performed_at AT TIME ZONE 'Asia/Tokyo')::date
 FROM friend_notification_subscriptions p
 JOIN friend_notification_preferences g ON g.user_id=p.user_id AND g.enabled
 JOIN friend_settings s ON s.user_id=NEW.user_id AND s.share_training AND NOT s.social_suspended
 JOIN friendships f ON f.low_id=least(NEW.user_id,p.user_id) AND f.high_id=greatest(NEW.user_id,p.user_id) AND f.status='accepted'
 WHERE p.friend_id=NEW.user_id AND p.enabled
 AND NOT EXISTS(SELECT 1 FROM friend_settings WHERE user_id=p.user_id AND social_suspended)
 AND NOT EXISTS(SELECT 1 FROM friend_blocks WHERE (blocker_id=p.user_id AND blocked_id=NEW.user_id) OR (blocker_id=NEW.user_id AND blocked_id=p.user_id))
 AND EXISTS(SELECT 1 FROM friend_push_devices WHERE user_id=p.user_id AND active)
 ON CONFLICT(sender_id,recipient_id,notification_day) DO UPDATE SET session_id=EXCLUDED.session_id,performed_on=EXCLUDED.performed_on
 WHERE friend_push_outbox.claimed_at IS NULL AND friend_push_outbox.finished_at IS NULL;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER training_friend_push AFTER INSERT OR UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION enqueue_friend_training_notification();
