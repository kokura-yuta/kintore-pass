-- 過去の利用を推測して補完しない。旧ユーザー・旧ビルドは未計測として扱う。
CREATE TABLE IF NOT EXISTS app_usage_days (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);
CREATE INDEX IF NOT EXISTS app_usage_days_activity_date_idx ON app_usage_days(activity_date);
