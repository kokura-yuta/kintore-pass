import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PUSH_JOB_AUDIENCE, verifyPushJob, pushJobEndpoint} from '../app/lib/friends/pushJobAuth.ts';

const now = Math.floor(Date.now()/1000);
const keys = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test',use:'sig',alg:'RS256'};
const claims = {iss:'https://token.actions.githubusercontent.com',aud:PUSH_JOB_AUDIENCE,
  sub:'repo:kokura-yuta/kintore-pass:ref:refs/heads/main',repository:'kokura-yuta/kintore-pass',
  repository_id:'1325003866',repository_owner_id:'289435290',ref:'refs/heads/main',
  workflow_ref:'kokura-yuta/kintore-pass/.github/workflows/friend-push.yml@refs/heads/main',
  event_name:'schedule',runner_environment:'github-hosted',iat:now,nbf:now-5,exp:now+300};
const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(changes={},headerChanges={}) {
  const data = `${base64({alg:'RS256',typ:'JWT',kid:'test',...headerChanges})}.${base64({...claims,...changes})}`;
  return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(data))).toString('base64url')}`;
}
const request = bearer => new Request(PUSH_JOB_AUDIENCE,{method:'POST',headers:bearer?{Authorization:`Bearer ${bearer}`}:{}});
const fetcher = async url => {assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[jwk]});};
test('signed main-branch GitHub job passes; immutable subject and manual dispatch pass',async()=>{
  for(const changes of [{},{event_name:'workflow_dispatch'},{job_workflow_ref:claims.workflow_ref},{sub:'repo:kokura-yuta@289435290/kintore-pass@1325003866:ref:refs/heads/main'}])
    assert.equal(await verifyPushJob(request(await token(changes)),{fetcher,now}),true);
});
test('reject other repositories, owners, workflows, branches, audiences, forks, PRs and stale tokens',async()=>{
  const invalid = [{repository:'attacker/fork'},{repository_id:'99'},{repository_owner_id:'99'},
    {ref:'refs/heads/other'},{workflow_ref:'kokura-yuta/kintore-pass/.github/workflows/other.yml@refs/heads/main'},
    {aud:'other'},{iss:'https://evil.invalid'},{sub:'repo:kokura-yuta/kintore-pass:pull_request'},
    {event_name:'pull_request'},{event_name:'push'},{runner_environment:'self-hosted'},{job_workflow_ref:'reusable'},
    {exp:now},{nbf:now+60},{iat:now+60},{iat:now-1000},{exp:now+1000},{exp:'tomorrow'}];
  for(const changes of invalid) assert.equal(await verifyPushJob(request(await token(changes)),{fetcher,now}),false,JSON.stringify(changes));
});
test('signature, algorithm, key and provider failures fail closed',async()=>{
  const valid = await token();
  const [h,p,s] = valid.split('.');
  for(const bearer of ['', 'malformed', `${h}.${base64({...claims,repository:'evil'})}.${s}`,
    await token({},{alg:'none'}),await token({},{kid:'unknown'}),await token({},{crit:['b64']})])
    assert.equal(await verifyPushJob(request(bearer),{fetcher,now}),false);
  assert.equal(await verifyPushJob(request(valid),{now,fetcher:async()=>new Response(null,{status:503})}),false);
});
test('endpoint authenticates before settings/database; disabled and failed jobs are not success',async()=>{
  let drained=0,checked=0;
  const deps={verify:async()=>false,ready:()=>{checked++;return true;},drain:async()=>{drained++;}};
  assert.equal((await pushJobEndpoint(request(),deps)).status,401);assert.equal(checked,0);assert.equal(drained,0);
  deps.verify=async()=>true;deps.ready=()=>false;
  assert.equal((await pushJobEndpoint(request(),deps)).status,503);assert.equal(drained,0);
  deps.ready=()=>true;
  const result=await pushJobEndpoint(request(),deps);assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal(drained,1);
  deps.drain=async()=>{throw new Error('private error');};
  const failed=await pushJobEndpoint(request(),deps);assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/private error/);
  assert.equal((await pushJobEndpoint(new Request(PUSH_JOB_AUDIENCE),deps)).status,405);
});
test('scheduled job has no persistent secrets, input interpolation, checkout or overlapping execution',()=>{
  const source=readFileSync(new URL('../.github/workflows/friend-push.yml',import.meta.url),'utf8');
  assert.match(source,/cron: '2-57\/5 \* \* \* \*'/);assert.match(source,/id-token: write/);
  assert.match(source,/cancel-in-progress: false/);assert.match(source,/::add-mask::/);
  assert.doesNotMatch(source,/secrets\.|EXPO_PUSH_ACCESS_TOKEN|uses:|pull_request:|\$\{\{/);
});
