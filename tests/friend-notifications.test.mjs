import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationEndpoint} from '../app/lib/friends/notificationEndpoint.ts';
import {deliverFriendPush} from '../app/lib/friends/pushDelivery.ts';
import {friendNotificationTarget} from '../mobile/src/lib/friendNotificationTarget.ts';
import {readFileSync} from 'node:fs';
const recipient='11111111-1111-4111-8111-111111111111',sender='22222222-2222-4222-8222-222222222222';
const event={id:'event',recipient_id:recipient,sender_id:sender,performed_on:'2026-10-12'};
const target={hash:'hash',token:'ExpoPushToken[testtoken123456]',session:'session',clerkUserId:'user'};
test('anonymous is rejected before feature/database checks; feature off cannot mutate',async()=>{
 let touched=0;const deps={identify:async()=>null,ready:()=>{touched++;return true;},read:async()=>{touched++;},write:async()=>{touched++;return true;}};
 assert.equal((await notificationEndpoint(new Request('https://local/api'),deps)).status,401);assert.equal(touched,0);
 deps.identify=async()=>({id:recipient,session:'session'});deps.ready=()=>false;
 assert.equal((await notificationEndpoint(new Request('https://local/api'),deps)).status,503);assert.equal(touched,0);
});
test('authenticated owner is server derived; invalid payload/self/extra owner cannot mutate',async()=>{
 const seen=[];const deps={identify:async()=>({id:recipient,session:'session'}),ready:()=>true,read:async()=>({enabled:false,friends:[]}),write:async(...args)=>{seen.push(args);return true;}};
 for(const input of [{action:'global',enabled:true,userId:sender},{action:'friend',enabled:true,targetId:recipient},{action:'device',installationKey:recipient,token:'https://attacker'}]){
  assert.equal((await notificationEndpoint(new Request('https://local/api',{method:'POST',body:JSON.stringify(input)}),deps)).status,400);
 }assert.equal(seen.length,0);
 const response=await notificationEndpoint(new Request('https://local/api',{method:'POST',body:JSON.stringify({action:'friend',targetId:sender,enabled:true})}),deps);
 assert.equal(response.status,200);assert.equal(seen[0][0],recipient);assert.equal(seen[0][1],'session');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('revoked session and removed friendship cannot deliver; notification contains no record details',async()=>{
 const sent=[],disabled=[],tickets=[];const deps={sessionActive:async()=>false,stillAllowed:async()=>true,send:async payload=>{sent.push(payload);return {status:'ok',id:'ticket'};},deactivate:async hash=>disabled.push(hash),receipt:async(...args)=>tickets.push(args)};
 await deliverFriendPush(event,[target],deps);assert.equal(sent.length,0);assert.deepEqual(disabled,['hash']);
 deps.sessionActive=async()=>true;deps.stillAllowed=async()=>false;await deliverFriendPush(event,[target],deps);assert.equal(sent.length,0);
 deps.stillAllowed=async()=>true;await deliverFriendPush(event,[target],deps);assert.equal(sent.length,1);assert.deepEqual(tickets,[['ticket','hash',target.token]]);
 assert.deepEqual(Object.keys(sent[0].data).sort(),['friendId','performedOn','recipientId','type']);assert.doesNotMatch(JSON.stringify(sent),/weight|memo|email|bodyPhoto/);
 deps.send=async()=>({status:'error',details:{error:'DeviceNotRegistered'}});await deliverFriendPush(event,[target],deps);assert.equal(disabled.length,2);
});
test('notification target refuses another account, arbitrary URLs and invalid calendar dates',()=>{
 const data={type:'friend-training',recipientId:recipient,friendId:sender,performedOn:'2026-10-12'};
 assert.deepEqual(friendNotificationTarget(data,recipient),{friendId:sender,day:'2026-10-12'});
 for(const bad of [{...data,recipientId:sender},{...data,friendId:'https://evil'},{...data,performedOn:'2026-02-31'},{...data,type:'url'},{...data,friendId:recipient}])assert.equal(friendNotificationTarget(bad,recipient),null);
});
test('outbox creation and dispatch guard sharing, suspension, blocks, preferences and completed records',()=>{
 const migration=readFileSync(new URL('../drizzle-postgres/0022_friend_push_notifications.sql',import.meta.url),'utf8');
 const query=readFileSync(new URL('../app/lib/friends/notificationQueries.ts',import.meta.url),'utf8');
 for(const source of [migration,query])for(const marker of ['friendships','accepted','friend_blocks','social_suspended','friend_notification_preferences','friend_notification_subscriptions','share_training'])assert.ok(source.includes(marker));
 assert.match(migration,/AFTER INSERT OR UPDATE ON training_sessions/);assert.match(migration,/UNIQUE\(sender_id,recipient_id,notification_day\)/);
 assert.match(query,/FOR UPDATE SKIP LOCKED/);assert.match(query,/training_exercises/);
 assert.match(migration,/DEFAULT false/);assert.match(migration,/ON DELETE CASCADE/);
});
test('unready production notification UI is hidden without hiding ordinary failures',()=>{
 const source=readFileSync(new URL('../mobile/src/components/FriendNotificationSettings.tsx',import.meta.url),'utf8');
 assert.match(source,/e instanceof ApiError&&e.status===503&&e.message==='通知機能は配信準備中です。'/);
 assert.match(source,/if\(unavailable\)return null/);
 assert.match(source,/else setError\(e instanceof Error/);
 assert.match(source,/再読み込み/);
});
