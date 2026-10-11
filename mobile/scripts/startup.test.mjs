import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('startup routes share branding without a fixed launch delay', () => {
  assert.match(read('../src/app/index.tsx'), /export \{ default \} from '.\/auth-gate'/);
  assert.match(read('../src/app/auth-gate.tsx'), /return <BrandSplash \/>/);
  const bootstrap = read('../src/app/bootstrap.tsx');
  assert.match(bootstrap, /status === 'loading'[\s\S]*return <BrandSplash>/);
  assert.doesNotMatch(bootstrap, /ユーザー情報を読み込んでいます/);
  assert.match(bootstrap, /await fetchBootstrap\(token\)/);
  assert.match(bootstrap, /onAction=\{retryBootstrap\}/);
  assert.match(bootstrap, /!isSignedIn && !isApiBypassEnabled/);
});

test('native launch omits the duplicate icon while preserving home-screen icon', () => {
  const { expo } = JSON.parse(read('../app.json'));
  const splash = expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
  assert.equal(splash.backgroundColor, '#050A0F');
  assert.equal(splash.image, undefined);
  assert.equal(expo.ios.icon, './assets/images/kintore-pas-icon-v3-1024.png');
  assert.match(read('../src/app/_layout.tsx'), /fade: false, duration: 0/);
  for (const name of ['index', 'auth-gate', 'bootstrap']) {
    assert.ok(read('../src/app/_layout.tsx').includes(`name="${name}" options={{ animation: 'none' }}`));
  }
});
