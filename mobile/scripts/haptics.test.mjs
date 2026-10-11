import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, mocks, extras = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  }, ...extras });
  return exports;
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('native feedback is short, rate limited, and web is silent', async () => {
  let now = 1000;
  const calls = [];
  const platform = { OS: 'ios' };
  const h = load('../src/lib/haptics.ts', {
    'react-native': { Platform: platform },
    'expo-haptics': {
      ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 'success' },
      impactAsync: value => calls.push(value), selectionAsync: () => calls.push('selection'),
      notificationAsync: value => calls.push(value),
    },
  }, { Date: { now: () => now } });
  h.feedback(); h.feedback(); await flush();
  assert.deepEqual(calls, ['light']);
  now += 150; h.feedback('selection'); await flush();
  now += 150; h.feedback('success'); await flush();
  assert.deepEqual(calls, ['light', 'selection', 'success']);
  platform.OS = 'web'; now += 150; h.feedback(); await flush();
  assert.equal(calls.length, 3);
});
test('missing native module cannot throw into the operation', async () => {
  const h = load('../src/lib/haptics.ts', { 'react-native': { Platform: { OS: 'ios' } } });
  assert.doesNotThrow(() => h.feedback());
  await flush();
});
test('press wrapper preserves handler and props; no touch-down or disabled feedback', () => {
  const calls = [];
  const { Pressable } = load('../src/components/FeedbackPressable.tsx', {
    react: { forwardRef: fn => fn },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-native': { Pressable: 'NativePressable' },
    '@/lib/haptics': { feedback: kind => calls.push(kind) },
  });
  let presses = 0;
  const event = {};
  const props = { onPress: e => { assert.equal(e, event); presses++; }, style: { opacity: 0.8 } };
  const rendered = Pressable(props, null);
  assert.equal(rendered.props.style, props.style);
  assert.equal(rendered.props.onPressIn, undefined);
  rendered.props.onPress(event);
  assert.equal(presses, 1); assert.deepEqual(calls, ['tap']);
  for (const options of [{ disabled: true }, { accessibilityState: { busy: true } }, { haptic: false },
    { accessibilityRole: 'tab', accessibilityState: { selected: true } }]) {
    Pressable({ ...props, ...options }, null).props.onPress(event);
  }
  assert.deepEqual(calls, ['tap']);
  Pressable({ ...props, accessibilityRole: 'radio' }, null).props.onPress(event);
  assert.deepEqual(calls, ['tap', 'selection']);
});
test('all app-owned pressables use the shared feedback wrapper', () => {
  const root = new URL('../src/', import.meta.url);
  for (const file of readdirSync(root, { recursive: true })) {
    if (!file.endsWith('.tsx') || file.endsWith('FeedbackPressable.tsx')) continue;
    const source = readFileSync(new URL(file.replaceAll('\\', '/'), root), 'utf8');
    if (source.includes('<Pressable')) assert.match(source, /from '@\/components\/FeedbackPressable'/, file);
  }
});
