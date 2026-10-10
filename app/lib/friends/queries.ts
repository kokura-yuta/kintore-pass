import { sql } from 'drizzle-orm';

export const friendQuota = (id: string, kind: 'search' | 'request') => sql`
 INSERT INTO friend_action_quotas(user_id,day,kind,used)
 VALUES(${id}::uuid,(now() AT TIME ZONE 'Asia/Tokyo')::date,${kind},1)
 ON CONFLICT(user_id,day,kind) DO UPDATE SET used=friend_action_quotas.used+1
 WHERE friend_action_quotas.used < ${kind === 'search' ? 30 : 20} RETURNING used`;
export const friendSearch = (id: string, value: string, byEmail: boolean) => sql`
 SELECT u.id,coalesce(s.alias,'筋トレPASユーザー') AS name
 FROM users u LEFT JOIN friend_settings s ON s.user_id=u.id
 WHERE u.id<>${id}::uuid AND ${byEmail
   ? sql`lower(u.email)=${value.toLowerCase()} AND s.email_search_enabled=true`
   : sql`u.id=${value}::uuid`} LIMIT 1`;
export const friendSettingsRead = (id: string) => sql`
 SELECT ${id}::uuid AS id,alias,coalesce(email_search_enabled,false) AS "emailSearchEnabled",
 coalesce(share_training,false) AS "shareTraining" FROM (SELECT 1) x LEFT JOIN friend_settings ON user_id=${id}::uuid`;
export const friendSettingsSave = (id: string, alias: string | null, search: boolean, share: boolean) => sql`
 INSERT INTO friend_settings(user_id,alias,email_search_enabled,share_training) VALUES(${id}::uuid,${alias},${search},${share})
 ON CONFLICT(user_id) DO UPDATE SET alias=EXCLUDED.alias,email_search_enabled=EXCLUDED.email_search_enabled,share_training=EXCLUDED.share_training RETURNING user_id`;
export const friendList = (id: string) => sql`
 SELECT CASE WHEN f.low_id=${id}::uuid THEN f.high_id ELSE f.low_id END AS id,
 coalesce(s.alias,'筋トレPASユーザー') AS name,f.status,(f.requester_id=${id}::uuid) AS outgoing
 FROM friendships f JOIN users u ON u.id=CASE WHEN f.low_id=${id}::uuid THEN f.high_id ELSE f.low_id END
 LEFT JOIN friend_settings s ON s.user_id=u.id
 WHERE ${id}::uuid IN(f.low_id,f.high_id) AND f.status IN('pending','accepted') ORDER BY f.updated_at DESC LIMIT 200`;
export const friendRequest = (id: string, target: string) => sql`
 INSERT INTO friendships(low_id,high_id,requester_id,status)
 SELECT least(${id}::uuid,u.id),greatest(${id}::uuid,u.id),${id}::uuid,'pending' FROM users u WHERE u.id=${target}::uuid AND u.id<>${id}::uuid
 ON CONFLICT(low_id,high_id) DO UPDATE SET requester_id=EXCLUDED.requester_id,status='pending',updated_at=now()
 WHERE friendships.status IN('rejected','cancelled') AND friendships.updated_at < now()-interval '1 day' RETURNING status`;
export const friendChange = (id: string, target: string, action: 'accept' | 'reject' | 'cancel' | 'remove') => {
  const next = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'cancelled';
  return sql`UPDATE friendships SET status=${next},updated_at=now()
    WHERE low_id=least(${id}::uuid,${target}::uuid) AND high_id=greatest(${id}::uuid,${target}::uuid)
    AND ${id}::uuid IN(low_id,high_id) AND ${action === 'remove' ? sql`status='accepted'`
      : action === 'cancel' ? sql`status='pending' AND requester_id=${id}::uuid`
      : sql`status='pending' AND requester_id<>${id}::uuid`} RETURNING status`;
};
// 友達関係と公開設定を記録取得と同じSQLで検査。メモ・体重・写真・会話は一切SELECTしない。
export const friendProfile = (id: string, target: string) => sql`
 SELECT u.id,coalesce(fs.alias,'筋トレPASユーザー') AS name,coalesce(fs.share_training,false) AS shared,
 CASE WHEN fs.share_training THEN coalesce((
   SELECT json_agg(records ORDER BY records."performedAt" DESC) FROM (
     SELECT s.performed_at AS "performedAt", coalesce((SELECT json_agg(json_build_object(
       'name',e.exercise_name,'bodyPart',e.body_part,'sets',coalesce((SELECT json_agg(json_build_object(
       'setNumber',t.set_number,'weightKg',t.weight_kg,'reps',t.reps) ORDER BY t.set_number) FROM training_sets t WHERE t.training_exercise_id=e.id),'[]'::json))
       ORDER BY e.display_order) FROM training_exercises e WHERE e.session_id=s.id),'[]'::json) AS exercises
     FROM training_sessions s WHERE s.user_id=u.id AND s.performed_at<=now()
       AND EXISTS(SELECT 1 FROM training_exercises e WHERE e.session_id=s.id)
     ORDER BY s.performed_at DESC LIMIT 20
   ) records
 ),'[]'::json) ELSE '[]'::json END AS records
 FROM users u LEFT JOIN friend_settings fs ON fs.user_id=u.id
 WHERE u.id=${target}::uuid AND EXISTS(SELECT 1 FROM friendships f
 WHERE f.low_id=least(${id}::uuid,u.id) AND f.high_id=greatest(${id}::uuid,u.id)
 AND ${id}::uuid IN(f.low_id,f.high_id) AND f.status='accepted')`;
