import { sql } from 'drizzle-orm';

const sociallyAllowed = (id:string, target:string) => sql`NOT EXISTS(SELECT 1 FROM friend_settings suspended
 WHERE suspended.user_id IN(${id}::uuid,${target}::uuid) AND suspended.social_suspended=true)`;

export const friendQuota = (id: string, kind: 'search' | 'request' | 'report') => sql`
 INSERT INTO friend_action_quotas(user_id,day,kind,used)
 VALUES(${id}::uuid,(now() AT TIME ZONE 'Asia/Tokyo')::date,${kind},1)
 ON CONFLICT(user_id,day,kind) DO UPDATE SET used=friend_action_quotas.used+1
 WHERE friend_action_quotas.used < ${kind === 'search' ? 30 : 20} RETURNING used`;
export const friendSearch = (id: string, value: string, byEmail: boolean) => sql`
 SELECT u.id,coalesce(s.alias,'筋トレPASユーザー') AS name
 FROM users u LEFT JOIN friend_settings s ON s.user_id=u.id
 WHERE u.id<>${id}::uuid AND NOT EXISTS(SELECT 1 FROM friend_blocks b
 WHERE (b.blocker_id=${id}::uuid AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=${id}::uuid))
 AND ${sociallyAllowed(id, byEmail ? id : value)} AND coalesce(s.social_suspended,false)=false AND ${byEmail
   ? sql`lower(u.email)=${value.toLowerCase()} AND s.email_search_enabled=true`
   : sql`u.id=${value}::uuid`} LIMIT 1`;
export const friendSettingsRead = (id: string) => sql`
 SELECT ${id}::uuid AS id,alias,coalesce(email_search_enabled,false) AS "emailSearchEnabled",
 coalesce(share_training,false) AS "shareTraining",coalesce(social_suspended,false) AS "socialSuspended" FROM (SELECT 1) x LEFT JOIN friend_settings ON user_id=${id}::uuid`;
export const friendSettingsSave = (id: string, alias: string | null, search: boolean, share: boolean) => sql`
 INSERT INTO friend_settings(user_id,alias,email_search_enabled,share_training) VALUES(${id}::uuid,${alias},${search},${share})
 ON CONFLICT(user_id) DO UPDATE SET alias=EXCLUDED.alias,email_search_enabled=EXCLUDED.email_search_enabled,share_training=EXCLUDED.share_training
 WHERE friend_settings.social_suspended=false OR (EXCLUDED.email_search_enabled=false AND EXCLUDED.share_training=false) RETURNING user_id`;
export const friendList = (id: string) => sql`
 SELECT CASE WHEN f.low_id=${id}::uuid THEN f.high_id ELSE f.low_id END AS id,
 coalesce(s.alias,'筋トレPASユーザー') AS name,f.status,(f.requester_id=${id}::uuid) AS outgoing
 FROM friendships f JOIN users u ON u.id=CASE WHEN f.low_id=${id}::uuid THEN f.high_id ELSE f.low_id END
 LEFT JOIN friend_settings s ON s.user_id=u.id
 WHERE ${id}::uuid IN(f.low_id,f.high_id) AND f.status IN('pending','accepted')
 AND coalesce(s.social_suspended,false)=false AND NOT EXISTS(SELECT 1 FROM friend_settings WHERE user_id=${id}::uuid AND social_suspended=true)
 AND NOT EXISTS(SELECT 1 FROM friend_blocks b WHERE (b.blocker_id=${id}::uuid AND b.blocked_id=u.id)
 OR (b.blocker_id=u.id AND b.blocked_id=${id}::uuid)) ORDER BY f.updated_at DESC LIMIT 200`;
export const friendRequest = (id: string, target: string) => sql`
 INSERT INTO friendships(low_id,high_id,requester_id,status)
 SELECT least(${id}::uuid,u.id),greatest(${id}::uuid,u.id),${id}::uuid,'pending' FROM users u WHERE u.id=${target}::uuid AND u.id<>${id}::uuid
 AND ${sociallyAllowed(id,target)}
 AND NOT EXISTS(SELECT 1 FROM friend_blocks b WHERE (b.blocker_id=${id}::uuid AND b.blocked_id=u.id)
 OR (b.blocker_id=u.id AND b.blocked_id=${id}::uuid))
 ON CONFLICT(low_id,high_id) DO UPDATE SET requester_id=EXCLUDED.requester_id,status='pending',updated_at=now()
 WHERE friendships.status IN('rejected','cancelled') AND friendships.updated_at < now()-interval '1 day' RETURNING status`;
export const friendChange = (id: string, target: string, action: 'accept' | 'reject' | 'cancel' | 'remove') => {
  const next = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'cancelled';
  return sql`UPDATE friendships SET status=${next},updated_at=now()
    WHERE low_id=least(${id}::uuid,${target}::uuid) AND high_id=greatest(${id}::uuid,${target}::uuid)
    AND ${id}::uuid IN(low_id,high_id) AND ${action === 'remove' ? sql`status='accepted'`
      : action === 'cancel' ? sql`status='pending' AND requester_id=${id}::uuid`
      : sql`status='pending' AND requester_id<>${id}::uuid`}
    AND ${sociallyAllowed(id,target)} AND NOT EXISTS(SELECT 1 FROM friend_blocks b WHERE (b.blocker_id=${id}::uuid AND b.blocked_id=${target}::uuid)
    OR (b.blocker_id=${target}::uuid AND b.blocked_id=${id}::uuid)) RETURNING status`;
};
// 友達関係と公開設定を記録取得と同じSQLで検査。メモ・体重・写真・会話は一切SELECTしない。
export const friendProfile = (id: string, target: string, month?: string) => sql`
 SELECT u.id,coalesce(fs.alias,'筋トレPASユーザー') AS name,coalesce(fs.share_training,false) AS shared,
 CASE WHEN fs.share_training THEN coalesce((
   SELECT json_agg(records ORDER BY records."performedAt" DESC) FROM (
     SELECT s.performed_at AS "performedAt", coalesce((SELECT json_agg(json_build_object(
       'name',e.exercise_name,'bodyPart',e.body_part,'sets',coalesce((SELECT json_agg(json_build_object(
       'setNumber',t.set_number,'weightKg',t.weight_kg,'reps',t.reps) ORDER BY t.set_number) FROM training_sets t WHERE t.training_exercise_id=e.id),'[]'::json))
       ORDER BY e.display_order) FROM training_exercises e WHERE e.session_id=s.id),'[]'::json) AS exercises
     FROM training_sessions s WHERE s.user_id=u.id AND s.performed_at<=now()
       ${month ? sql`AND s.performed_at >= (${month + '-01'}::date::timestamp AT TIME ZONE 'Asia/Tokyo')
         AND s.performed_at < ((${month + '-01'}::date + interval '1 month')::timestamp AT TIME ZONE 'Asia/Tokyo')` : sql``}
       AND EXISTS(SELECT 1 FROM training_exercises e WHERE e.session_id=s.id)
     ORDER BY s.performed_at DESC ${month ? sql`` : sql`LIMIT 20`}
   ) records
 ),'[]'::json) ELSE '[]'::json END AS records
 FROM users u LEFT JOIN friend_settings fs ON fs.user_id=u.id
 WHERE u.id=${target}::uuid AND ${sociallyAllowed(id,target)} AND NOT EXISTS(SELECT 1 FROM friend_blocks b
 WHERE (b.blocker_id=${id}::uuid AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=${id}::uuid))
 AND EXISTS(SELECT 1 FROM friendships f
 WHERE f.low_id=least(${id}::uuid,u.id) AND f.high_id=greatest(${id}::uuid,u.id)
 AND ${id}::uuid IN(f.low_id,f.high_id) AND f.status='accepted')`;

export const friendBlockList = (id: string) => sql`SELECT blocked_id AS id FROM friend_blocks WHERE blocker_id=${id}::uuid ORDER BY created_at DESC LIMIT 200`;
// The relationship is cancelled in the same statement; unblocking cannot restore it.
export const friendBlock = (id: string, target: string) => sql`
 WITH added AS (INSERT INTO friend_blocks(blocker_id,blocked_id)
 SELECT ${id}::uuid,id FROM users WHERE id=${target}::uuid AND id<>${id}::uuid
 ON CONFLICT(blocker_id,blocked_id) DO UPDATE SET created_at=friend_blocks.created_at RETURNING blocked_id),
 cancelled AS (UPDATE friendships SET status='cancelled',updated_at=now()
 WHERE low_id=least(${id}::uuid,${target}::uuid) AND high_id=greatest(${id}::uuid,${target}::uuid)
 AND EXISTS(SELECT 1 FROM added) RETURNING low_id) SELECT blocked_id FROM added`;
export const friendUnblock = (id: string, target: string) => sql`
 WITH removed AS (DELETE FROM friend_blocks WHERE blocker_id=${id}::uuid AND blocked_id=${target}::uuid RETURNING blocked_id),
 cancelled AS (UPDATE friendships SET status='cancelled',updated_at=now()
 WHERE low_id=least(${id}::uuid,${target}::uuid) AND high_id=greatest(${id}::uuid,${target}::uuid)
 AND EXISTS(SELECT 1 FROM removed) RETURNING low_id) SELECT blocked_id FROM removed`;
// Reports require a relationship the reporter can actually see. No email/body/chat snapshots.
export const friendReport = (id: string, target: string, reason: string) => sql`
 INSERT INTO friend_reports(reporter_id,target_id,reason,reported_alias,exercise_names)
 SELECT ${id}::uuid,${target}::uuid,${reason},s.alias,
 CASE WHEN s.share_training AND NOT s.social_suspended AND EXISTS(SELECT 1 FROM friendships f
 WHERE low_id=least(${id}::uuid,${target}::uuid) AND high_id=greatest(${id}::uuid,${target}::uuid) AND status='accepted')
 THEN coalesce((SELECT jsonb_agg(name) FROM (SELECT e.exercise_name AS name FROM training_exercises e
 JOIN training_sessions ts ON ts.id=e.session_id WHERE ts.user_id=${target}::uuid AND ts.performed_at<=now()
 ORDER BY ts.performed_at DESC,e.display_order LIMIT 20) names),'[]'::jsonb) ELSE '[]'::jsonb END
 FROM users u LEFT JOIN friend_settings s ON s.user_id=u.id WHERE u.id=${target}::uuid AND EXISTS(SELECT 1 FROM friendships f
 WHERE low_id=least(${id}::uuid,${target}::uuid) AND high_id=greatest(${id}::uuid,${target}::uuid)
 AND status IN('pending','accepted'))
 AND NOT EXISTS(SELECT 1 FROM friend_reports WHERE reporter_id=${id}::uuid AND target_id=${target}::uuid AND status='pending')
 ON CONFLICT DO NOTHING
 RETURNING id`;
