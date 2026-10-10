import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import { users } from '../db/schema.ts';
import { resolveBootstrapIdentity } from '../app/lib/auth/bootstrapIdentity.ts';
console.log('Ready for isolated validation-branch connection on hidden stdin.');
process.stdin.setRawMode?.(true);
const url=await new Promise(resolve=>{let data='';const receive=chunk=>{data+=chunk.toString();if(data.includes('\n')){process.stdin.off('data',receive);resolve(JSON.parse(data.trim()).url);}};process.stdin.on('data',receive);});
process.stdin.setRawMode?.(false);process.stdin.pause();
if(new URL(url).hostname!=='ep-morning-moon-b378vfjy-pooler.c-4.ap-southeast-1.aws.neon.tech')throw Error('Only dedicated expiring validation branch allowed.');
const db=drizzle(url),query=neon(url),id=randomUUID(),oldId=`test-dev-${id}`,newId=`test-live-${id}`,email=`migration-${id}@example.invalid`;
const [before]=await db.insert(users).values({id,clerkUserId:oldId,email,onboardingCompleted:true,profileCompleted:true,trialUsed:true}).returning();
await query`INSERT INTO training_sessions(user_id,performed_at) VALUES(${id},now())`;
const dependencies={
  findByClerkId:async value=>(await db.select().from(users).where(eq(users.clerkUserId,value)))[0]??null,
  findByEmail:async value=>(await db.select().from(users).where(eq(users.email,value)))[0]??null,
  getDetails:async value=>({id:value,firstName:null,lastName:null,primaryEmailAddress:{emailAddress:email,verification:{status:'verified'}}}),
  insert:async value=>(await db.insert(users).values(value).onConflictDoNothing().returning())[0]??null,
  migrate:async(old,value)=>(await db.update(users).set({clerkUserId:value}).where(and(eq(users.id,old.id),eq(users.clerkUserId,old.clerkUserId),eq(users.email,old.email))).returning())[0]??null,
  production:true,approvedLegacyIds:[oldId],stage:()=>{},
};
const [a,b]=await Promise.all([resolveBootstrapIdentity(newId,dependencies),resolveBootstrapIdentity(newId,dependencies)]);
for(const result of [a,b]) {
  assert.equal(result.user.id,id);assert.equal(result.created,false);assert.equal(result.user.clerkUserId,newId);
  assert.equal(result.user.onboardingCompleted,true);assert.equal(result.user.trialUsed,true);
  assert.deepEqual(result.user.createdAt,before.createdAt);
}
assert.equal((await query`SELECT count(*)::int AS n FROM training_sessions WHERE user_id=${id}`)[0].n,1);
assert.equal((await db.select().from(users).where(eq(users.email,email))).length,1);
assert.equal((await dependencies.migrate(before,'another-test-id')),null);
console.log('PASS: concurrent migration preserves UUID, training record, trial usage and setup; stale update cannot overwrite identity. Fixtures are isolated and expire with branch.');
