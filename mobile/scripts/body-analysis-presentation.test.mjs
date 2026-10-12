import test from 'node:test';
import assert from 'node:assert/strict';
import { averageBodyScore100, remainingBodyAnalyses } from '../src/lib/bodyAnalysisPresentation.ts';
const now = new Date('2026-10-12T00:00:00Z');
const plan = { canUseAiFeatures: true, accessLevel: 'premium', status: 'active', expiresAt: '2026-11-01T00:00:00Z', features: { bodyAnalysis: { currentLimit: 4 } }, trial: { startedAt: '2026-10-10T00:00:00Z', endsAt: '2026-10-17T00:00:00Z' } };
const record = analyzedAt => ({ analyzedAt });
test('average converts valid ten point scores to 100 without changing stored results', () => {
  assert.equal(averageBodyScore100({ areas: [{score:7}, {score:8}, {score:null}] }),75);
  assert.equal(averageBodyScore100({ areas: [{score:10}] }),100);
  assert.equal(averageBodyScore100(null),null);
  assert.equal(averageBodyScore100({areas:[{score:NaN},{score:11}]}),null);
});
test('monthly usage follows JST month boundary and clamps to zero', () => {
  assert.equal(remainingBodyAnalyses(plan,[record('2026-09-30T14:59:59Z'),record('2026-09-30T15:00:00Z')],now),3);
  assert.equal(remainingBodyAnalyses(plan,Array(5).fill(record('2026-10-11T00:00:00Z')),now),0);
});
test('trial uses its own interval; unavailable data never displays guessed availability', () => {
  const trial={...plan,accessLevel:'trial',features:{bodyAnalysis:{currentLimit:1}}};
  assert.equal(remainingBodyAnalyses(trial,[record('2026-10-09T00:00:00Z')],now),1);
  assert.equal(remainingBodyAnalyses(trial,[record('2026-10-10T00:00:00Z')],now),0);
  assert.equal(remainingBodyAnalyses(null,[],now),null);
  assert.equal(remainingBodyAnalyses(plan,null,now),null);
  assert.equal(remainingBodyAnalyses(plan,[record(null)],now),null);
  assert.equal(remainingBodyAnalyses({...plan,expiresAt:'2026-10-11T00:00:00Z'},[],now),0);
  assert.equal(remainingBodyAnalyses({...plan,accessLevel:'free',canUseAiFeatures:false},[],now),0);
});
