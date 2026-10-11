import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { lineSegments } from '../shared/longChart.ts';
const friends=readFileSync(new URL('../mobile/src/app/friends.tsx',import.meta.url),'utf8');
test('Clerkの不安定なgetToken参照で友達の初期取得を再実行しない',()=>{
  assert.match(friends,/tokenRef\.current=getToken/);
  assert.match(friends,/\},\[userId,isLoaded\]\)/);
  const withoutTokenRefSync=friends.replace('useEffect(()=>{tokenRef.current=getToken;},[getToken]);','');
  assert.doesNotMatch(withoutTokenRefSync,/\},\[getToken\]\)/);
});
test('公開スイッチの未保存変更は再取得に上書きされず保存まで保護する',()=>{
  assert.match(friends,/if\(!settingsDirty\.current\)setSettings\(data\.settings\)/);
  assert.match(friends,/settingsDirty\.current=true;setHasChanges\(true\)/);
  assert.match(friends,/setSettings\(current=>current\?\{\.\.\.current,\.\.\.change\}:current\)/);
  assert.match(friends,/await api\('\/api\/friends',\{action:'settings'/);
  assert.match(friends,/Switch disabled=\{busy\}/);
  assert.match(friends,/TextInput editable=\{!busy\}/);
});
test('友達カードから本人のカレンダーへ直接移動し、一覧には記録を重複表示しない',()=>{
  assert.ok(friends.indexOf('placeholder="ユーザーIDで検索"')<friends.indexOf('>友達一覧</Text>'));
  assert.match(friends,/showSettings&&settings&&/);
  assert.match(friends,/showRequests&&/);
  assert.match(friends,/onPress=\{\(\)=>router.push\(`\/friend-calendar\?userId=\$\{r.id\}` as Href\)\}/);
  assert.doesNotMatch(friends,/友達の最近のトレーニング|最新20記録|詳しい記録を見る|setProfile|async function visit/);
  assert.match(friends,/managedFriend===r.id&&/);
  assert.match(friends,/automaticallyAdjustKeyboardInsets/);
  for(const action of ['request','accept','reject','cancel','remove','block','unblock','report']) assert.ok(friends.includes(`action:'${action}'`));
  const calendar=readFileSync(new URL('../mobile/src/app/friend-calendar.tsx',import.meta.url),'utf8');
  assert.match(calendar,/setNumber/);
  assert.match(calendar,/profile\?\.shared/);
});
test('スマホ幅のグラフは欠測で分断し100%を超えても上限を切らない',()=>{
  const points=[{start:'1',percent:50,individual:null},{start:'2',percent:null,individual:null},{start:'3',percent:125,individual:150}];
  const chart=lineSegments(points,'percent',320,260);
  assert.equal(chart.max,150);assert.equal(chart.paths.length,2);
  assert.deepEqual(chart.paths,['M35.00,158.33','M300.00,50.83']);
  assert.deepEqual(lineSegments(points,'individual',320,260).paths,['M300.00,15.00']);
  assert.deepEqual(lineSegments([{start:'1',percent:null,individual:null}],'percent',320,260).paths,[]);
});
test('友達カレンダーは取得完了前に空の月や仮の名前を表示しない',()=>{
  const calendar=readFileSync(new URL('../mobile/src/app/friend-calendar.tsx',import.meta.url),'utf8');
  const gate=calendar.indexOf('if (!profile) return');
  assert.ok(gate>calendar.indexOf('data?.key === key'));
  assert.ok(gate<calendar.indexOf('monthCells(month).map'));
  const pending=calendar.slice(gate,calendar.indexOf('return <SafeAreaView style={s.screen}><ScrollView'));
  assert.match(pending,/カレンダーを読み込み中/);
  assert.match(pending,/もう一度試す/);
  assert.match(pending,/router.back\(\)/);
  assert.doesNotMatch(pending,/monthCells|profile.name/);
  assert.doesNotMatch(calendar,/profile\?\.name \?\? '友達'/);
  assert.match(calendar,/if \(active\) setData\(\{ key, profile: result.profile \}\)/);
});
test('全体と個人を分離し、スマホ幅のグラフと折りたたみ数値を使用',()=>{
  const admin=readFileSync(new URL('../mobile/src/components/AdminRetention.tsx',import.meta.url),'utf8');
  const chart=readFileSync(new URL('../mobile/src/components/RetentionLineChart.tsx',import.meta.url),'utf8');
  const long=readFileSync(new URL('../mobile/src/components/LongRetention.tsx',import.meta.url),'utf8');
  assert.match(admin,/全体分析','個人分析/);assert.match(admin,/data\.longTerm\.selectedUserId===selected/);
  assert.match(chart,/event\.nativeEvent\.layout\.width-28/);assert.match(chart,/individual\?p\.individual:null/);
  assert.match(long,/details&&data\.points\.map/);assert.match(long,/!individual&&/);
});
