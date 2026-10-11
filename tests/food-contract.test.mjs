import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptsNullableFood, foodResponseRecord } from '../app/lib/validation/foodContract.ts';

test('旧版は数値、新版はnullを受け取り、DB値は変更しない', () => {
  const row = { id: 'test', calories: null, proteinGrams: null };
  assert.deepEqual(foodResponseRecord(row, false), { ...row, calories: 0, proteinGrams: 0 });
  assert.equal(foodResponseRecord(row, true), row);
  assert.equal(row.calories, null);
  for (const value of [0, 15.5]) {
    assert.equal(foodResponseRecord({ ...row, calories: value }, false).calories, value);
  }
});

test('明示したnullable-v1だけが新しい食事契約を利用する', () => {
  const request = headers => new Request('https://example.test/api/food-records', { headers });
  assert.equal(acceptsNullableFood(request({})), false);
  assert.equal(acceptsNullableFood(request({ 'x-kintorepas-food-contract': 'unknown' })), false);
  assert.equal(acceptsNullableFood(request({ 'x-kintorepas-food-contract': 'nullable-v1' })), true);
});
