import { sql } from 'drizzle-orm';
export const eligiblePair=(recipient:string,sender:string)=>sql`
 EXISTS(SELECT 1 FROM friendships WHERE low_id=least(${recipient}::uuid,${sender}::uuid) AND high_id=greatest(${recipient}::uuid,${sender}::uuid) AND status='accepted')
 AND NOT EXISTS(SELECT 1 FROM friend_blocks WHERE (blocker_id=${recipient}::uuid AND blocked_id=${sender}::uuid) OR (blocker_id=${sender}::uuid AND blocked_id=${recipient}::uuid))
 AND NOT EXISTS(SELECT 1 FROM friend_settings WHERE user_id IN(${recipient}::uuid,${sender}::uuid) AND social_suspended)`;
export const notificationState=(id:string)=>sql`SELECT ${id}::uuid AS id,
 coalesce((SELECT enabled FROM friend_notification_preferences WHERE user_id=${id}::uuid),false) AS enabled,
 coalesce((SELECT json_agg(friend_id) FROM friend_notification_subscriptions WHERE user_id=${id}::uuid AND enabled),'[]'::json) AS friends`;
export const notificationGlobal=(id:string,enabled:boolean)=>sql`INSERT INTO friend_notification_preferences(user_id,enabled) VALUES(${id}::uuid,${enabled}) ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled RETURNING enabled`;
export const notificationFriend=(id:string,target:string,enabled:boolean)=>sql`
 INSERT INTO friend_notification_subscriptions(user_id,friend_id,enabled)
 SELECT ${id}::uuid,${target}::uuid,${enabled} WHERE ${!enabled
  ? sql`(${eligiblePair(id,target)} OR EXISTS(SELECT 1 FROM friend_notification_subscriptions WHERE user_id=${id}::uuid AND friend_id=${target}::uuid))`
  : eligiblePair(id,target)}
 ON CONFLICT(user_id,friend_id) DO UPDATE SET enabled=EXCLUDED.enabled RETURNING enabled`;
// A resume with the same authenticated session/token is a heartbeat, not a new registration.
// Never reactivate or transfer a device through this quota-free path.
export const refreshDevice=(id:string,session:string,hash:string,token:string)=>sql`
 UPDATE friend_push_devices SET updated_at=now()
 WHERE installation_hash=${hash} AND user_id=${id}::uuid
 AND clerk_session_id=${session} AND push_token=${token} AND active
 RETURNING active`;
export const registerDevice=(id:string,session:string,hash:string,token:string)=>sql`
 INSERT INTO friend_push_devices(installation_hash,user_id,clerk_session_id,push_token,active)
 SELECT ${hash},${id}::uuid,${session},${token},true WHERE
 (SELECT count(*) FROM friend_push_devices WHERE user_id=${id}::uuid AND active)<10
 OR EXISTS(SELECT 1 FROM friend_push_devices WHERE installation_hash=${hash})
 ON CONFLICT(installation_hash) DO UPDATE SET user_id=EXCLUDED.user_id,clerk_session_id=EXCLUDED.clerk_session_id,push_token=EXCLUDED.push_token,active=true,updated_at=now()
 RETURNING active`;
export const unregisterDevice=(id:string,hash:string)=>sql`DELETE FROM friend_push_devices WHERE user_id=${id}::uuid AND installation_hash=${hash}`;
export const claimNotifications=()=>sql`
 WITH candidates AS (SELECT id FROM friend_push_outbox WHERE claimed_at IS NULL AND finished_at IS NULL
 ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED)
 UPDATE friend_push_outbox q SET claimed_at=now() FROM candidates c WHERE q.id=c.id RETURNING q.*`;
export const notificationTargets=(id:string,recipient:string,sender:string)=>sql`
 SELECT d.installation_hash AS hash,d.push_token AS token,d.clerk_session_id AS session,u.clerk_user_id AS "clerkUserId"
 FROM friend_push_devices d JOIN users u ON u.id=d.user_id
 JOIN friend_notification_preferences g ON g.user_id=d.user_id AND g.enabled
 JOIN friend_notification_subscriptions p ON p.user_id=d.user_id AND p.friend_id=${sender}::uuid AND p.enabled
 WHERE d.user_id=${recipient}::uuid AND d.active AND d.updated_at>now()-interval '90 days'
 AND ${eligiblePair(recipient,sender)} AND EXISTS(SELECT 1 FROM friend_settings WHERE user_id=${sender}::uuid AND share_training AND NOT social_suspended)
 AND EXISTS(SELECT 1 FROM friend_push_outbox q JOIN training_sessions ts ON ts.id=q.session_id
 WHERE q.id=${id}::uuid AND q.created_at>now()-interval '1 day' AND ts.user_id=${sender}::uuid AND ts.performed_at<=now()
 AND q.performed_on=(ts.performed_at AT TIME ZONE 'Asia/Tokyo')::date
 AND EXISTS(SELECT 1 FROM training_exercises WHERE session_id=ts.id))`;
