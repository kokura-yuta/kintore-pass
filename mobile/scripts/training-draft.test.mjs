import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrainingDraft, trainingDraftKey } from '../src/lib/trainingFormDraft.ts';
import { readChunks, writeChunks } from '../src/lib/chunkedDraftStorage.ts';

const draft = { version: 1, exercises: [{ id: 'bench', name: 'ベンチプレス', category: '胸', equipment: 'バーベル', sets: [{ id: '1', weightKg: '42.5', reps: '8' }, { id: '2', weightKg: '', reps: '' }] }], trainingMinutes: '45', condition: 3, memo: '途中', performedAt: '2026-10-13T14:50:00.000Z' };
test('all in-progress fields including blank sets and original date survive restart', () => {
  assert.deepEqual(parseTrainingDraft(JSON.stringify(draft)), draft);
  assert.equal(parseTrainingDraft(JSON.stringify({ ...draft, condition: 10 })).condition, 10);
});
test('large drafts round-trip and failed writes preserve the previous committed draft', () => {
  const data = new Map();
  let failAt = -1;
  let writes = 0;
  const store = { get: k => data.get(k) ?? null, set: (k, v) => { if (++writes === failAt) throw Error('disk full'); data.set(k, v); } };
  const value = JSON.stringify({ ...draft, memo: '記録🏋️'.repeat(1000) });
  writeChunks(store, 'user', value);
  assert.equal(readChunks(store, 'user'), value);
  writes = 0; failAt = 2;
  assert.throws(() => writeChunks(store, 'user', value + 'new'));
  assert.equal(readChunks(store, 'user'), value);
  failAt = -1;
  writeChunks(store, 'user', 'null');
  assert.equal(parseTrainingDraft(readChunks(store, 'user')), null);
});
test('different users, edit sessions and new records never share a key', () => {
  const keys = [trainingDraftKey('user_a'), trainingDraftKey('user_b'), trainingDraftKey('user_a', 'session1'), trainingDraftKey('user_a', 'session2'), trainingDraftKey('user.a')];
  assert.equal(new Set(keys).size, keys.length);
  keys.forEach(key => assert.match(key, /^[a-zA-Z0-9._-]+$/));
});
test('clear marker and missing storage do not restore a previous session', () => {
  assert.equal(parseTrainingDraft(null), null);
  assert.equal(parseTrainingDraft('null'), null);
});
test('malformed drafts fail explicitly instead of silently overwriting data', () => {
  for (const raw of ['bad json', '{}', JSON.stringify({ ...draft, performedAt: 'bad' }), JSON.stringify({ ...draft, exercises: [null] })]) assert.throws(() => parseTrainingDraft(raw));
});
