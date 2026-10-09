import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/passwordSignIn.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { loginWithPassword } = exports;

function resource(status = 'complete', error = null) {
  const calls = [];
  return { calls, status,
    password: async () => { calls.push('password'); return { error }; },
    finalize: async () => { calls.push('finalize'); return { error: null }; },
    mfa: { sendEmailCode: async () => { calls.push('device-code'); return { error: null }; } },
  };
}

test('認証完了の場合だけセッションを確定', async () => {
  const client = resource();
  assert.equal(await loginWithPassword(client, 'review@example.com', 'test-only'), 'complete');
  assert.deepEqual(client.calls, ['password', 'finalize']);
});
test('不正・空入力はClerkを呼ばない', async () => {
  for (const [email, password] of [['invalid', 'test-only'], ['review@example.com', '']]) {
    const client = resource();
    await assert.rejects(loginWithPassword(client, email, password));
    assert.deepEqual(client.calls, []);
  }
});
test('認証エラーはセッションを作らない', async () => {
  const client = resource('needs_first_factor', new Error('invalid credentials'));
  await assert.rejects(loginWithPassword(client, 'review@example.com', 'test-only'));
  assert.deepEqual(client.calls, ['password']);
});
test('新端末はメール確認に進み、まだ確定しない', async () => {
  const client = resource('needs_client_trust');
  assert.equal(await loginWithPassword(client, 'review@example.com', 'test-only'), 'verify-device');
  assert.deepEqual(client.calls, ['password', 'device-code']);
});
test('MFA・期限切れ等の未完了状態を迂回しない', async () => {
  for (const status of ['needs_second_factor', 'needs_new_password', 'needs_protect_check', null]) {
    const client = resource(status);
    await assert.rejects(loginWithPassword(client, 'review@example.com', 'test-only'));
    assert.deepEqual(client.calls, ['password']);
  }
});
test('追加コード送信失敗・確定失敗は成功として返さない', async () => {
  const client = resource('needs_client_trust');
  client.mfa.sendEmailCode = async () => ({ error: new Error('offline') });
  await assert.rejects(loginWithPassword(client, 'review@example.com', 'test-only'));
  const complete = resource();
  complete.finalize = async () => ({ error: new Error('finalize failed') });
  await assert.rejects(loginWithPassword(complete, 'review@example.com', 'test-only'));
});
