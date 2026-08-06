import { chromium } from 'playwright';

const EXE = 'C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];

const b = await chromium.launch({ executablePath: EXE, headless: true, args });

// 1) Live game: confirm it boots and the camera sits ABOVE the player (upright).
const g = await b.newPage();
const gerr = [];
g.on('pageerror', (e) => gerr.push(e.message));
await g.goto('https://ashenreach.vercel.app/play.html?capture=1', { waitUntil: 'load' });
await g.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 }).catch(() => {});
await g.evaluate(() => window.__game?.startRun?.());
await g.waitForTimeout(2500);
const cam = await g.evaluate(() => {
  const d = window.__game?.debug;
  if (!d) return null;
  // Camera-upright proxy: player pos Y vs world; game must be in 'playing' mode
  // and have advanced frames (not crashed mid-buildWorld).
  return { mode: d.mode, frame: d.frame, enemies: d.enemies, pos: d.pos, hp: d.hp };
});
console.log('LIVE_GAME', JSON.stringify(cam), 'errors=', gerr.length);

// 2) Live viewer: click the CesiumMan free rig, confirm a GLTF mesh renders.
const v = await b.newPage();
const verr = [];
v.on('pageerror', (e) => verr.push(e.message));
await v.goto('https://ashenreach.vercel.app/viewer.html', { waitUntil: 'load' });
await v.waitForTimeout(2000);
const clicked = await v.evaluate(() => {
  const btns = [...document.querySelectorAll('.vl-item')];
  const b = btns.find((x) => x.textContent.includes('CesiumMan'));
  if (b) { b.click(); return true; }
  return false;
});
await v.waitForTimeout(2500);
const vstate = await v.evaluate(() => ({
  hasCanvas: !!document.querySelector('canvas'),
  infoName: document.querySelector('.vi-name')?.textContent ?? null,
  stats: document.querySelector('.vi-stats')?.textContent ?? null,
}));
console.log('LIVE_VIEWER_CLICKED', clicked, JSON.stringify(vstate), 'errors=', verr.length);

await b.close();
