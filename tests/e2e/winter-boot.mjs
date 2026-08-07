// One-off: confirm the winter biome path boots and renders (Tier 4-A wiring).
import { chromium } from 'playwright';

const PORT = 4173;
const EXE = 'C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:' + PORT + '/play.html?capture=1', { waitUntil: 'load' });
await page.waitForTimeout(1500);
// Start a WINTER run via the test API.
const started = await page.evaluate(() => {
  const g = window.__game;
  if (!g) return 'no-game';
  g.startRun('winter-qa', 'QA', false, 'winter');
  return 'ok';
});
await page.waitForTimeout(2500);

const probe = await page.evaluate(() => {
  const g = window.__game;
  const d = g && g.debug ? g.debug : {};
  return {
    mode: d.mode,
    frame: d.frame,
    variant: d.variant ?? d.biome ?? 'unknown',
    enemies: d.enemies,
  };
});

// Read a vertical luminance split to confirm a non-black, upright render.
const band = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const off = document.createElement('canvas');
  off.width = c.width; off.height = c.height;
  const ctx = off.getContext('2d');
  ctx.drawImage(c, 0, 0);
  const h = off.height, w = off.width;
  const top = ctx.getImageData(0, 0, w, Math.floor(h / 2)).data;
  const bot = ctx.getImageData(0, Math.floor(h / 2), w, Math.floor(h / 2)).data;
  const avg = (a) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += (a[i] + a[i+1] + a[i+2]) / 3; return s / (a.length / 4); };
  return { topAvg: avg(top), botAvg: avg(bot) };
});

await browser.close();
console.log(JSON.stringify({ started, probe, band, errors }, null, 2));
const ok = started === 'ok' && probe.mode === 'playing' && probe.frame > 0 && errors.length === 0 && band && band.topAvg > 5 && band.botAvg > 5;
console.log(ok ? 'WINTER_BOOT=PASS' : 'WINTER_BOOT=FAIL');
