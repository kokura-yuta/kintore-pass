import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(
  new URL('../src/lib/foodRecords.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function loadFoodRecords(apiRequest) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => {
      if (id === '@/lib/api') return { apiRequest };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return exports;
}

const input = {
  recordedDate: '2026-09-11',
  mealType: '昼食',
  name: '鶏むね肉とご飯',
  calories: 650,
  proteinGrams: 42.5,
};

test('指定日の食事記録をGETする', async () => {
  const api = loadFoodRecords(async (path, options) => {
    assert.equal(path, '/api/food-records?date=2026-09-11');
    assert.equal(options.method, 'GET');
    assert.equal(options.token, 'test-token');
    return {
      date: '2026-09-11',
      records: [],
      summary: {
        totalCalories: 0,
        totalProteinGrams: 0,
        recordCount: 0,
      },
    };
  });

  const response = await api.fetchFoodRecords(
    'test-token',
    '2026-09-11',
  );
  assert.equal(response.date, '2026-09-11');
});

test('新しい食事記録をPOSTする', async () => {
  const api = loadFoodRecords(async (path, options) => {
    assert.equal(path, '/api/food-records');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), input);
    return { record: { id: 'food-1', ...input } };
  });

  const record = await api.createFoodRecord('test-token', input);
  assert.equal(record.id, 'food-1');
});

test('食事記録IDと変更内容をPATCHする', async () => {
  const api = loadFoodRecords(async (path, options) => {
    assert.equal(path, '/api/food-records');
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), {
      recordId: 'food-1',
      ...input,
    });
    return { record: { id: 'food-1', ...input } };
  });

  const record = await api.updateFoodRecord(
    'test-token',
    'food-1',
    input,
  );
  assert.equal(record.name, input.name);
});

test('食事記録IDをURLへ入れてDELETEする', async () => {
  const api = loadFoodRecords(async (path, options) => {
    assert.equal(path, '/api/food-records?recordId=food-1');
    assert.equal(options.method, 'DELETE');
    return {
      message: '食事記録を削除しました。',
      deletedRecordId: 'food-1',
    };
  });

  const response = await api.deleteFoodRecord(
    'test-token',
    'food-1',
  );
  assert.equal(response.deletedRecordId, 'food-1');
});
