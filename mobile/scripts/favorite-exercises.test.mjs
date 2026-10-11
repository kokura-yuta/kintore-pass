import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('new records start empty and successful creation clears only the draft, not favorites', () => {
  const source = read('../src/screens/TrainingScreen.tsx');
  assert.match(source, /if \(!draft\) return \[\]/);
  assert.doesNotMatch(source, /defaultExercises/);
  assert.match(source, /addRecord\(savedRecord\);\s+setExercises\(\[\]\)/);
  assert.match(source, /setDraft\(null\)/);
  assert.match(source, /FavoriteExercises key=\{formVersion\}/);
  const failure = source.slice(source.indexOf('} catch (error)'), source.indexOf('} finally'));
  assert.doesNotMatch(failure, /setExercises|setDraft|setMemo/);
  assert.match(source, /if \(editingRecord\) \{\s+router.setParams\(\{ editId: undefined \}\);\s+router.back\(\)/);
  assert.match(source, /exercises.length > 0 \? <View style=\{styles.detailsCard\}/);
});

test('all six favorite categories are available before training records without a paywall', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  assert.match(source, /\['胸', '背中', '腕', '肩', '脚', '腹筋'\]/);
  assert.doesNotMatch(source, /PremiumGate|usePlanAccess/);
  assert.match(source, /種目を検索して、お気に入りを登録してください/);
  assert.doesNotMatch(source, /setEditing|selecting && list.map/);
  const screen = read('../src/screens/TrainingScreen.tsx');
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

test('category tap adds favorites directly and registration is only in search', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  assert.match(source, /onPress=\{\(\) => selectPart\(item\)\}/);
  assert.match(source, /item.category === category && ids.includes\(item.id\)/);
  assert.match(source, /selectedFavorites.forEach\(item => onAdd\(item\)\)/);
  const picker = read('../src/components/ExercisePickerModal.tsx');
  assert.match(picker, /toggle\(exercise.id\)/);
  assert.match(picker, /disabled=\{!ready \|\| busy\}/);
  assert.match(picker, /disabled=\{added\} onPress=\{\(\) => onAdd\(exercise\)\}/);
  assert.match(read('../src/screens/TrainingScreen.tsx'), /<FavoritesProvider><TrainingContent \/><\/FavoritesProvider>/);
  assert.match(source, /if \(!ready \|\| busy\) return/);
  assert.match(read('../src/screens/TrainingScreen.tsx'), /setExercises\(\(current\) => current.some\(item => item.id === exercise.id\) \? current : \[...current, createRecord\(exercise\)\]\)/);
});

test('AI condition uses five touch targets but preserves the ten point API contract', () => {
  const source = read('../src/app/home.tsx');
  assert.match(source, /\[1, 2, 3, 4, 5\].map/);
  assert.match(source, /setBuilderCondition\(score \* 2\)/);
  assert.match(source, /Math.ceil\(builderCondition \/ 2\)/);
  assert.match(source, /minHeight: 48/);
  assert.doesNotMatch(source, /調子を1〜10/);
});
