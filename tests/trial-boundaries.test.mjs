import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolveAppAccessLevel, decideBodyAnalysisAccess, trialDurationDays,
  trialDailyChatLimit, premiumDailyChatLimit, trialDailyMenuLimit,
  premiumDailyMenuLimit, trialBodyAnalysisTotalLimit, premiumBodyAnalysisMonthlyLimit,
} from '../app/lib/subscriptions/policy.ts';

const start = new Date('2026-09-28T03:00:00Z');
const end = new Date(start.getTime() + trialDurationDays * 86400000);
const base = { isPremium: false, trialUsed: true, trialStartedAt: start, trialEndsAt: end };

test('無料体験は開始直前Free、開始時Trial、7日経過の瞬間Free', () => {
  assert.equal(end.getTime() - start.getTime(), 7 * 86400000);
  for (const [time, expected] of [
    [start.getTime() - 1, 'free'], [start.getTime(), 'trial'],
    [end.getTime() - 1, 'trial'], [end.getTime(), 'free'], [end.getTime() + 1, 'free'],
  ]) assert.equal(resolveAppAccessLevel({ ...base, now: new Date(time) }), expected);
});

test('未使用・不完全な体験情報には権限を付けず、有効Premiumを優先する', () => {
  const now = new Date(start.getTime() + 1000);
  for (const patch of [{ trialUsed: false }, { trialStartedAt: null }, { trialEndsAt: null }]) {
    assert.equal(resolveAppAccessLevel({ ...base, ...patch, now }), 'free');
  }
  assert.equal(resolveAppAccessLevel({ ...base, isPremium: true, now: end }), 'premium');
});

test('体験1回・Premium4回の身体分析境界とFree拒否', () => {
  assert.equal(trialBodyAnalysisTotalLimit, 1);
  assert.equal(premiumBodyAnalysisMonthlyLimit, 4);
  for (let used = 0; used <= 5; used++) {
    assert.equal(decideBodyAnalysisAccess({ accessLevel: 'trial', trialCompleted: used, completedThisMonth: 0 }).allowed, used < 1);
    assert.equal(decideBodyAnalysisAccess({ accessLevel: 'premium', trialCompleted: 1, completedThisMonth: used }).allowed, used < 4);
    assert.equal(decideBodyAnalysisAccess({ accessLevel: 'free', trialCompleted: used, completedThisMonth: 0 }).allowed, false);
  }
});

test('月をまたいでも体験の身体分析利用数はリセットされない', () => {
  assert.equal(resolveAppAccessLevel({ ...base, now: new Date('2026-10-01T00:00:00Z') }), 'trial');
  assert.equal(decideBodyAnalysisAccess({ accessLevel: 'trial', trialCompleted: 1, completedThisMonth: 0 }).allowed, false);
});

test('体験とPremiumのチャット30・メニュー3の設定', () => {
  assert.equal(trialDailyChatLimit, 30);
  assert.equal(premiumDailyChatLimit, 30);
  assert.equal(trialDailyMenuLimit, 3);
  assert.equal(premiumDailyMenuLimit, 3);
});

test('ソース確認：体験再利用はDBの未使用条件で制限する', async () => {
  const route = await readFile('app/api/subscription/trial/route.ts', 'utf8');
  const slots = await readFile('app/lib/subscriptions/trialSlots.ts', 'utf8');
  assert.match(route, /if \(user\.trialUsed\)/);
  assert.match(slots, /trial_used = false/);
  assert.match(slots, /trial_used = true/);
  assert.match(slots, /for update/);
});

test('ソース確認：体験期限判定は記録の削除処理を持たない', async () => {
  for (const file of ['policy.ts', 'entitlements.ts', 'trialSlots.ts']) {
    const source = await readFile(`app/lib/subscriptions/${file}`, 'utf8');
    assert.doesNotMatch(source, /\.delete\s*\(|\bdelete\s+from\b/i);
  }
});

test('ソース確認：通常時の上限拒否は外部AIの呼び出しより先', async () => {
  for (const [route, guard] of [['chat', 'if (usedChatCount >= dailyChatLimit)'], ['ai-menu', 'if (usedMenuCount >= dailyMenuLimit)']]) {
    const source = await readFile(`app/api/${route}/route.ts`, 'utf8');
    assert.ok(source.indexOf(guard) >= 0);
    assert.ok(source.indexOf(guard) < source.indexOf('openai.responses.'));
  }
});
