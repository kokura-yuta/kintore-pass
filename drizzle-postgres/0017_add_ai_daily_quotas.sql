-- 旧APIを停止して適用し、その後新APIを起動すること。
BEGIN;
CREATE TABLE ai_daily_quotas (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('chat', 'menu')),
  day_start timestamptz NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (user_id, feature, day_start)
);
-- 削除済み会話も、残っている成功リクエスト記録から引き継ぐ。
-- 履歴とガードは重複加算せず、多い側を採用する。
INSERT INTO ai_daily_quotas (user_id, feature, day_start, used)
SELECT user_id, feature, day_start, max(used)::integer FROM (
  SELECT user_id, request_type AS feature,
    date_trunc('day', created_at AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo' AS day_start,
    count(*) AS used
  FROM ai_request_guards WHERE request_type IN ('chat', 'menu')
  GROUP BY user_id, request_type, day_start
  UNION ALL
  SELECT c.user_id, 'chat',
    date_trunc('day', m.created_at AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo', count(*)
  FROM chat_messages m JOIN chat_conversations c ON c.id = m.conversation_id
  WHERE m.role = 'user' GROUP BY c.user_id, 3
  UNION ALL
  SELECT user_id, 'menu',
    date_trunc('day', created_at AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo', count(*)
  FROM ai_generated_menus GROUP BY user_id, 3
) AS history GROUP BY user_id, feature, day_start;
COMMIT;
