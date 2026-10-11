import assert from 'node:assert/strict';
import test from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { friendEndpoint } from '../app/lib/friends/endpoint.ts';
import { moderationEndpoint } from '../app/lib/admin/moderationEndpoint.ts';
import { safeSocialText,filterFriendOutput } from '../app/lib/friends/moderation.ts';
import * as queries from '../app/lib/friends/queries.ts';
const actor='00000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000002';
const post=body=>new Request('https://example.invalid/api/friends',{method:'POST',body:JSON.stringify(body)});
const deps={identify:async()=>({id:actor}),list:async()=>({}),profile:async()=>({}),action:async()=>({updated:true}),report:()=>{}};
test('通報・ブロックの入力を検証し自分自身は拒否する',async()=>{
  for(const action of ['block','unblock']){
    assert.equal((await friendEndpoint(post({action,targetId:target}),deps)).status,200);
    assert.equal((await friendEndpoint(post({action,targetId:actor}),deps)).status,400);
  }
  assert.equal((await friendEndpoint(post({action:'report',targetId:target,reason:'spam'}),deps)).status,200);
  assert.equal((await friendEndpoint(post({action:'report',targetId:target,reason:'anything'}),deps)).status,400);
});
test('未認証・一般ユーザーの通報管理アクセスはデータ取得前に拒否する',async()=>{
  let reads=0,writes=0;
  for(const status of [401,403])for(const request of [new Request('https://example.invalid'),post({action:'suspend',reportId:target})]){
    const response=await moderationEndpoint(request,{authorize:async()=>({allowed:false,status}),list:async()=>{reads++;},act:async()=>{writes++;return true;},log:()=>{}});
    assert.equal(response.status,status);assert.match(response.headers.get('Cache-Control'),/no-store/);
  }
  assert.equal(reads,0);assert.equal(writes,0);
});
test('管理者入力検証・存在しない通報・内部エラーを安全に扱う',async()=>{
  const admin={authorize:async()=>({allowed:true}),list:async()=>[],act:async()=>false,log:()=>{}};
  assert.equal((await moderationEndpoint(post({action:'suspend',reportId:'bad'}),admin)).status,400);
  assert.equal((await moderationEndpoint(post({action:'suspend',reportId:target}),admin)).status,404);
  const response=await moderationEndpoint(new Request('https://example.invalid'),{...admin,list:async()=>{throw Error('secret-db-url');}});
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/secret-db-url/);
});
test('不適切な表示名・種目はローカルにフィルタし数値は変更しない',()=>{
  assert.equal(safeSocialText('筋トレ仲間'),'筋トレ仲間');assert.equal(safeSocialText('死 ね'),'筋トレPASユーザー');
  const value=filterFriendOutput({name:'fuck',records:[{exercises:[{name:'ベンチプレス',sets:[{weightKg:60,reps:10}]}]}]});
  assert.equal(value.name,'非表示の内容');assert.equal(value.records[0].exercises[0].sets[0].weightKg,60);
});
test('検索・申請・承認・記録閲覧SQLに両方向ブロックを強制する',()=>{
  const dialect=new PgDialect();
  for(const query of [queries.friendSearch(actor,target,false),queries.friendSearch(actor,'demo@example.invalid',true),queries.friendList(actor),queries.friendRequest(actor,target),queries.friendChange(actor,target,'accept'),queries.friendProfile(actor,target)]){
    const sql=dialect.sqlToQuery(query).sql;
    assert.match(sql,/friend_blocks/);assert.match(sql,/blocker_id/);assert.match(sql,/blocked_id/);assert.match(sql,/social_suspended/);
  }
  assert.match(dialect.sqlToQuery(queries.friendUnblock(actor,target)).sql,/status='cancelled'/);
});
