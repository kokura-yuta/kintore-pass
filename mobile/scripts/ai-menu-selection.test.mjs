import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const home = readFileSync(new URL('../src/app/home.tsx', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/lib/aiMenus.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test('部位別設定でもおまかせ(null)は生成前チェックを通る。調子と連打防止は維持', () => {
  const validation = home.split('async function generateMenuOnHome() {')[1].split('const requestId = Crypto.randomUUID();')[0];
  let error = '';
  const context = {
    menuRequestRef: { current: null }, isGenerating: false,
    builderCondition: 5, builderBodyPart: null,
    profile: { trainingStyle: 'split' },
    setBuilderError: value => { error = value; },
  };
  const validate = () => vm.runInNewContext(`(() => { ${validation}; return true; })()`, context);
  assert.equal(validate(), true);
  assert.equal(error, '');
  context.builderCondition = null;
  assert.equal(validate(), undefined);
  assert.match(error, /調子/);
  context.builderCondition = 5;
  context.menuRequestRef.current = 'in-flight';
  assert.equal(validate(), undefined);
});

test('おまかせと個別部位はそれぞれ1回だけ認証付き生成APIへ送る', async () => {
  for (const bodyPart of [null, '胸', '背中', '肩', '腕', '脚', '腹筋']) {
    let calls = 0;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports,
      require: id => {
        if (id === '@/lib/exerciseCatalog') return { exerciseCatalog: [] };
        if (id === '@/lib/api') return { apiRequest: async (path, options) => {
          calls++;
          assert.equal(path, '/api/ai-menu');
          assert.equal(options.method, 'POST');
          assert.equal(options.token, 'test-token');
          assert.deepEqual(JSON.parse(options.body), {
            conditionScore: 5, note: null, requestedBodyPart: bodyPart, requestId: 'request-id',
          });
          return { menu: { id: 'menu-id' } };
        } };
        throw new Error(`Unexpected import: ${id}`);
      },
    });
    await exports.generateAiMenu('test-token', 5, bodyPart, 'request-id');
    assert.equal(calls, 1);
  }
});
