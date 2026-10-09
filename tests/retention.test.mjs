import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeRetention, japanDay, dateLabel } from '../shared/retention.ts';
import { readFileSync } from 'node:fs';
import { retentionEndpoint } from '../app/lib/admin/retentionEndpoint.ts';
const now = new Date('2026-10-10T03:00:00Z');
const user = (extra = {}) => ({ id: 'u', displayName: null, createdAt: '2026-08-01T00:00:00Z', weeklyGoal: 4, trainingDays: [], totalTrainingDays: 0, lastTrainingDate: null, activityDays: [], measurementStartedOn: null, ...extra });
const analyze = (users) => analyzeRetention(users, now);
test('日本時間の日付境界', () => {
  assert.equal(dateLabel(japanDay('2026-10-09T15:00:00Z')), '2026-10-10');
  assert.equal(dateLabel(japanDay('2026-10-09T14:59:59Z')), '2026-10-09');
});
test('同じ日の複数記録・登録前・未来を除外', () => {
  const r = analyze([user({ createdAt: '2026-10-04T00:00:00Z', trainingDays: ['2026-10-03', '2026-10-04', '2026-10-04', '2026-10-05', '2026-10-11'] })]).rows[0];
  assert.equal(r.seven.actual, 2); assert.equal(r.seven.percent, 50);
});
test('登録直後を按分し判定保留・登録前週はnull', () => {
  const r = analyze([user({ createdAt: '2026-10-10T01:00:00Z', trainingDays: ['2026-10-10'] })]).rows[0];
  assert.equal(r.seven.target, 4 / 7); assert.equal(r.status, '判定保留');
  assert.equal(r.weeks[0].percent, null); assert.equal(r.seven.partial, true);
});
test('目標未設定を0%や平均の分母に含めない', () => {
  const r = analyze([user(), user({ id: 'b', weeklyGoal: null }), user({ id: 'c', weeklyGoal: 0 })]);
  assert.equal(r.summary.meanSeven.users, 1); assert.equal(r.rows[1].seven.percent, null);
  assert.equal(r.rows[1].status, '判定保留');
});
test('100%以上と算術平均', () => {
  const r = analyze([user({ trainingDays: ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'] }), user({ id: 'b', weeklyGoal: 1 })]);
  assert.equal(r.rows[0].seven.percent, 125); assert.equal(r.summary.meanSeven.percent, 62.5);
});
test('継続中・頻度低下・活動なし・目標未達と設定変更', () => {
  const earlier = Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 13).padStart(2, '0')}`);
  const r = analyze([user({ trainingDays: [...earlier, '2026-10-09'], lastTrainingDate: '2026-10-09' })]);
  assert.equal(r.rows[0].status, '頻度低下');
  assert.equal(analyze([user()]).rows[0].status, '活動なし');
  assert.equal(analyze([user({ trainingDays: ['2026-10-09'], lastTrainingDate: '2026-10-09' })]).rows[0].status, '目標未達');
  assert.equal(analyzeRetention([user({ trainingDays: ['2026-10-09'], lastTrainingDate: '2026-10-09' })], now, { ongoingPercent: 20, declinePoints: 20, inactiveDays: 14, minimumDays: 7 }).rows[0].status, '継続中');
});
test('追加・変更・削除は再集計で反映', () => {
  assert.equal(analyze([user({ trainingDays: ['2026-10-09'] })]).rows[0].seven.actual, 1);
  assert.equal(analyze([user({ trainingDays: ['2026-09-01'] })]).rows[0].seven.actual, 0);
  assert.equal(analyze([user()]).rows[0].seven.actual, 0);
});
test('アプリD7は指定日・日本時間・終了した対象日だけ判定', () => {
  const r = analyze([user({ createdAt: '2026-10-01T15:00:00Z', measurementStartedOn: '2026-10-02', activityDays: ['2026-10-09'] }), user({ id: 'b', createdAt: '2026-10-03T00:00:00Z', measurementStartedOn: '2026-10-03' })]);
  assert.deepEqual(r.appRetention[0], { day: 7, eligible: 1, measured: 1, unmeasured: 0, retained: 1, percent: 100 });
});
test('アプリ未計測者は未継続に偽装せず率を非表示', () => {
  const r = analyze([user({ trainingDays: ['2026-10-09'] })]);
  assert.equal(r.appRetention[0].percent, null); assert.equal(r.appRetention[0].unmeasured, 1); assert.equal(r.appRetention[0].retained, 0);
});
test('空ユーザーも0%を捏造しない・8週間を返す', () => {
  const r = analyze([]); assert.equal(r.summary.meanSeven.percent, null); assert.equal(r.weeklyMeans.length, 8); assert.equal(r.appRetention[0].percent, null);
});
test('匿名・一般ユーザーはHTTP401/403になりDBへ一切アクセスしない', async () => {
  for (const status of [401, 403]) {
    let called = false;
    const response = await retentionEndpoint(new Request('https://example.com/api/admin/retention?preview=1'), {
      authorize: async () => ({ allowed: false, status }), load: async () => { called = true; return {}; }, report: () => {},
    });
    assert.equal(response.status, status); assert.equal(called, false); assert.match(response.headers.get('cache-control'), /no-store/);
  }
});
test('管理者だけが取得可能、障害時の秘密は返さない', async () => {
  const authorize = async () => ({ allowed: true });
  const response = await retentionEndpoint(new Request('https://example.com/api/admin/retention'), { authorize, load: async () => ({ total: 2 }), report: () => {} });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { total: 2 });
  const failure = await retentionEndpoint(new Request('https://example.com/api/admin/retention'), { authorize, load: async () => { throw new Error('postgres://private-secret'); }, report: () => {} });
  assert.equal(failure.status, 503); assert.doesNotMatch(await failure.text(), /private-secret/);
});
test('APIが既存認可を使用し、匿名previewなし、秘密情報返却なし', () => {
  const route = readFileSync(new URL('../app/api/admin/retention/route.ts', import.meta.url), 'utf8');
  assert.match(route, /authorize: getAdminIdentity/); assert.doesNotMatch(route, /preview/);
  const service = readFileSync(new URL('../app/lib/admin/retentionData.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(service, /users\.email|clerkUserId|bodyAnalyses|chatMessages/);
});
test('本人の利用イベントだけ保存し、削除時cascade、1日1件', () => {
  const route = readFileSync(new URL('../app/api/activity/route.ts', import.meta.url), 'utf8');
  assert.match(route, /getClerkUserId\(request\)/); assert.match(route, /users\.clerkUserId, clerkId/); assert.match(route, /onConflictDoNothing/); assert.doesNotMatch(route, /request\.json/);
  const sql = readFileSync(new URL('../drizzle-postgres/0018_add_app_usage_days.sql', import.meta.url), 'utf8');
  assert.match(sql, /ON DELETE CASCADE/); assert.match(sql, /PRIMARY KEY \(user_id, activity_date\)/);
});
