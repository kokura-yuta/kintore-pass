import { sql } from 'drizzle-orm';
export const trainingRetentionQuery = (now: Date) => sql`WITH days AS (
  SELECT DISTINCT s.user_id, (s.performed_at AT TIME ZONE 'Asia/Tokyo')::date AS day
  FROM training_sessions s JOIN users u ON u.id = s.user_id
  WHERE (s.performed_at AT TIME ZONE 'Asia/Tokyo')::date >= (u.created_at AT TIME ZONE 'Asia/Tokyo')::date
  AND s.performed_at <= ${now.toISOString()}::timestamptz
  AND EXISTS (SELECT 1 FROM training_exercises e WHERE e.session_id = s.id)
) SELECT user_id, count(*)::int AS total, max(day)::text AS last,
  coalesce(json_agg(day::text), '[]') AS days
  FROM days GROUP BY user_id`;

// 全起動履歴を転送せず、対象のD7/D14/D30と最初の計測日だけ取得する。
export const activityRetentionQuery = sql`SELECT a.user_id, min(a.activity_date)::text AS started,
  coalesce(json_agg(a.activity_date::text) FILTER (
    WHERE a.activity_date - (u.created_at AT TIME ZONE 'Asia/Tokyo')::date IN (7, 14, 30, 60, 90)
  ), '[]') AS days FROM app_usage_days a JOIN users u ON u.id = a.user_id GROUP BY a.user_id`;
