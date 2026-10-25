import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCustomExercise, parseCustomExercises } from '../src/lib/customExercises.ts';
import { exerciseCatalog } from '../src/lib/exerciseCatalog.ts';
import { filterPickerExercises } from '../src/lib/exercisePickerFilter.ts';

test('adding a custom exercise preserves every built-in exercise and search/favorites', () => {
  const original = JSON.stringify(exerciseCatalog);
  const custom = makeCustomExercise('custom-extra', '独自ケーブル種目', '胸', 'ケーブル', exerciseCatalog);
  const catalog = [...exerciseCatalog, custom];
  const all = filterPickerExercises(catalog, 'すべて', '', []);
  assert.equal(all.length, exerciseCatalog.length + 1);
  assert.deepEqual(all.slice(0, -1), exerciseCatalog);
  assert.ok(filterPickerExercises(catalog, '胸', 'ベンチプレス', []).some(item => item.id === 'bench-press'));
  assert.deepEqual(filterPickerExercises(catalog, 'すべて', '独自', []), [custom]);
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', '', [custom.id]), [custom]);
  assert.equal(JSON.stringify(exerciseCatalog), original);
});

test('custom exercise retains its id and body part after storage round trip', () => {
  const item = makeCustomExercise('custom-test', '  ケーブルプレス  ', '胸', '', []);
  assert.equal(item.name, 'ケーブルプレス');
  assert.equal(item.equipment, '自作種目');
  assert.deepEqual(parseCustomExercises(JSON.stringify([item])), [item]);
  assert.deepEqual(parseCustomExercises(null), []);
});
test('rejects empty names, invalid parts, oversized inputs and normalized duplicates', () => {
  assert.throws(() => makeCustomExercise('custom-1', '  ', '胸', '', []));
  assert.throws(() => makeCustomExercise('custom-1', 'test', '不明', '', []));
  assert.throws(() => makeCustomExercise('custom-1', 'a'.repeat(61), '胸', '', []));
  assert.throws(() => makeCustomExercise('custom-1', 'test', '胸', 'a'.repeat(41), []));
  const item = makeCustomExercise('custom-1', 'ABC', '胸', '', []);
  assert.throws(() => makeCustomExercise('custom-2', 'ａｂｃ', '胸', '', [item]));
});
test('corrupt stored data fails explicitly instead of being overwritten', () => {
  assert.throws(() => parseCustomExercises('{'));
  assert.throws(() => parseCustomExercises('{}'));
  assert.throws(() => parseCustomExercises('[{"id":"bench-press"}]'));
  const item = makeCustomExercise('custom-1', 'test', '脚', '', []);
  assert.throws(() => parseCustomExercises(JSON.stringify([item, item])));
});
