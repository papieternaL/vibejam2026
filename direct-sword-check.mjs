import { chromium } from 'file:///C:/Users/steven/.codex/skills/develop-web-game/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const outDir = 'output/direct-sword-check';
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (msg) => {
  fs.appendFileSync(`${outDir}/console.log`, `[${msg.type()}] ${msg.text()}\n`);
});
await page.goto('http://127.0.0.1:4182', { waitUntil: 'networkidle' });
await page.mouse.click(640, 360);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/idle.png` });

await page.mouse.down({ button: 'left' });
await page.waitForTimeout(60);
await page.screenshot({ path: `${outDir}/lmb-early.png` });
await page.waitForTimeout(80);
await page.screenshot({ path: `${outDir}/lmb-active.png` });
await page.waitForTimeout(100);
await page.screenshot({ path: `${outDir}/lmb-recovery.png` });
await page.mouse.up({ button: 'left' });

await page.waitForTimeout(300);
await page.mouse.down({ button: 'right' });
await page.waitForTimeout(450);
await page.screenshot({ path: `${outDir}/rmb-charge.png` });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(70);
await page.screenshot({ path: `${outDir}/rmb-release.png` });
await page.waitForTimeout(120);
await page.screenshot({ path: `${outDir}/rmb-recovery.png` });

const text = await page.evaluate(() => window.render_game_to_text ? window.render_game_to_text() : 'no text');
fs.writeFileSync(`${outDir}/state.json`, text);
await browser.close();
