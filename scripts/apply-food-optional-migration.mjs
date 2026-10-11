// Apply the checked-in Drizzle migration via a direct connection on hidden stdin.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

console.log('Ready for migration connection on hidden stdin.');
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
const host = new URL(input.url).hostname;
assert.equal(host, input.expectedHost);
assert.ok(!host.includes('-pooler'), 'Migrations require a direct connection');
const db = drizzle(input.url);
const migration = readFileSync(new URL('../drizzle-postgres/0021_optional_food_nutrients.sql', import.meta.url), 'utf8');
const statements = migration.replace(/--[^\n]*/g, '').split(';').map(value => value.trim()).filter(Boolean);
assert.equal(statements.length, 3);
const fingerprint = sql`SELECT count(*)::int AS n, md5(coalesce(string_agg(row_to_json(f)::text, '' ORDER BY id), '')) AS fingerprint FROM food_records f`;
// Compare in one transaction so concurrent records cannot skew the integrity check.
const results = await db.batch([
  db.execute(sql`SET LOCAL lock_timeout = '5s'`),
  db.execute(sql`LOCK TABLE food_records IN SHARE ROW EXCLUSIVE MODE`),
  db.execute(fingerprint),
  ...statements.map(statement => db.execute(sql.raw(statement))),
  db.execute(fingerprint),
  db.execute(sql`SELECT column_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='food_records' AND column_name IN ('calories','protein_grams') ORDER BY column_name`),
]);
assert.deepEqual(results[2].rows, results[6].rows);
for (const column of results[7].rows) { assert.equal(column.is_nullable, 'YES'); assert.equal(column.column_default, null); }
console.log('PASS: 0021 applied atomically; existing food row count and full-row fingerprint unchanged; both nutrients nullable.');
