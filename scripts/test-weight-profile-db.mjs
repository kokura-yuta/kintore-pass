// Actual weight route + database; only Clerk identity is replaced at the boundary.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { drizzle } from 'drizzle-orm/neon-http';
import * as orm from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import * as validation from '../app/lib/validation/apiSchemas.ts';

console.log('Ready for isolated test connection on hidden stdin.');
process.stdin.setRawMode?.(true);
const input = await new Promise(resolve => {
  let data = '';
  process.stdin.on('data', chunk => { data += chunk; if (data.includes('\n')) resolve(JSON.parse(data.trim())); });
});
process.stdin.setRawMode?.(false);
process.stdin.pause();
assert.equal(new URL(input.url).hostname, input.expectedHost);
assert.notEqual(input.expectedHost, 'ep-bitter-water-b360yvxr.c-4.ap-southeast-1.aws.neon.tech');
assert.notEqual(input.expectedHost, 'ep-bitter-water-b360yvxr-pooler.c-4.ap-southeast-1.aws.neon.tech');
const db = drizzle(input.url);
const ids = [randomUUID(), randomUUID(), randomUUID()];
const [a, b, noProfile] = ids;
function load(path, extra = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Response, Request, URL, Date, require: id => {
    if (id in extra) return extra[id];
    if (id === 'drizzle-orm') return orm;
    if (id === '@/db') return { getDb: () => db };
    if (id === '@/db/schema') return schema;
    if (id === '@/app/lib/validation/apiSchemas') return validation;
    if (id === '@/app/lib/auth/clerk-auth') return { getClerkUserId: async r => r.headers.get('authorization') };
    if (id === '@/app/lib/observability/serverLog') return { logServerError: (_, e) => { throw e; } };
    throw Error(`Unmapped module: ${id}`);
  } });
  return exports;
}
const mutation = load('../app/lib/weight-records.ts');
const route = load('../app/api/weight-records/route.ts', { '@/app/lib/weight-records': mutation });
async function request(method, body, who = a, query = '') {
  const r = await route[method](new Request(`https://example.test/api/weight-records${query}`, {
    method, headers: { ...(who ? { authorization: who } : {}), 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  return { status: r.status, data: await r.json() };
}
async function profileWeight(who = a) {
  return (await db.select().from(schema.userProfiles).where(orm.eq(schema.userProfiles.userId, who)))[0]?.weightKg;
}
try {
  await db.insert(schema.users).values(ids.map(id => ({ id, clerkUserId: id, email: `weight-${id}@example.invalid` })));
  await db.insert(schema.userProfiles).values([a,b].map(userId => ({ userId, heightCm: 175, weightKg: 70, weeklyTrainingDays: 3 })));
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    assert.equal((await request(method, undefined, null)).status, 401);
  }
  let r = await request('POST', { recordedDate: '2026-10-10', weightKg: 68 });
  assert.equal(r.status, 201); assert.equal(r.data.record.profileWeightKg, 68);
  const oldId = r.data.record.id;
  r = await request('POST', { recordedDate: '2026-10-11', weightKg: 67 });
  assert.equal(r.status, 201);
  const latestId = r.data.record.id;
  assert.equal(await profileWeight(), 67);
  r = await request('PATCH', { recordId: oldId, weightKg: 72 });
  assert.equal(r.data.record.profileWeightKg, 67); assert.equal(await profileWeight(), 67);
  r = await request('PATCH', { recordId: latestId, weightKg: 66 });
  assert.equal(r.data.record.profileWeightKg, 66); assert.equal(await profileWeight(), 66);
  assert.equal((await request('POST', { recordedDate: '2026-10-11', weightKg: 100 })).status, 409);
  assert.equal(await profileWeight(), 66);
  assert.equal((await request('PATCH', { recordId: latestId, weightKg: 100 }, b)).status, 404);
  assert.equal((await request('DELETE', undefined, b, `?recordId=${latestId}`)).status, 404);
  assert.equal(await profileWeight(b), 70); assert.equal(await profileWeight(), 66);
  assert.equal((await request('GET', undefined, b)).data.records.length, 0);
  assert.equal((await request('PATCH', { recordId: latestId, weightKg: 0 })).status, 400);
  r = await request('DELETE', undefined, a, `?recordId=${latestId}`);
  assert.equal(r.status, 200); assert.equal(r.data.profileWeightKg, 72); assert.equal(await profileWeight(), 72);
  await request('DELETE', undefined, a, `?recordId=${oldId}`);
  assert.equal(await profileWeight(), 72);
  // Old client response fields are intact; no profile must not prevent recording.
  r = await request('POST', { recordedDate: '2026-10-11', weightKg: 65 }, noProfile);
  assert.equal(r.status, 201); assert.equal(r.data.record.recordedDate, '2026-10-11');
  assert.equal(r.data.record.weightKg.toFixed(1), '65.0'); assert.equal(r.data.record.profileWeightKg, null);
  // Concurrent saves of different dates must leave the latest date in the profile.
  const concurrent = await Promise.all(['2026-10-11','2026-10-09'].map((recordedDate, i) =>
    request('POST', { recordedDate, weightKg: i ? 80 : 64 })));
  assert.ok(concurrent.every(r => r.status === 201)); assert.equal(await profileWeight(), 64);
  const failingDb = {
    select: db.select.bind(db), execute: db.execute.bind(db),
    batch: queries => db.batch([...queries, db.execute(orm.sql`select 1 / 0`)]),
  };
  await assert.rejects(mutation.mutateWeightRecord(failingDb, a, {
    kind: 'create', recordedDate: '2026-10-12', weightKg: 90,
  }));
  assert.equal(await profileWeight(), 64);
  const afterRollback = (await request('GET')).data.records;
  assert.equal(afterRollback.some(record => record.recordedDate === '2026-10-12'), false);
  console.log('PASS: actual weight route + isolated DB: latest/history edits, deletion fallback/last deletion, duplicate 409, concurrent saves, atomic rollback, 401/cross-user 404, no-profile and legacy response compatibility.');
} finally {
  await db.delete(schema.users).where(orm.inArray(schema.users.id, ids));
}
