import assert from 'node:assert/strict';
import test from 'node:test';
import { BootstrapIdentityConflict, resolveBootstrapIdentity } from '../app/lib/auth/bootstrapIdentity.ts';
const old = { id:'uuid-kept',clerkUserId:'old-dev-id',email:'user@example.com',trainingRecords:1 };
function fixture(options={}) {
  let row = options.row===undefined ? {...old} : options.row;
  let migrations=0, inserts=0;
  const dependencies = {
    findByClerkId: async id => row?.clerkUserId===id ? row : null,
    findByEmail: async email => row?.email.toLowerCase()===email.toLowerCase() ? row : null,
    getDetails: async id => ({id,firstName:null,lastName:null,primaryEmailAddress:
      {emailAddress:'user@example.com',verification:{status:'verified'}}}),
    insert: async values => { inserts++;row={id:'new',...values};return row; },
    migrate: async (previous,id) => { migrations++;row={...previous,clerkUserId:id};return row; },
    production:true,approvedLegacyIds:['old-dev-id'],stage:()=>{},...options.overrides,
  };
  return { dependencies, counts:()=>({migrations,inserts}) };
}
test('許可済み旧開発IDと確認済み本番メールだけ引継ぎ、UUIDと記録を維持',async()=>{
  const f=fixture();const result=await resolveBootstrapIdentity('live-id',f.dependencies);
  assert.equal(result.user.id,old.id);assert.equal(result.user.trainingRecords,1);
  assert.equal(result.user.clerkUserId,'live-id');assert.equal(result.created,false);
  assert.deepEqual(f.counts(),{migrations:1,inserts:0});
  await resolveBootstrapIdentity('live-id',f.dependencies);assert.equal(f.counts().migrations,1);
});
for(const [name,overrides] of [
  ['許可なし',{approvedLegacyIds:[]}],['開発環境',{production:false}],
  ['未確認メール',{getDetails:async id=>({id,firstName:null,lastName:null,primaryEmailAddress:{emailAddress:old.email,verification:{status:'unverified'}}})}],
  ['別の本人ID',{getDetails:async()=>({id:'someone-else',firstName:null,lastName:null,primaryEmailAddress:{emailAddress:old.email,verification:{status:'verified'}}})}],
]) test(`${name}ではメール一致でも引継ぎ禁止`,async()=>{
  const f=fixture({overrides});await assert.rejects(resolveBootstrapIdentity('live-id',f.dependencies),BootstrapIdentityConflict);
  assert.deepEqual(f.counts(),{migrations:0,inserts:0});
});
test('旧ID不明・通常の本番別IDは引継ぎ禁止',async()=>{
  for(const id of [null,'other-live-id']) {
    const f=fixture({row:{...old,clerkUserId:id}});
    await assert.rejects(resolveBootstrapIdentity('live-id',f.dependencies),BootstrapIdentityConflict);
  }
});
test('未登録なら新規作成',async()=>{
  const f=fixture({row:null});const result=await resolveBootstrapIdentity('live-id',f.dependencies);
  assert.equal(result.created,true);assert.deepEqual(f.counts(),{inserts:1,migrations:0});
});
test('同じ本人の登録競合は再取得、別人競合は拒否',async()=>{
  for(const same of [true,false]) {
    let reads=0;const f=fixture({row:null,overrides:{insert:async()=>null,
      findByClerkId:async id=>++reads===2&&same?{...old,clerkUserId:id}:null}});
    if(same)assert.equal((await resolveBootstrapIdentity('live-id',f.dependencies)).created,false);
    else await assert.rejects(resolveBootstrapIdentity('live-id',f.dependencies),BootstrapIdentityConflict);
  }
});
test('競合した移行が別UUIDへ切り替わったら拒否',async()=>{
  let reads=0;const f=fixture({overrides:{migrate:async()=>null,
    findByClerkId:async id=>++reads===2?{...old,id:'other-uuid',clerkUserId:id}:null}});
  await assert.rejects(resolveBootstrapIdentity('live-id',f.dependencies),BootstrapIdentityConflict);
});
test('メール大小文字差は本人確認を維持したまま引継ぐ',async()=>{
  const f=fixture({row:{...old,email:'USER@EXAMPLE.COM'}});
  assert.equal((await resolveBootstrapIdentity('live-id',f.dependencies)).user.id,old.id);
});
test('メールが取得できない場合は登録・引継ぎしない',async()=>{
  const f=fixture({overrides:{getDetails:async id=>({id,firstName:null,lastName:null,primaryEmailAddress:null})}});
  await assert.rejects(resolveBootstrapIdentity('live-id',f.dependencies),BootstrapIdentityConflict);
  assert.deepEqual(f.counts(),{inserts:0,migrations:0});
});
test('ID検索とメール検索の間に同じ本人の移行が完了した場合は既存行を返す',async()=>{
  const f=fixture({overrides:{findByClerkId:async()=>null,
    findByEmail:async()=>({...old,clerkUserId:'live-id'})}});
  const result=await resolveBootstrapIdentity('live-id',f.dependencies);
  assert.equal(result.user.id,old.id);assert.deepEqual(f.counts(),{inserts:0,migrations:0});
});
