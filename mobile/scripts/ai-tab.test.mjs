import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('bottom navigation has four tabs with one AI entry and no home tab', () => {
  const source = read('../src/components/BottomNavigation.tsx');
  const items = source.slice(source.indexOf('const navigationItems'), source.indexOf('] as const'));
  assert.equal((items.match(/href:/g) ?? []).length, 4);
  assert.doesNotMatch(items, /href: '\/home'|label: 'チャット'/);
  assert.match(items, /href: '\/chat', label: 'AI'/);
  assert.match(source, /canNavigateTab\(atTabRoot/);
});

test('AI menu entry is behind unchanged Premium boundary and opens existing builder', () => {
  const chat = read('../src/app/chat.tsx');
  assert.match(chat, /<PremiumScreen title="AI"><ChatContent \/><\/PremiumScreen>/);
  assert.match(chat, /router.push\('\/home\?create=1'\)/);
  const menu = read('../src/app/home.tsx');
  assert.match(menu, /<PremiumScreen title="AI"><HomeContent \/><\/PremiumScreen>/);
  assert.match(menu, /useState\(create === '1'\)/);
  assert.match(menu, /AIチャットへ戻る/);
  assert.match(menu, /generateAiMenu/);
});
