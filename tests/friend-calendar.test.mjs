import assert from 'node:assert/strict';
import test from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { friendEndpoint } from '../app/lib/friends/endpoint.ts';
import { friendProfile } from '../app/lib/friends/queries.ts';
import { jstDay, monthCells, shiftMonth } from '../mobile/src/lib/friend-calendar.ts';
const actor='00000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000002';
test('JST midnight, leap year, weekday, year boundary',()=>{
  assert.equal(jstDay('2026-09-30T15:00:00Z'),'2026-10-01');
  assert.equal(jstDay('2026-09-30T14:59:59Z'),'2026-09-30');
  assert.equal(jstDay('bad'),'');
  assert.equal(monthCells('2026-10')[4],'2026-10-01');
  assert.equal(monthCells('2024-02').filter(Boolean).length,29);
  assert.equal(monthCells('2025-02').filter(Boolean).length,28);
  assert.equal(shiftMonth('2026-01',-1),'2025-12');
  assert.equal(shiftMonth('2026-12',1),'2027-01');
});
test('month API validates before reads and preserves legacy requests',async()=>{
  let calls=[];
  const deps={identify:async()=>({id:actor}),list:async()=>({}),profile:async(...args)=>{calls.push(args);return {};},action:async()=>({}),report:()=>{}};
  for(const month of ['2026-00','2026-13','2026-1','2026-10\x27','']){
    assert.equal((await friendEndpoint(new Request(`https://example.invalid?userId=${target}&month=${encodeURIComponent(month)}`),deps)).status,400);
  }
  assert.equal(calls.length,0);
  assert.equal((await friendEndpoint(new Request(`https://example.invalid?userId=${target}&month=2026-10`),deps)).status,200);
  assert.deepEqual(calls[0],[actor,target,'2026-10']);
  await friendEndpoint(new Request(`https://example.invalid?userId=${target}`),deps);
  assert.deepEqual(calls[1],[actor,target,undefined]);
  assert.equal((await friendEndpoint(new Request(`https://example.invalid?userId=${target}&month=2026-10`),{...deps,identify:async()=>({id:null})})).status,401);
  assert.equal(calls.length,2);
});
test('month SQL has complete bounded month and same authorization, no sensitive fields',()=>{
  const query=new PgDialect().sqlToQuery(friendProfile(actor,target,'2026-10'));
  for(const pattern of [/share_training/,/friend_blocks/,/social_suspended/,/status='accepted'/,/Asia\/Tokyo/,/interval '1 month'/,/s.performed_at >=/,/s.performed_at </]) assert.match(query.sql,pattern);
  assert.doesNotMatch(query.sql,/LIMIT 20|memo|email|body_analyses|chat_messages/);
  assert.ok(query.params.includes('2026-10-01'));
  assert.match(new PgDialect().sqlToQuery(friendProfile(actor,target)).sql,/LIMIT 20/);
});
