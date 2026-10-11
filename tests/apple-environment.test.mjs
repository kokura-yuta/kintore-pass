import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { appleEnvironmentMode, verifiedAppleEnvironment, verifyInAppleEnvironment } from '../app/lib/subscriptions/appleEnvironment.ts';

test('environment configuration fails closed for typos', () => {
  assert.equal(appleEnvironmentMode(undefined), 'sandbox');
  for (const mode of ['sandbox','production','auto']) assert.equal(appleEnvironmentMode(mode),mode);
  assert.throws(() => appleEnvironmentMode('prod'), /INVALID/);
});
test('auto accepts verified production without retry', async () => {
  const calls=[];
  assert.equal(await verifyInAppleEnvironment('auto', async env => {calls.push(env);return 'verified';},4),'verified');
  assert.deepEqual(calls,['production']);
});
test('auto retries sandbox only for SDK environment mismatch', async () => {
  const calls=[];
  const result=await verifyInAppleEnvironment('auto',async env=>{
    calls.push(env);
    if(env==='production') throw Object.assign(new Error('environment'),{status:4});
    return {environment:'Sandbox'};
  },4);
  assert.equal(result.environment,'Sandbox');
  assert.deepEqual(calls,['production','sandbox']);
});
test('invalid signature, certificate, bundle, revocation and network never retry', async () => {
  for (const status of [0,1,2,3,5,6,7,undefined,'4']) {
    const calls=[]; const failure=Object.assign(new Error('verification failed'),{status});
    await assert.rejects(verifyInAppleEnvironment('auto',async env=>{calls.push(env);throw failure;},4), error=>error===failure);
    assert.deepEqual(calls,['production']);
  }
});
test('fixed modes do not widen accepted environments',async()=>{
  for (const mode of ['production','sandbox']) {
    const calls=[];
    await assert.rejects(verifyInAppleEnvironment(mode,async env=>{calls.push(env);throw Object.assign(new Error('mismatch'),{status:4});},4));
    assert.deepEqual(calls,[mode]);
  }
});
test('sandbox failure after retry remains failure',async()=>{
  await assert.rejects(verifyInAppleEnvironment('auto',async env=>{throw Object.assign(new Error(env),{status:env==='production'?4:3});},4),/sandbox/);
});
test('only verified Apple server environment names map to DB',()=>{
  assert.equal(verifiedAppleEnvironment('Production'),'production');
  assert.equal(verifiedAppleEnvironment('Sandbox'),'sandbox');
  for(const value of ['Xcode','LocalTesting','auto','sandbox',undefined]) assert.throws(()=>verifiedAppleEnvironment(value));
});
test('routes persist signed environment and bind nested notifications to it',()=>{
  const verification=readFileSync(new URL('../app/api/subscription/apple/verify/route.ts',import.meta.url),'utf8');
  const notification=readFileSync(new URL('../app/api/subscription/apple/notifications/route.ts',import.meta.url),'utf8');
  assert.match(verification,/appleEnvironmentName\(transaction.environment\)/);
  assert.match(notification,/environment !== appleEnvironmentName\(notification.data\?\.environment\)/);
  assert.match(notification,/verifyAppleRenewalInfo\(notification.data.signedRenewalInfo, environment\)/);
  assert.equal((notification.match(/eq\(userSubscriptions.environment, environment\)/g)||[]).length,2);
  assert.doesNotMatch(verification+notification,/appleEnvironmentName\(\)/);
});
