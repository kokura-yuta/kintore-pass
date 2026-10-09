// 検証用NeonブランチのURLをstdinから渡す。.env・本番URLは読み込まない。
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { PgDialect } from 'drizzle-orm/pg-core';
import { trainingRetentionQuery, activityRetentionQuery } from '../app/lib/admin/retentionQueries.ts';
const expectedHost = process.argv[2];
if (expectedHost !== 'ep-muddy-fog-b3tferae.c-4.ap-southeast-1.aws.neon.tech') throw new Error('今回作成した検証ブランチ以外での実行は禁止します。');
console.log('Ready for isolated test connection on stdin (hidden).');
process.stdin.setRawMode?.(true);
const url = await new Promise((resolve) => {
  let input = '';
  const receive = (data) => {
    input += data.toString();
    if (input.includes('\n')) { process.stdin.off('data', receive); resolve(JSON.parse(input.trim()).url); }
  };
  process.stdin.on('data', receive);
});
process.stdin.setRawMode?.(false);
process.stdin.pause();
if (new URL(url).hostname !== expectedHost) throw new Error('接続URLが検証ブランチと一致しません。');
const sql = neon(url);
const id = randomUUID(); const other = randomUUID();
const session = randomUUID(); const duplicate = randomUUID(); const empty = randomUUID(); const before = randomUUID();
const dialect = new PgDialect();
const query = async (statement) => { const q = dialect.sqlToQuery(statement); return sql.query(q.sql, q.params); };
const now = new Date();
const today = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
const registered = new Date(now.getTime() - 31 * 86_400_000);
try {
  await sql`INSERT INTO users(id, email, created_at) VALUES (${id}, ${`retention_${id}@example.invalid`}, ${registered.toISOString()}), (${other}, ${`retention_${other}@example.invalid`}, ${registered.toISOString()})`;
  await sql`INSERT INTO training_sessions(id,user_id,performed_at) VALUES (${session},${id},${now.toISOString()}),(${duplicate},${id},${now.toISOString()}),(${empty},${id},${now.toISOString()}),(${before},${id},${new Date(registered.getTime() - 86_400_000).toISOString()})`;
  for (const sid of [session, duplicate, before]) await sql`INSERT INTO training_exercises(session_id,exercise_id,exercise_name,body_part,display_order) VALUES (${sid},'retention-test','自動検証','胸',0)`;
  let row = (await query(trainingRetentionQuery(now))).find((r) => r.user_id === id);
  assert.equal(row.total, 1); assert.equal(row.last, today);
  await sql`UPDATE training_sessions SET performed_at = ${new Date(now.getTime()-86_400_000).toISOString()} WHERE id = ${session} AND user_id = ${id}`;
  row = (await query(trainingRetentionQuery(now))).find((r) => r.user_id === id); assert.equal(row.total, 2);
  await sql`DELETE FROM training_sessions WHERE id = ${duplicate} AND user_id = ${id}`;
  row = (await query(trainingRetentionQuery(now))).find((r) => r.user_id === id); assert.equal(row.total, 1);
  await sql`INSERT INTO app_usage_days(user_id,activity_date) VALUES (${id},${today}),(${id},${today}) ON CONFLICT DO NOTHING`;
  assert.equal(Number((await sql`SELECT count(*) AS n FROM app_usage_days WHERE user_id=${id}`)[0].n),1);
  assert.equal(Number((await sql`SELECT count(*) AS n FROM app_usage_days WHERE user_id=${other}`)[0].n),0);
  const activity = (await query(activityRetentionQuery)).find((r) => r.user_id===id); assert.equal(activity.started,today);
  await sql`DELETE FROM users WHERE id=${id}`;
  assert.equal(Number((await sql`SELECT count(*) AS n FROM app_usage_days WHERE user_id=${id}`)[0].n),0);
  assert.equal(Number((await sql`SELECT count(*) AS n FROM training_sessions WHERE user_id=${id}`)[0].n),0);
  console.log('PASS: actual aggregation, same-day dedup, empty/pre-registration exclusion, update/delete, daily uniqueness, user isolation and account cascade.');
} finally {
  await sql`DELETE FROM users WHERE id IN (${id},${other})`;
}
