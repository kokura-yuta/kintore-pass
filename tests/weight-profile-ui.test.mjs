import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('保存・削除のサーバー確定体重を共通プロフィールへ反映する', () => {
  const screen = read('../mobile/src/app/weight-history.tsx');
  assert.match(screen, /updateProfileWeight\(savedRecord.profileWeightKg\)/);
  assert.match(screen, /updateProfileWeight\(response.profileWeightKg\)/);
  assert.match(read('../mobile/src/contexts/OnboardingContext.tsx'), /setProfile\(current => \(\{ \.\.\.current, weightKg:/);
});
test('マイページの体重だけを同期し、友達カードに独立した余白を設ける', () => {
  const screen = read('../mobile/src/screens/MyPageScreen.tsx');
  assert.match(screen, /setForm\(current => \(\{ \.\.\.current, weightKg: profile.weightKg \}\)\)/);
  assert.match(screen, /if \(profileWeightSnapshot !== profile.weightKg\)/);
  assert.match(screen, /ShortcutCard fullWidth label="友達"/);
  assert.match(screen, /fullWidthShortcut: \{ flex: 0, marginTop: 13 \}/);
});
