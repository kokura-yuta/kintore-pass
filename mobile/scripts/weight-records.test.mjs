import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(
  new URL('../src/lib/weightRecords.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

// 通信先を疑似関数へ置き換え、URL・HTTPメソッド・JSON変換だけを安全に確認する
function loadWeightRecords(apiRequest) {
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

test('体重履歴GETを画面用のrecordedOnへ変換する', async () => {
  const api = loadWeightRecords(async (path, options) => {
    assert.equal(path, '/api/weight-records');
    assert.equal(options.method, 'GET');
    assert.equal(options.token, 'test-token');
    return {
      records: [
        {
          id: 'record-1',
          recordedDate: '2026-09-09',
          weightKg: 66.5,
        },
      ],
      summary: {
        firstWeightKg: 66.5,
        latestWeightKg: 66.5,
        changeKg: 0,
        recordCount: 1,
      },
    };
  });

  const response = await api.fetchWeightRecords('test-token');
  assert.deepEqual(
    JSON.parse(JSON.stringify(response.records)),
    [
      {
        id: 'record-1',
        recordedOn: '2026-09-09',
        weightKg: 66.5,
      },
    ],
  );
});

test('体重の新規保存JSONをPOSTする', async () => {
  const api = loadWeightRecords(async (path, options) => {
    assert.equal(path, '/api/weight-records');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      recordedDate: '2026-09-09',
      weightKg: 66.5,
    });
    return {
      record: {
        id: 'record-1',
        recordedDate: '2026-09-09',
        weightKg: 66.5,
      },
    };
  });

  const record = await api.createWeightRecord(
    'test-token',
    '2026-09-09',
    66.5,
  );
  assert.equal(record.recordedOn, '2026-09-09');
});

test('体重変更JSONをPATCHする', async () => {
  const api = loadWeightRecords(async (path, options) => {
    assert.equal(path, '/api/weight-records');
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), {
      recordId: 'record-1',
      weightKg: 66.2,
    });
    return {
      record: {
        id: 'record-1',
        recordedDate: '2026-09-09',
        weightKg: 66.2,
      },
    };
  });

  const record = await api.updateWeightRecord(
    'test-token',
    'record-1',
    66.2,
  );
  assert.equal(record.weightKg, 66.2);
});

test('削除する記録IDをURLへ入れてDELETEする', async () => {
  const api = loadWeightRecords(async (path, options) => {
    assert.equal(
      path,
      '/api/weight-records?recordId=record-1',
    );
    assert.equal(options.method, 'DELETE');
    return {
      message: '体重記録を削除しました。',
      deletedRecordId: 'record-1',
    };
  });

  const response = await api.deleteWeightRecord(
    'test-token',
    'record-1',
  );
  assert.equal(response.deletedRecordId, 'record-1');
});
