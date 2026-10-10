-- 加算のみ。既存プロフィール・記録・利用イベントを流用する。
CREATE TABLE IF NOT EXISTS training_goal_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effective_on date NOT NULL, weekly_goal integer CONSTRAINT training_goal_history_range CHECK (weekly_goal BETWEEN 1 AND 7),
  estimated boolean NOT NULL DEFAULT false, PRIMARY KEY(user_id,effective_on)
);
-- 保存されていなかった過去の目標を事実として捏造しない。
INSERT INTO training_goal_history(user_id,effective_on,weekly_goal,estimated)
SELECT u.id,(u.created_at AT TIME ZONE 'Asia/Tokyo')::date,p.weekly_training_days,true
FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION record_training_goal_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.weekly_training_days IS DISTINCT FROM OLD.weekly_training_days THEN
    INSERT INTO training_goal_history(user_id,effective_on,weekly_goal,estimated)
    SELECT NEW.user_id,(u.created_at AT TIME ZONE 'Asia/Tokyo')::date,NULL,true FROM users u WHERE u.id=NEW.user_id
    ON CONFLICT DO NOTHING;
    INSERT INTO training_goal_history(user_id,effective_on,weekly_goal,estimated)
    VALUES(NEW.user_id,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date,NEW.weekly_training_days,false)
    ON CONFLICT(user_id,effective_on) DO UPDATE SET weekly_goal=EXCLUDED.weekly_goal,estimated=false;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER user_profiles_goal_history AFTER INSERT OR UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION record_training_goal_history();
CREATE TABLE IF NOT EXISTS friend_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, alias text,
  email_search_enabled boolean NOT NULL DEFAULT false, share_training boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS friendships (
  low_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  high_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CONSTRAINT friendships_status CHECK(status IN ('pending','accepted','rejected','cancelled')),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(low_id,high_id),
  CONSTRAINT friendships_pair CHECK(low_id < high_id AND requester_id IN(low_id,high_id))
);
CREATE INDEX IF NOT EXISTS friendships_high_idx ON friendships(high_id);
CREATE TABLE IF NOT EXISTS friend_action_quotas (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL, kind text NOT NULL, used integer NOT NULL CONSTRAINT friend_action_quotas_used CHECK(used>=0), PRIMARY KEY(user_id,day,kind)
);
