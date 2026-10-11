import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPickerExercises } from '../src/lib/exercisePickerFilter.ts';

const catalog = [
  { id: 'bench', name: 'ベンチプレス', category: '胸', equipment: 'バーベル' },
  { id: 'squat', name: 'スクワット', category: '脚', equipment: 'バーベル' },
  { id: 'curl', name: 'カール', category: '腕', equipment: 'ダンベル' },
];
test('favorites shows registered exercises across body parts; all and category filters stay intact', () => {
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', '', ['bench', 'curl']), [catalog[0], catalog[2]]);
  assert.deepEqual(filterPickerExercises(catalog, 'すべて', '', ['bench']), catalog);
  assert.deepEqual(filterPickerExercises(catalog, '脚', '', []), [catalog[1]]);
});
test('favorites combines name/equipment search and reacts to registration/removal without duplicates', () => {
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', ' ダンベル ', ['bench', 'curl', 'curl']), [catalog[2]]);
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', 'ベンチ', ['bench']), [catalog[0]]);
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', '', ['curl']), [catalog[2]]);
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', '', []), []);
  assert.deepEqual(filterPickerExercises(catalog, 'お気に入り', '', ['missing']), []);
});
