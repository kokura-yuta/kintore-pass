import { sql } from 'drizzle-orm';
export const moderationList=()=>sql`SELECT r.id,r.reporter_id AS "reporterId",r.target_id AS "targetId",
 coalesce(r.reported_alias,s.alias,'筋トレPASユーザー') AS name,r.exercise_names AS "exerciseNames",r.reason,r.status,r.created_at AS "createdAt",r.resolved_at AS "resolvedAt",
 coalesce(s.social_suspended,false) AS suspended
 FROM friend_reports r LEFT JOIN friend_settings s ON s.user_id=r.target_id
 ORDER BY (r.status='pending') DESC,r.created_at DESC LIMIT 200`;
export const moderationChange=(reportId:string,action:'resolve'|'suspend'|'restore')=>sql`
 WITH report AS (UPDATE friend_reports SET status='resolved',resolved_at=now() WHERE id=${reportId}::uuid RETURNING target_id),
 changed AS (INSERT INTO friend_settings(user_id,social_suspended,email_search_enabled,share_training)
 SELECT target_id,${action==='suspend'},false,false FROM report WHERE ${action!=='resolve'}
 ON CONFLICT(user_id) DO UPDATE SET social_suspended=EXCLUDED.social_suspended,
 email_search_enabled=false,share_training=false RETURNING user_id),
 cancelled AS (UPDATE friendships SET status='cancelled',updated_at=now()
 WHERE ${action==='suspend'} AND (low_id IN(SELECT user_id FROM changed) OR high_id IN(SELECT user_id FROM changed)) RETURNING low_id)
 SELECT target_id FROM report`;
