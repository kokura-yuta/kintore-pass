import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/lib/trainingRecords.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadTrainingRecords(apiRequest) {
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
  performedAt: '2026-09-09T01:00:00.000Z',
  durationMinutes: 60,
  conditionScore: 8,
  memo: 'フォーム良好',
  exercises: [{
    exerciseId: 'bench-press',
    exerciseName: 'ベンチプレス',
    bodyPart: '胸',
    bodyArea: null,
    displayOrder: 0,
    sets: [{ setNumber: 1, weightKg: 60, reps: 10 }],
  }],
};

test('トレーニング記録の変更内容をPATCHする', async () => {
  const api = loadTrainingRecords(async (path, options) => {
    assert.equal(path, '/api/training-records');
    assert.equal(options.method, 'PATCH');
    assert.equal(options.token, 'test-token');
    assert.deepEqual(JSON.parse(options.body), {
      trainingSessionId: 'session-1',
      ...input,
    });
    return { message: '更新しました。', trainingSessionId: 'session-1' };
  });

  const response = await api.updateTrainingRecord('test-token', 'session-1', input);
  assert.equal(response.trainingSessionId, 'session-1');
});

test('削除対象の記録IDをDELETEのJSONへ入れる', async () => {
  const api = loadTrainingRecords(async (path, options) => {
    assert.equal(path, '/api/training-records');
    assert.equal(options.method, 'DELETE');
    assert.deepEqual(JSON.parse(options.body), { trainingSessionId: 'session-1' });
    return { message: '削除しました。', deletedTrainingSessionId: 'session-1' };
  });

  const response = await api.deleteTrainingRecord('test-token', 'session-1');
  assert.equal(response.deletedTrainingSessionId, 'session-1');
});
