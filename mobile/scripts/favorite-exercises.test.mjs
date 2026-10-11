import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('all six favorite categories are available before training records without a paywall', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  assert.match(source, /\['胸', '背中', '腕', '肩', '脚', '腹筋'\]/);
  assert.doesNotMatch(source, /PremiumGate|usePlanAccess/);
  assert.match(source, /editing \|\| favorites.length === 0/);
  const screen = read('../src/app/training.tsx');
  assert.ok(screen.indexOf('<FavoriteExercises') < screen.indexOf('>実施した種目</Text>'));
  assert.match(screen, /current.some\(item => item.id === exercise.id\) \? current/);
});

test('favorite persistence is account-scoped and blocks mutation until loaded', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  assert.match(source, /key=\{userId \?\? 'guest'\}/);
  assert.match(source, /favorite-exercises-v1-\$\{userId\}/);
  assert.match(source, /if \(!ready \|\| lock.current\) return/);
  assert.match(source, /SecureStore.setItemAsync/);
  assert.match(source, /localStorage.setItem/);
  assert.match(source, /if \(active\) setIds/);
  assert.match(source, /保存できませんでした/);
});

test('all stack routes disable transitions and interactive swipe animations', () => {
  assert.match(read('../src/app/_layout.tsx'), /screenOptions=\{\{ headerShown: false, animation: 'none', gestureEnabled: false/);
});
