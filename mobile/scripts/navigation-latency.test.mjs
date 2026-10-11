import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequestGate } from '../src/lib/requestGate.ts';
import { mergeConversationMetadata } from '../src/lib/chatHistoryState.ts';
import { canNavigateTab } from '../src/lib/planPresentation.ts';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve=yes; reject=no; }); return {promise,resolve,reject}; };

test('weight graph does not label unknown or failed data empty; own calendar keeps cards during refresh',()=>{
  const weight=read('../src/app/weight-history.tsx'),calendar=read('../src/app/calendar.tsx');
  assert.match(weight,/\) : isLoading \? <ScreenStateCard compact embedded title="体重の推移を確認中" type="loading"/);
  assert.match(weight,/: loadError \? <ScreenStateCard compact embedded/);
  assert.match(calendar,/\{!errorMessage \? selectedRecords.map/);
  assert.doesNotMatch(calendar,/!isLoading && !errorMessage \? selectedRecords.map/);
  assert.match(calendar,/!isLoading && !errorMessage && selectedRecords.length === 0/);
});

test('10 concurrent plan checks perform one request and one state update', async () => {
  const gate=createRequestGate(), d=deferred(); let calls=0, updates=0;
  const tasks=Array.from({length:10},()=>gate.run(()=>{calls++;return d.promise;},()=>updates++,()=>assert.fail()));
  await Promise.resolve(); assert.equal(calls,1); d.resolve('premium'); await Promise.all(tasks); assert.equal(updates,1);
  await gate.run(async()=>{calls++;return 'free';},()=>updates++,()=>assert.fail());
  assert.equal(calls,2); assert.equal(updates,2);
});
test('failure is not cached and retry updates the shared state', async () => {
  const gate=createRequestGate(); const seen=[];
  await gate.run(async()=>{throw Error('offline');},()=>assert.fail(),e=>seen.push(e.message));
  await gate.run(async()=> 'free',v=>seen.push(v),()=>assert.fail()); assert.deepEqual(seen,['offline','free']);
});
test('invalidated request cannot publish after resume or account disposal', async () => {
  const gate=createRequestGate(), old=deferred(), seen=[];
  const pending=gate.run(()=>old.promise,v=>seen.push(v),()=>assert.fail());
  gate.invalidate(); await gate.run(async()=> 'new',v=>seen.push(v),()=>assert.fail());
  old.resolve('obsolete-premium'); await pending; assert.deepEqual(seen,['new']);
});
test('separate user instances never share requests', async () => {
  const a=createRequestGate(), b=createRequestGate(), seen=[];
  await Promise.all([a.run(async()=> 'A',v=>seen.push(v),()=>assert.fail()),b.run(async()=> 'B',v=>seen.push(v),()=>assert.fail())]); assert.deepEqual(seen.sort(),['A','B']);
});
test('metadata keeps known messages, uses new title, and drops server-deleted conversations',()=>{
  const message={id:'msg',content:'cached'};
  const current=[{id:'local',serverConversationId:'server',title:'old',messages:[message]},{id:'removed',serverConversationId:'removed',title:'removed',messages:[]}];
  const loaded=[{id:'server',serverConversationId:'server',title:'new',messages:[]},{id:'other',serverConversationId:'other',title:'other',messages:[]}];
  const merged=mergeConversationMetadata(current,loaded);
  assert.equal(merged[0].title,'new'); assert.equal(merged[0].messages,current[0].messages); assert.equal(merged.length,2); assert.deepEqual(merged[1].messages,[]); assert.deepEqual(loaded[0].messages,[]);
});
test('different tab is immediate; same-tab duplicate taps are rejected',()=>{
  assert.equal(canNavigateTab(false,1000,1001,false),true);
  assert.equal(canNavigateTab(false,1000,1001,true),false);
  assert.equal(canNavigateTab(true,1000,2000,false),false);
});
test('shared plan checks are user scoped, expiry checked and fail closed',()=>{
  const root=read('../src/app/_layout.tsx'), provider=read('../src/contexts/PlanAccessContext.tsx'), hook=read('../src/hooks/usePlanAccess.ts');
  assert.match(root,/UserDataProviders key=\{userId/); assert.match(root,/<PlanAccessProvider>/);
  assert.match(provider,/\[pathname, refresh\]/); assert.match(provider,/setTimeout\(recheck/);
  assert.match(provider,/data: null, error: error instanceof Error/); assert.match(provider,/gate.invalidate\(\)/);
  assert.match(hook,/canAccessPaidScreen\(state.data\)/); assert.doesNotMatch(hook,/fetchSubscriptionStatus|AppState/);
});
test('chat refresh keeps content visible and rejects responses predating edits',()=>{
  const screen=read('../src/screens/ChatScreen.tsx');
  assert.match(screen,/epoch !== mutationEpoch.current/); assert.match(screen,/mutationEpoch.current \+= 1/);
  assert.match(screen,/isLoadingMessages\) && !activeConversation\?\.messages.length/);
  assert.match(screen,/最新の履歴を確認中/);
  assert.match(screen,/setMessageRevision\(value => value \+ 1\)/);
  assert.doesNotMatch(screen,/if \(\(activeConversation\?\.messages.length/);
});

test('main tabs keep mounted screens, URLs, inputs and one navigation bar',()=>{
  const tabs=read('../src/app/(tabs)/_layout.tsx');
  assert.match(tabs,/detachInactiveScreens=\{false\}/);
  assert.match(tabs,/lazy: false, animation: 'none', freezeOnBlur: false/);
  for(const [route,screen] of [['training','Training'],['food','Food'],['chat','Chat'],['my-page','MyPage']]) {
    assert.match(tabs,new RegExp(`Tabs.Screen name="${route}"`));
    assert.ok(read(`../src/app/(tabs)/${route}.tsx`).includes(`@/screens/${screen}Screen`));
    assert.doesNotMatch(read(`../src/screens/${screen}Screen.tsx`),/<BottomNavigation/);
  }
  assert.match(read('../src/components/PremiumScreen.tsx'),/!inTabs && <BottomNavigation/);
});
test('owner-only prefetch is user scoped, merges concurrent requests and fails closed',()=>{
  const provider=read('../src/contexts/AccountReadinessContext.tsx');
  const root=read('../src/app/_layout.tsx');
  assert.match(root,/UserDataProviders key=\{userId/);
  assert.match(root,/<AccountReadinessProvider>/);
  assert.match(provider,/friendGate.run/); assert.match(provider,/analysisGate.run/);
  assert.match(provider,/friends: null, friendError: error/);
  assert.match(provider,/analyses: null, analysisError: error/);
  assert.match(provider,/listener.remove\(\); friendGate.invalidate\(\); analysisGate.invalidate\(\)/);
  assert.doesNotMatch(provider,/AsyncStorage|SecureStore|friend-profile|friend-calendar/);
  assert.match(read('../src/app/friends.tsx'),/async function reload\(\)\{invalidateFriends\(\);await refreshFriends\(\)/);
});
test('unknown lists never flash a verified zero and unsaved settings survive refresh',()=>{
  const friends=read('../src/app/friends.tsx'), analyses=read('../src/app/analysis-history.tsx');
  assert.match(friends,/snapshot\?`\$\{friends.length\}人`:'—'/);
  assert.match(friends,/snapshot&&!friends.length/);
  assert.match(friends,/settings=hasChanges\?settingsDraft:snapshot\?\.settings/);
  assert.match(analyses,/snapshot !== null \? 'ready' : analysisError \? 'error' : 'loading'/);
  assert.doesNotMatch(analyses,/setAnalyses|setStatus|setSelectedId\(\(currentId\)/);
});
test('food same-date refresh preserves rows; chat layout cannot trigger animated scrolling',()=>{
  const food=read('../src/screens/FoodScreen.tsx'),chat=read('../src/screens/ChatScreen.tsx');
  assert.match(food,/showInitialLoading = isLoading && loadedDate !== viewDate/);
  assert.match(food,/if \(displayedDate.current !== date\) setEntries\(\[\]\)/);
  assert.match(food,/if \(version !== loadVersion.current\) return/);
  assert.match(chat,/\[resolvedActiveId, lastMessageId\]/);
  assert.match(chat,/onContentSizeChange=\{\(\) => \{ if \(scrollPending.current\)/);
  assert.doesNotMatch(chat,/scrollToEnd\(\{ animated: true/);
});
test('new AI menu/edit initializes form while clearing saved draft keeps success UI',()=>{
  const route=read('../src/app/(tabs)/training.tsx');
  assert.match(route,/if \(draft && menuKey !== draft.menuId\) setMenuKey\(draft.menuId\)/);
  assert.match(route,/editId \? `edit:\$\{editId\}` : `menu:\$\{menuKey\}`/);
  assert.match(read('../src/screens/TrainingScreen.tsx'),/router.setParams\(\{ editId: undefined \}\)/);
});

test('prefetch begun before a settings mutation cannot overwrite its refreshed result',async()=>{
  const gate=createRequestGate(),before=deferred(),during=deferred(),seen=[];
  const first=gate.run(()=>before.promise,v=>seen.push(v),()=>assert.fail());
  gate.invalidate();
  const second=gate.run(()=>during.promise,v=>seen.push(v),()=>assert.fail());
  gate.invalidate();
  await gate.run(async()=> 'saved-settings',v=>seen.push(v),()=>assert.fail());
  before.resolve('old-settings');during.resolve('intermediate-settings');
  await Promise.all([first,second]);assert.deepEqual(seen,['saved-settings']);
});
