import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/components/FoodCalendar.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function calendar(selectedDate) {
  let month = selectedDate.slice(0, 7);
  let selected;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: id => {
    if (id === 'react') return { useState: () => [month, value => { month = value; }], useEffect: () => {} };
    if (id === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } };
    if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    throw new Error(id);
  } });
  function render() {
    const nodes = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      walk(node.props.children);
    }
    walk(exports.FoodCalendar({ selectedDate, onSelect: value => { selected = value; } }));
    return nodes.filter(node => node.type === 'Pressable');
  }
  return { render, selection: () => selected };
}
test('うるう年の日付と選択された食事の日付を正しく渡す', () => {
  const c = calendar('2024-02-10');
  const buttons = c.render();
  assert.equal(buttons.length, 31);
  buttons.find(node => node.props.accessibilityLabel === '2024-02-29の食事を見る').props.onPress();
  assert.equal(c.selection(), '2024-02-29');
  assert.equal(calendar('2025-02-01').render().length, 30);
});
test('月送りは年境界を越えて正しい日付を表示する', () => {
  const c = calendar('2026-12-31');
  c.render().find(node => node.props.accessibilityLabel === '次の月').props.onPress();
  assert.ok(c.render().some(node => node.props.accessibilityLabel === '2027-01-01の食事を見る'));
});
