import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { canAccessPaidScreen, canNavigateTab, planLabel } from '../src/lib/planPresentation.ts';

const now = Date.parse('2026-10-08T00:00:00Z');
test('Free確認用URLは開発時のみで、APIバイパスより優先して閉じる', () => {
  const source = readFileSync(new URL('../src/hooks/usePlanAccess.ts', import.meta.url), 'utf8');
  assert.match(source, /isFreePreview = __DEV__ && previewPlan === 'free'/);
  assert.match(source, /if \(isFreePreview \|\| isApiBypassEnabled \|\| !isLoaded\) return/);
  assert.match(source, /allowed: !isFreePreview &&/);
});
const future = '2026-10-09T00:00:00Z';
const plan = (overrides = {}) => ({ accessLevel: 'free', canUseAiFeatures: false, status: 'inactive', expiresAt: null, trial: { endsAt: null }, ...overrides });
test('Free・未確認・体験スキップは有料画面を開かない', () => {
  assert.equal(canAccessPaidScreen(null, now), false);
  assert.equal(canAccessPaidScreen(plan(), now), false);
  assert.equal(canAccessPaidScreen(plan({ canUseAiFeatures: true }), now), false);
  assert.equal(planLabel(plan(), now), 'Free（無料）');
});
test('体験とPremiumの有効期限・サーバー許可を確認する', () => {
  const trial = plan({ accessLevel: 'trial', canUseAiFeatures: true, trial: { endsAt: future } });
  const premium = plan({ accessLevel: 'premium', canUseAiFeatures: true, expiresAt: future });
  for (const value of [trial, premium]) {
    assert.equal(canAccessPaidScreen(value, now), true);
    assert.equal(canAccessPaidScreen(value, Date.parse(future)), false);
    assert.equal(canAccessPaidScreen({ ...value, canUseAiFeatures: false }, now), false);
  }
  assert.equal(planLabel(trial, now), '7日間無料体験中');
  assert.equal(planLabel(premium, now), 'Premium');
  assert.equal(canAccessPaidScreen({ ...premium, expiresAt: 'invalid' }, now), false);
});
test('運営権限はサーバーが許可したPremiumだけで、無料と明示する', () => {
  const operator = plan({ accessLevel: 'premium', status: 'operator', canUseAiFeatures: true });
  assert.equal(canAccessPaidScreen(operator, now), true);
  assert.equal(planLabel(operator, now), '運営用Premium（無料）');
  assert.equal(canAccessPaidScreen({ ...operator, canUseAiFeatures: false }, now), false);
});
test('現在タブと連打は遷移しない', () => {
  assert.equal(canNavigateTab(true, 0, 1000), false);
  assert.equal(canNavigateTab(false, 1000, 1200), false);
  assert.equal(canNavigateTab(false, 1000, 1600), true);
});
test('有料画面を共通ガードで囲み、手動記録は囲まない', () => {
  for (const name of ['home', 'chat', 'ai-coach', 'body-analysis']) {
    const source = readFileSync(new URL(`../src/app/${name}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /return <PremiumScreen/);
  }
  for (const name of ['training', 'food']) {
    assert.doesNotMatch(readFileSync(new URL(`../src/app/${name}.tsx`, import.meta.url), 'utf8'), /<PremiumScreen/);
  }
});
test('通常起動と初回設定の完了先は記録画面', () => {
  const bootstrap = readFileSync(new URL('../src/app/bootstrap.tsx', import.meta.url), 'utf8');
  assert.match(bootstrap, /if \(data.onboardingCompleted\) \{\s*router.replace\('\/training'\)/);
  for (const name of ['initial-analysis', 'body-analysis']) {
    const source = readFileSync(new URL(`../src/app/${name}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /router.replace\('\/training'\)/);
    assert.doesNotMatch(source, /router.replace\('\/home'\)/);
  }
});
