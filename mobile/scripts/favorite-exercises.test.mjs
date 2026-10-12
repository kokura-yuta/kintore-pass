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
  assert.match(source, /<FavoritesProvider><TrainingContent \/><\/FavoritesProvider>/);
  const failure = source.slice(source.indexOf('} catch (error)'), source.indexOf('} finally'));
  assert.doesNotMatch(failure, /setExercises|setDraft|setMemo/);
  assert.match(source, /if \(editingRecord\) \{\s+router.setParams\(\{ editId: undefined \}\);\s+router.back\(\)/);
  assert.match(source, /exercises.length > 0 \? <View style=\{styles.detailsCard\}/);
});

test('training shows category favorites and search favorites remain without a paywall', () => {
  const screen = read('../src/screens/TrainingScreen.tsx');
  assert.match(screen, /<FavoriteExercises addedIds=\{exercises.map\(exercise => exercise.id\)\} onAdd=\{addExercise\} disabled=\{isSaving\}/);
  assert.match(screen, /<ExercisePickerModal/);
  assert.match(screen, /<FavoritesProvider><TrainingContent \/><\/FavoritesProvider>/);
  assert.doesNotMatch(read('../src/components/ExercisePickerModal.tsx'), /PremiumGate|usePlanAccess/);
  assert.match(screen, /current.some\(item => item.id === exercise.id\) \? current/);
});

test('body selection only lists registered favorites; explicit addition prevents duplicates', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  const selection = source.slice(source.indexOf('function selectPart'), source.indexOf('const favorites ='));
  assert.match(selection, /setPart\(current => current === category \? null : category\)/);
  assert.doesNotMatch(selection, /onAdd|forEach/);
  assert.match(source, /item.category === part && ids.includes\(item.id\)/);
  assert.match(source, /favorites.map\(exercise/);
  assert.match(source, /const added = addedIds.includes\(exercise.id\)/);
  assert.match(source, /disabled=\{added \|\| disabled\}/);
  assert.match(source, /onPress=\{\(\) => onAdd\(exercise\)\}/);
  assert.match(source, /この部位のお気に入りはまだありません/);
  assert.match(source, /!ready && !error/);
  assert.doesNotMatch(source, /まとめて記録欄に追加/);
});

test('same body part closes; switching parts opens the new one without altering favorites', () => {
  const source = read('../src/components/FavoriteExercises.tsx');
  const expression = source.match(/setPart\((current => current === category \? null : category)\)/)?.[1];
  assert.ok(expression);
  const select = new Function('current', 'category', `return (${expression})(current);`);
  assert.equal(select(null, '胸'), '胸');
  assert.equal(select('胸', '胸'), null);
  assert.equal(select('胸', '背中'), '背中');
  assert.equal(select(null, '胸'), '胸');
  const selection = source.slice(source.indexOf('function selectPart'), source.indexOf('const favorites ='));
  assert.doesNotMatch(selection, /onAdd|toggle|setIds/);
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

test('search registration and record addition remain separate actions', () => {
  const picker = read('../src/components/ExercisePickerModal.tsx');
  assert.match(picker, /toggle\(exercise.id\)/);
  assert.match(picker, /disabled=\{!ready \|\| busy\}/);
  assert.match(picker, /disabled=\{added\} onPress=\{\(\) => onAdd\(exercise\)\}/);
  assert.match(read('../src/screens/TrainingScreen.tsx'), /<FavoritesProvider><TrainingContent \/><\/FavoritesProvider>/);
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
