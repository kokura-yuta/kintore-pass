import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(
  new URL('../src/lib/account.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function loadAccount(apiRequest) {
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

test('アカウント削除はDELETE確認文字と認証トークンを送る', async () => {
  const account = loadAccount(async (path, options) => {
    assert.equal(path, '/api/users/account');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.token, 'test-token');
    assert.deepEqual(JSON.parse(options.body), {
      confirmation: 'DELETE',
    });
    return {
      message: 'アカウントと保存データを削除しました。',
      neonUserDeleted: true,
    };
  });

  const response = await account.deleteAccount('test-token');
  assert.equal(response.neonUserDeleted, true);
});
