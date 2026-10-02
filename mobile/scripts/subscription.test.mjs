import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/lib/subscription.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(apiRequest) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: id => {
    if (id === '@/lib/api') return { apiRequest };
    throw new Error(`Unexpected import: ${id}`);
  } });
  return exports;
}

test('課金状態は認証付きGETのサーバー結果を使用', async () => {
  for (const plan of ['free', 'premium']) {
    const api = load(async (path, options) => {
      assert.equal(path, '/api/subscription');
      assert.equal(options.token, 'test-token');
      assert.equal(options.method, 'GET');
      return { plan };
    });
    assert.equal((await api.fetchSubscriptionStatus('test-token')).plan, plan);
  }
});

test('購入・復元で使用する検証APIに署名付き取引と認証トークンを送る', async () => {
  const api = load(async (path, options) => {
    assert.equal(path, '/api/subscription/apple/verify');
    assert.equal(options.method, 'POST');
    assert.equal(options.token, 'test-token');
    assert.deepEqual(JSON.parse(options.body), { signedTransactionInfo: 'test-signed-transaction' });
    return { plan: 'premium' };
  });
  assert.equal((await api.verifyAppleSubscription('test-token', 'test-signed-transaction')).plan, 'premium');
});

test('購入検証エラーを成功へ置き換えず画面へ返す', async () => {
  const error = new Error('検証できませんでした');
  const api = load(async () => { throw error; });
  await assert.rejects(api.verifyAppleSubscription('test-token', 'invalid'), error);
});

test('無料体験の開始・スキップは本人の明示的な操作を送る', async () => {
  for (const action of ['start', 'skip']) {
    const api = load(async (path, options) => {
      assert.equal(path, '/api/subscription/trial');
      assert.equal(options.token, 'test-token');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { action });
      return { accessLevel: action === 'start' ? 'trial' : 'free' };
    });
    await api.updateTrialChoice('test-token', action);
  }
});
