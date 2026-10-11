import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('new records start empty and successful creation clears only the draft, not favorites', () => {
  const source = read('../src/app/training.tsx');
  assert.match(source, /if \(!draft\) return \[\]/);
  assert.doesNotMatch(source, /defaultExercises/);
  assert.match(source, /addRecord\(savedRecord\);\s+setExercises\(\[\]\)/);
  assert.match(source, /setDraft\(null\)/);
  assert.match(source, /FavoriteExercises key=\{formVersion\}/);
  const failure = source.slice(source.indexOf('} catch (error)'), source.indexOf('} finally'));
  assert.doesNotMatch(failure, /setExercises|setDraft|setMemo/);
  assert.match(source, /if \(editingRecord\) router.back\(\)/);
  assert.match(source, /exercises.length > 0 \? <View style=\{styles.detailsCard\}/);
});

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

test('category tap adds all its favorites directly and keeps the editor available', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  assert.match(source, /onPress=\{\(\) => selectPart\(item\)\}/);
  assert.match(source, /item.category === category && ids.includes\(item.id\)/);
  assert.match(source, /selectedFavorites.forEach\(item => onAdd\(item\)\)/);
  assert.match(source, /setEditing\(selectedFavorites.length === 0\)/);
  assert.match(source, /selecting && list.map/);
  assert.match(source, /if \(!ready \|\| busy\) return/);
  assert.match(read('../src/app/training.tsx'), /setExercises\(\(current\) => current.some\(item => item.id === exercise.id\) \? current : \[...current, createRecord\(exercise\)\]\)/);
});
