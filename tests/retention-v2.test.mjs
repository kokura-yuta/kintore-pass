import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeLongRetention, analyzeRetention, trainingPeriod, japanDay } from '../shared/retention.ts';
import { lineSegments } from '../shared/longChart.ts';
import { friendEndpoint, FriendError } from '../app/lib/friends/endpoint.ts';
const now = new Date('2026-10-10T03:00:00Z');
const today = japanDay(now);
const day = value => japanDay(`${value}T00:00:00+09:00`);
const user = (extra = {}) => ({ id:'a',displayName:null,createdAt:'2023-01-01T00:00:00Z',weeklyGoal:4,trainingDays:[],totalTrainingDays:0,lastTrainingDate:null,activityDays:[],measurementStartedOn:null,...extra });
const options = {range:'all',unit:'month',cohortUnit:'month',userId:'a'};
test('全期間は数年分を返し、登録前個人値はnull、平均分母は集計可能者だけ', () => {
  const data = analyzeLongRetention([user({id:'b'}),user({createdAt:'2026-10-01T00:00:00Z',trainingDays:['2026-10-09']}),user({id:'c',weeklyGoal:null})],now,options);
  assert.equal(data.start,'2023-01-01'); assert.equal(data.points.length,46);
  assert.equal(data.points[0].individual,null); assert.equal(data.points[0].users,1);
  assert.equal(data.points.at(-1).users,2); assert.equal(data.average.users,2);
});
test('平均は実施合計/目標合計でなく各ユーザー率の算術平均', () => {
  const data=analyzeLongRetention([user({weeklyGoal:1,trainingDays:['2026-10-09']}),user({id:'b',weeklyGoal:7})],now,{...options,range:'1m',unit:'day'});
  const point=data.points.find(p=>p.start==='2026-10-09');
  assert.equal(point.percent,350); assert.equal(point.users,2);
});
test('目標変更履歴は期間の日数で積分し、推定日数を明示する', () => {
  const u=user({goalHistory:[{effectiveOn:'2023-01-01',weeklyGoal:7,estimated:true},{effectiveOn:'2026-10-08',weeklyGoal:2,estimated:false}],trainingDays:['2026-10-04','2026-10-04','2026-10-09','2026-10-11']});
  const p=trainingPeriod(u,day('2026-10-04'),today,today);
  assert.equal(p.actual,2); assert.ok(Math.abs(p.target-(4+6/7))<1e-10); assert.equal(p.estimatedDays,4);
});
test('目標不明の日を含む期間は平均から除外し判定保留', () => {
  const u=user({goalHistory:[{effectiveOn:'2023-01-01',weeklyGoal:null,estimated:true},{effectiveOn:'2026-10-09',weeklyGoal:4,estimated:false}],trainingDays:['2026-10-09'],lastTrainingDate:'2026-10-09'});
  const p=trainingPeriod(u,day('2026-10-04'),today,today); assert.equal(p.percent,null); assert.equal(p.unknownDays,5);
  assert.equal(analyzeRetention([u],now).rows[0].status,'判定保留');
});
test('登録途中は按分し、編集・削除・未来・登録前を正しく再集計', () => {
  const u=user({createdAt:'2026-10-08T00:00:00Z',weeklyGoal:7,trainingDays:['2026-10-07','2026-10-08','2026-10-08','2026-10-11']});
  const p=trainingPeriod(u,day('2026-10-01'),today,today); assert.equal(p.target,3); assert.equal(p.actual,1); assert.equal(p.partial,true);
  assert.equal(trainingPeriod({...u,trainingDays:[]},day('2026-10-01'),today,today).actual,0);
});
test('D60/D90は指定日に実イベントがある場合のみ継続、未計測と当日を除外', () => {
  const u=user({createdAt:'2026-07-01T00:00:00Z',measurementStartedOn:'2026-07-01',activityDays:['2026-08-30','2026-09-29']});
  const data=analyzeRetention([u],now);
  for(const offset of [60,90]) assert.equal(data.appRetention.find(m=>m.day===offset).percent,100);
  assert.equal(analyzeRetention([{...u,measurementStartedOn:null}],now).appRetention.at(-1).percent,null);
  assert.equal(analyzeRetention([user({createdAt:'2026-10-03T00:00:00Z',measurementStartedOn:'2026-10-03'})],now).appRetention[0].eligible,0);
});
test('空データとグラフ欠測を0%にしない・過大な日別要求を拒否', () => {
  assert.equal(analyzeLongRetention([],now,options).average.percent,null);
  const chart=lineSegments([{start:'1',percent:80,individual:null},{start:'2',percent:null,individual:null},{start:'3',percent:125,individual:125}],'percent');
  assert.equal(chart.paths.length,2); assert.equal(chart.max,125);
  assert.throws(()=>analyzeLongRetention([user({createdAt:'2000-01-01T00:00:00Z'})],now,{...options,unit:'day'}),RangeError);
});
const actor='00000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000002';
const deps = extra => ({identify:async()=>({id:actor}),list:async()=>({friends:[]}),profile:async()=>{throw new FriendError('閲覧できません。',403);},action:async()=>({ok:true}),report:()=>{},...extra});
test('友達APIは認証前に検索/個人データ取得しない',async()=>{
  let calls=0;
  const response=await friendEndpoint(new Request(`https://example.com/api/friends?userId=${target}`),deps({identify:async()=>({id:null}),profile:async()=>{calls++;}}));
  assert.equal(response.status,401);assert.equal(calls,0);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('非友達は403、不正ID/自分への申請は400、秘密の障害詳細は返さない',async()=>{
  assert.equal((await friendEndpoint(new Request(`https://example.com/api/friends?userId=${target}`),deps())).status,403);
  assert.equal((await friendEndpoint(new Request('https://example.com/api/friends?userId=bad'),deps())).status,400);
  const post=body=>new Request('https://example.com/api/friends',{method:'POST',body:JSON.stringify(body)});
  assert.equal((await friendEndpoint(post({action:'request',targetId:actor}),deps())).status,400);
  assert.equal((await friendEndpoint(post({action:'search',query:'partial'}),deps())).status,400);
  const failure=await friendEndpoint(post({action:'request',targetId:target}),deps({action:async()=>{throw new Error('private-connection-secret');}}));
  assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/private-connection-secret/);
});
