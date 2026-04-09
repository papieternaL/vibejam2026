import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4177', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
const canvas = await page.locator('canvas').first();
await canvas.click({ position: { x: 640, y: 360 } });
await page.waitForTimeout(100);
await page.evaluate(() => {
  window.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
});
for (let i = 0; i < 10; i++) {
  await page.evaluate(async () => {
    if (typeof window.advanceTime === 'function') await window.advanceTime(1000 / 60);
  });
}
const state = await page.evaluate(() => window.render_game_to_text());
fs.mkdirSync('output/direct-sword-manual-check', { recursive: true });
fs.writeFileSync('output/direct-sword-manual-check/state.json', state);
await page.screenshot({ path: 'output/direct-sword-manual-check/shot.png' });
await page.evaluate(() => {
  window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
});
await browser.close();
