import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { readChunks, writeChunks } from '../src/lib/chunkedDraftStorage.ts';
import { trainingDraftKey } from '../src/lib/trainingFormDraft.ts';
import { restoreVerifiedPurchases } from '../src/lib/restorePurchases.ts';
import { parseFoodDraft } from '../src/lib/foodFormDraft.ts';
const purchase = { productId: 'premium', purchaseToken: 'signed' };
test('restore requires server verification, transaction finish and refresh in that order', async () => {
  const calls = [];
  const result = await restoreVerifiedPurchases([purchase], 'premium', async () => { calls.push('verify'); return { plan: 'premium' }; }, async () => { calls.push('finish'); }, () => { calls.push('refresh'); });
  assert.equal(result, 'restored'); assert.deepEqual(calls, ['verify', 'finish', 'refresh']);
});
test('missing or unrelated purchases are not presented as restored', async () => {
  const unexpected = () => { throw Error('must not be called'); };
  for (const list of [[], [{ ...purchase, productId: 'other' }], [{ productId: 'premium' }]]) assert.equal(await restoreVerifiedPurchases(list, 'premium', unexpected, unexpected, unexpected), 'empty');
});
test('verification, finish, and refresh failures never report restoration success', async () => {
  const good = async () => ({ plan: 'premium' });
  const fail = async () => { throw Error('offline'); };
  await assert.rejects(restoreVerifiedPurchases([purchase], 'premium', fail, good, good));
  await assert.rejects(restoreVerifiedPurchases([purchase], 'premium', good, fail, good));
  await assert.rejects(restoreVerifiedPurchases([purchase], 'premium', good, good, fail));
  await assert.rejects(restoreVerifiedPurchases([purchase], 'premium', async () => ({ plan: 'free' }), good, good));
});
test('food draft retains incomplete numbers, chosen date and edit identity', () => {
  const draft = { entryDate: '2026-10-13', editingId: 'food1', mealType: '昼食', name: 'ご飯', calories: '1.', protein: '' };
  assert.deepEqual(parseFoodDraft(JSON.stringify(draft)), draft);
  assert.equal(parseFoodDraft('null'), null);
  assert.throws(() => parseFoodDraft('{bad'));
  assert.throws(() => parseFoodDraft(JSON.stringify({ ...draft, mealType: 'invalid' })));
});
test('account deletion cleans drafts after confirmation and before sign-out', () => {
  const source = readFileSync(new URL('../src/screens/MyPageScreen.tsx', import.meta.url), 'utf8');
  const flow = source.slice(source.indexOf('async function performAccountDeletion'));
  assert.ok(flow.indexOf('if (!response) return') < flow.indexOf('await clearUserDrafts'));
  assert.ok(flow.indexOf('await clearUserDrafts') < flow.indexOf('await signOut'));
});
test('native storage skips duplicate writes, deletes only owner data, and retries interrupted deletion', async () => {
  const require = createRequire(import.meta.url);
  const ts = require('typescript');
  const source = readFileSync(new URL('../src/lib/trainingDraftStorage.native.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const data = new Map();
  let writes = 0; let deletes = 0; let failDelete = -1;
  const secure = { getItem: k => data.get(k) ?? null, setItem: (k, v) => { writes++; data.set(k, v); }, getItemAsync: async k => data.get(k) ?? null, deleteItemAsync: async k => { if (++deletes === failDelete) throw Error('locked'); data.delete(k); } };
  const exports = {};
  new Function('require', 'exports', compiled)(name => name === 'expo-secure-store' ? secure : name === './chunkedDraftStorage' ? { readChunks, writeChunks } : { trainingDraftKey }, exports);
  const a = trainingDraftKey('a'); const b = trainingDraftKey('b');
  exports.writeTrainingDraft(a, 'あ'.repeat(1500));
  const previousWrites = writes;
  exports.writeTrainingDraft(a, 'あ'.repeat(1500));
  assert.equal(writes, previousWrites);
  exports.writeTrainingDraft(a, '短い記録');
  exports.writeTrainingDraft(b, 'other user');
  exports.writeTrainingDraft(trainingDraftKey('a', 'food-form'), 'food');
  failDelete = 3;
  await assert.rejects(exports.clearUserDrafts('a'));
  failDelete = -1;
  await exports.clearUserDrafts('a');
  assert.equal(exports.readTrainingDraft(b), 'other user');
  assert.throws(() => exports.writeTrainingDraft(a, 'resurrect'));
  assert.equal([...data.values()].some(v => v === 'food' || v === '短い記録' || v === 'あ'.repeat(400)), false);
});
