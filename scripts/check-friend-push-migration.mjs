// Isolated-branch verification only. Credentials arrive on hidden stdin, never argv.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

console.log('Ready for isolated notification DB verification on hidden stdin.');
process.stdin.setRawMode?.(true);
const input = await new Promise((resolve, reject) => {
  let data = '';
  process.stdin.on('data', chunk => {
    data += chunk;
    if (data.includes('\n')) {
      try { resolve(JSON.parse(data.trim())); } catch { reject(new Error('Invalid verification input')); }
    }
  });
});
process.stdin.setRawMode?.(false);
process.stdin.pause();

try {
  assert.equal(input.branchId, 'br-green-brook-b357hvfw');
  assert.equal(input.isolated, true);
  const host = new URL(input.url).hostname;
  assert.equal(host, input.expectedHost);
  assert.ok(!host.includes('-pooler'), 'Direct connection required');
  const db = drizzle(input.url);
  const existing = await db.execute(sql`SELECT to_regclass('public.friend_push_devices')::text AS devices`);
  assert.equal(existing.rows[0].devices, null, 'Already prepared; do not reapply');
  // Preserve SQL function bodies: split only on the Drizzle statement marker.
  const migration = readFileSync(new URL('../drizzle-postgres/0022_friend_push_notifications.sql', import.meta.url), 'utf8');
  const statements = migration.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 9);
  const counts = sql`SELECT (SELECT count(*)::int FROM users) AS users,
    (SELECT count(*)::int FROM training_sessions) AS sessions,
    (SELECT count(*)::int FROM food_records) AS foods`;
  const result = await db.batch([
    db.execute(sql`SET LOCAL lock_timeout = '5s'`),
    db.execute(counts),
    ...statements.map(s => db.execute(sql.raw(s))),
    db.execute(counts),
  ]);
  assert.deepEqual(result[1].rows, result.at(-1).rows, 'Existing row counts changed');
  // Synthetic fixtures only, on the explicitly pinned expiring test branch.
  const validation = readFileSync(new URL('../tests/friend-push-db-validation.sql', import.meta.url), 'utf8');
  await db.execute(sql.raw(validation));
  const trigger = await db.execute(sql`SELECT count(*)::int AS n FROM pg_trigger
    WHERE tgname='training_friend_push' AND NOT tgisinternal`);
  assert.equal(trigger.rows[0].n, 1);
  console.log('PASS: migration 0022 applied atomically on isolated branch; prior row counts unchanged; default OFF, friendship, sharing, block, suspension, daily duplicate and legacy record checks passed. No provider calls.');
} catch (error) {
  // Never print a driver error, connection string, credentials or fixture rows.
  console.error('FAIL: notification DB verification did not complete.', error instanceof assert.AssertionError ? error.message : 'Inspect schema and connectivity without printing credentials.');
  process.exitCode = 1;
}
