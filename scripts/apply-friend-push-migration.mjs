// Production-only additive migration. Prior validation is in check-friend-push-migration.mjs.
// No fixtures, user settings changes, push provider calls, or credential logging.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drizzle} from 'drizzle-orm/neon-http';
import {sql} from 'drizzle-orm';

console.log('Ready for production notification migration on hidden stdin.');
process.stdin.setRawMode?.(true);
const input = await new Promise(resolve => {
  let data = '';
  process.stdin.on('data', chunk => {
    data += chunk;
    if (data.includes('\n')) resolve(JSON.parse(data.trim()));
  });
});
process.stdin.setRawMode?.(false);
process.stdin.pause();
try {
  assert.equal(input.branchId, 'br-winter-haze-b39fdey8');
  assert.equal(input.confirmMigration, '0022-additive-production');
  const host = new URL(input.url).hostname;
  assert.equal(host, 'ep-bitter-water-b360yvxr.c-4.ap-southeast-1.aws.neon.tech');
  const db = drizzle(input.url);
  const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename IN ('friend_notification_preferences','friend_notification_subscriptions',
      'friend_push_devices','friend_push_outbox','friend_push_receipts')`);
  assert.equal(tables.rows.length, 0, 'Notification tables already exist; inspect instead of reapplying');
  const migration = readFileSync(new URL('../drizzle-postgres/0022_friend_push_notifications.sql', import.meta.url), 'utf8');
  const statements = migration.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 9);
  const fingerprint = sql`SELECT
    (SELECT md5(coalesce(string_agg(row_to_json(u)::text, '' ORDER BY id),'')) FROM users u) AS users,
    (SELECT md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY id),'')) FROM training_sessions t) AS sessions,
    (SELECT md5(coalesce(string_agg(row_to_json(f)::text, '' ORDER BY id),'')) FROM food_records f) AS foods`;
  const results = await db.batch([
    db.execute(sql`SET LOCAL lock_timeout='5s'`),
    db.execute(sql`SET LOCAL statement_timeout='20s'`),
    db.execute(sql`LOCK TABLE users, training_sessions, food_records IN SHARE ROW EXCLUSIVE MODE`),
    db.execute(fingerprint),
    ...statements.map(s => db.execute(sql.raw(s))),
    db.execute(fingerprint),
  ]);
  assert.deepEqual(results[3].rows, results.at(-1).rows, 'Existing data fingerprint changed');
  const verify = await db.execute(sql`SELECT
    (SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename IN
      ('friend_notification_preferences','friend_notification_subscriptions','friend_push_devices','friend_push_outbox','friend_push_receipts')) AS tables,
    (SELECT count(*)::int FROM pg_trigger WHERE tgname='training_friend_push' AND NOT tgisinternal) AS triggers,
    (SELECT count(*)::int FROM friend_push_outbox) AS queued,
    (SELECT count(*)::int FROM friend_notification_preferences) AS preferences,
    (SELECT count(*)::int FROM friend_push_devices) AS devices`);
  assert.deepEqual(verify.rows[0], {tables:5,triggers:1,queued:0,preferences:0,devices:0});
  console.log('PASS: production migration 0022 committed; five tables and one trigger; existing data unchanged; no subscriptions/devices/notifications created.');
} catch {
  console.error('FAIL: production notification migration did not verify; inspect state before any retry. Credentials and user data omitted.');
  process.exitCode = 1;
}
