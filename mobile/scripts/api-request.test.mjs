import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

// ネットワーク・実トークンを使わず、実装本体を疑似fetchで検証する。
function loadApi(fetch) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, fetch, AbortController, setTimeout, clearTimeout,
    __DEV__: false,
    process: { env: { EXPO_PUBLIC_API_BASE_URL: 'https://test.invalid' } },
  });
  return exports;
}

test('成功応答とBearer、独自オプションをfetchへ渡さない', async () => {
  const api = loadApi(async (url, init) => {
    assert.equal(url, 'https://test.invalid/api/home');
    assert.equal(init.headers.Authorization, 'Bearer test-token');
    assert.equal(init.token, undefined);
    assert.equal(init.timeoutMs, undefined);
    return { ok: true, json: async () => ({ ok: true }) };
  });
  const result = await api.apiRequest('/api/home', { token: 'test-token', timeoutMs: 50 });
  assert.equal(result.ok, true);
});

test('応答なしでも期限で終了しabortする（自動再送なし）', async () => {
  let signal;
  let calls = 0;
  const api = loadApi((url, init) => { calls++; signal = init.signal; return new Promise(() => {}); });
  await assert.rejects(api.apiRequest('/api/home', { token: 'test', timeoutMs: 10 }), /時間内/);
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
});

test('本文読込の停止もタイムアウトし、保存結果を断定しない', async () => {
  const api = loadApi(async () => ({ ok: true, json: () => new Promise(() => {}) }));
  await assert.rejects(api.apiRequest('/api/training-records', {
    token: 'test', method: 'POST', timeoutMs: 10,
  }), /完了している可能性/);
});

test('画像送信にも期限を適用しContent-Typeを自動指定しない', async () => {
  const body = new FormData();
  const api = loadApi((url, init) => {
    assert.equal(init.body, body);
    assert.equal(init.headers['Content-Type'], undefined);
    return new Promise(() => {});
  });
  await assert.rejects(api.apiUploadRequest('/api/analysis', 'test', body, 10), /履歴や最新情報/);
});

test('HTTP 401を維持する', async () => {
  const api = loadApi(async () => ({ ok: false, status: 401, json: async () => ({ message: 'expired' }) }));
  await assert.rejects(api.apiRequest('/api/home', { token: 'test' }), e => e.status === 401 && e.message === 'expired');
});

test('オフライン相当の通信失敗は接続確認メッセージ', async () => {
  const api = loadApi(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(api.apiRequest('/api/home', { token: 'test' }), /インターネット接続/);
});

test('送信前の取消はfetchしない', async () => {
  let calls = 0;
  const api = loadApi(async () => { calls++; });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.apiRequest('/api/home', { token: 'test', signal: controller.signal }), /中止/);
  assert.equal(calls, 0);
});

test('送信途中の取消を尊重する', async () => {
  const controller = new AbortController();
  let signal;
  const api = loadApi((url, init) => { signal = init.signal; return new Promise(() => {}); });
  const request = api.apiRequest('/api/home', { token: 'test', signal: controller.signal });
  controller.abort();
  await assert.rejects(request, /中止/);
  assert.equal(signal.aborted, true);
});
