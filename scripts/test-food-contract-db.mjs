// Exercise the actual route against an isolated Neon branch; auth is a test-only injected boundary.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { drizzle } from 'drizzle-orm/neon-http';
import * as orm from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import * as validation from '../app/lib/validation/apiSchemas.ts';
import * as contract from '../app/lib/validation/foodContract.ts';

console.log('Ready for isolated test connection on hidden stdin.');
process.stdin.setRawMode?.(true);
const input = await new Promise(resolve => { let data = ''; process.stdin.on('data', chunk => { data += chunk; if(data.includes('\n')) resolve(JSON.parse(data.trim())); }); });
process.stdin.setRawMode?.(false); process.stdin.pause();
assert.equal(new URL(input.url).hostname, input.expectedHost);
assert.notEqual(input.expectedHost, 'ep-bitter-water-b360yvxr.c-4.ap-southeast-1.aws.neon.tech');
const db = drizzle(input.url);
const a = randomUUID(), b = randomUUID();
const source = readFileSync(new URL('../app/api/food-records/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, Response, Request, URL, Intl, Date, require: id => {
  if(id === 'drizzle-orm') return orm;
  if(id === '@/db') return { getDb: () => db };
  if(id === '@/db/schema') return schema;
  if(id === '@/app/lib/validation/apiSchemas') return validation;
  if(id === '@/app/lib/validation/foodContract') return contract;
  if(id === '@/app/lib/auth/clerk-auth') return { getClerkUserId: async request => request.headers.get('authorization') };
  if(id === '@/app/lib/observability/serverLog') return { logServerError: () => {} };
  throw Error(`Unmapped module: ${id}`);
} });
async function request(method, body, nullable = true, who = a, query = '') {
  const response = await exports[method](new Request(`https://example.test/api/food-records${query}`, {
    method, headers: { ...(who ? { authorization: who } : {}), 'content-type': 'application/json', ...(nullable ? { 'x-kintorepas-food-contract': 'nullable-v1' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  return { status: response.status, data: await response.json() };
}
const base = { recordedDate: '2026-10-11', mealType: '昼食', name: 'Optional contract fixture' };
try {
  await db.insert(schema.users).values([a,b].map(id => ({ id, clerkUserId: id, email: `food-${id}@example.invalid` })));
  for(const method of ['GET','POST','PATCH','DELETE']) assert.equal((await request(method, method === 'GET' || method === 'DELETE' ? undefined : base, true, null)).status, 401);
  const saved = await request('POST', { ...base, calories: null, proteinGrams: null });
  assert.equal(saved.status, 201); assert.equal(saved.data.record.calories, null);
  const id = saved.data.record.id;
  let modern = await request('GET', undefined, true, a, '?date=2026-10-11');
  assert.equal(modern.data.records[0].proteinGrams, null);
  let legacy = await request('GET', undefined, false, a, '?date=2026-10-11');
  const row = legacy.data.records.find(record => record.id === id);
  assert.equal(row.calories.toLocaleString(), '0'); assert.equal(row.proteinGrams.toFixed(1), '0.0');
  // Old app can rename the record without destroying unknown nutrition.
  assert.equal((await request('PATCH', { ...base, recordId: id, name: 'Legacy rename', calories: 0, proteinGrams: 0 }, false)).status, 200);
  modern = await request('GET', undefined, true, a, '?date=2026-10-11');
  assert.equal(modern.data.records[0].calories, null); assert.equal(modern.data.records[0].name, 'Legacy rename');
  assert.equal((await request('PATCH', { ...base, recordId: id, calories: 100, proteinGrams: 5 }, false)).status, 200);
  assert.equal((await request('PATCH', { ...base, recordId: id, calories: null, proteinGrams: 0 }, true)).data.record.calories, null);
  const numeric = await request('POST', { ...base, calories: 250, proteinGrams: 10 }, false);
  assert.equal(numeric.status, 201);
  modern = await request('GET', undefined, true, a, '?date=2026-10-11');
  assert.equal(modern.data.summary.totalCalories, 250); assert.equal(modern.data.summary.totalProteinGrams, 10);
  assert.equal((await request('GET', undefined, true, b, '?date=2026-10-11')).data.records.length, 0);
  assert.equal((await request('PATCH', { ...base, recordId: id, calories: 999 }, true, b)).status, 404);
  assert.equal((await request('DELETE', undefined, true, b, `?recordId=${id}`)).status, 404);
  assert.equal((await request('POST', { ...base, calories: -1 })).status, 400);
  assert.equal((await request('POST', base, false)).status, 400);
  assert.equal((await request('DELETE', undefined, true, a, `?recordId=${id}`)).status, 200);
  assert.equal((await request('GET', undefined, true, a, '?date=2026-10-11')).data.records.length, 1);
  console.log('PASS: actual food route + isolated DB: nullable/numeric POST/GET/PATCH/DELETE, legacy formatting and null preservation, totals, 401, cross-user 404, invalid values. No production users touched.');
} finally {
  await db.delete(schema.users).where(orm.inArray(schema.users.id, [a,b]));
}
