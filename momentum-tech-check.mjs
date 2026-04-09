import { chromium } from 'file:///C:/Users/steven/.codex/skills/develop-web-game/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const outDir = 'output/momentum-tech-check';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('console', (msg) => {
  fs.appendFileSync(`${outDir}/console.log`, `[${msg.type()}] ${msg.text()}\n`);
});
page.on('pageerror', (err) => {
  fs.appendFileSync(`${outDir}/console.log`, `[pageerror] ${String(err)}\n`);
});

function tapKey(key, durationMs = 30) {
  return page.keyboard.down(key).then(async () => {
    await page.waitForTimeout(durationMs);
    await page.keyboard.up(key);
  });
}

async function readState() {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== 'function') {
      return null;
    }
    return JSON.parse(window.render_game_to_text());
  });
}

async function waitForCondition(predicate, timeoutMs, stepMs = 16) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await readState();
    if (state && predicate(state)) {
      return state;
    }
    await page.waitForTimeout(stepMs);
  }
  throw new Error(`Timed out waiting for condition after ${timeoutMs}ms`);
}

async function runScenario(name, jumpDelayAfterLandingMs) {
  await page.goto('http://127.0.0.1:4180', { waitUntil: 'networkidle' });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(200);

  const startState = await readState();
  await tapKey('Space');
  await page.waitForTimeout(110);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(20);
  await tapKey('Shift');
  await page.waitForTimeout(20);
  await page.keyboard.up('KeyA');

  await waitForCondition((state) => state.player.grounded === false, 1000);
  const landingState = await waitForCondition(
    (state) => state.player.grounded === true && state.playerStatuses.some((status) => status.startsWith('momentum:')),
    2000,
  );

  await page.screenshot({ path: `${outDir}/${name}-landing.png` });
  await page.waitForTimeout(jumpDelayAfterLandingMs);
  const preJumpState = await readState();
  await tapKey('Space');
  await page.waitForTimeout(260);

  const afterJumpState = await readState();
  await page.screenshot({ path: `${outDir}/${name}-after-jump.png` });

  return {
    startState,
    landingState,
    preJumpState,
    afterJumpState,
    jumpDelayAfterLandingMs,
    horizontalTravelFromLanding: Number(Math.abs(afterJumpState.player.x - landingState.player.x).toFixed(3)),
    horizontalTravelFromJump: Number(Math.abs(afterJumpState.player.x - preJumpState.player.x).toFixed(3)),
    moveSpeedAfterJump: afterJumpState.player.moveSpeed,
    verticalSpeedAfterJump: afterJumpState.player.verticalSpeed,
  };
}

const boosted = await runScenario('boosted', 45);
const late = await runScenario('late', 260);

fs.writeFileSync(
  `${outDir}/summary.json`,
  JSON.stringify(
    {
      boosted,
      late,
      boostedVsLateTravelDelta: Number((boosted.horizontalTravelFromJump - late.horizontalTravelFromJump).toFixed(3)),
      boostedVsLateMoveSpeedDelta: Number((boosted.moveSpeedAfterJump - late.moveSpeedAfterJump).toFixed(3)),
    },
    null,
    2,
  ),
);

await browser.close();
