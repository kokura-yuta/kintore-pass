// Run against a development server with EXPO_PUBLIC_SCREENSHOT_MODE=true.
// This captures actual rendered UI without injecting or altering its contents.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
  const output = path.resolve(__dirname, '../../app-store-screenshots/retake-2026-10-01');
  await fs.mkdir(output, { recursive: true });
  const screens = [
    ['01-home', 'home', '今日のAIメニュー'],
    ['02-training', 'training', 'トレーニング記録'],
    ['03-calendar', 'calendar', 'カレンダー'],
    ['04-food', 'food', '1,170'],
    ['05-body-analysis', 'body-analysis', '今月あと4回利用できます。'],
    ['06-chat', 'chat', '伸ばすためのポイント'],
    ['07-my-page', 'my-page', '身体データ'],
  ];
  try {
    for (const [name, route, ready] of screens) {
      await page.goto(`http://localhost:8083/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.getByText(ready, { exact: false }).first().waitFor({ timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);
      if (route === 'home') await page.getByText('トレーニングを開始', { exact: true }).scrollIntoViewIfNeeded();
      if (route === 'training') {
        for (const button of await page.getByText('前回をコピー', { exact: true }).all()) await button.click();
        await page.getByText('トレーニング記録', { exact: true }).scrollIntoViewIfNeeded();
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(output, `${name}.png`) });
      console.log(name, 'saved', await page.evaluate(() => ({ width: innerWidth, contentWidth: document.documentElement.scrollWidth })));
      if (route === 'food') {
        await page.getByText('プロテイン', { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, '08-food-history.png') });
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
