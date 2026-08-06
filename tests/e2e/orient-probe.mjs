import { chromium } from 'playwright';
const EXE = 'C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const b = await chromium.launch({ executablePath: EXE, headless: true, args });
const g = await b.newPage();
await g.setViewportSize({ width: 1024, height: 576 });
await g.goto('https://ashenreach.vercel.app/play.html?capture=1', { waitUntil: 'load' });
await g.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 }).catch(() => {});
await g.evaluate(() => window.__game?.startRun?.());
await g.waitForTimeout(3000);
// Project player world pos to screen; camera upright => player near lower-centre (screenY > 0.5*h).
const r = await g.evaluate(() => {
  const d = window.__game?.debug;
  const pos = d?.pos;
  if (!pos) return null;
  // replicate camera projection minimally via three if exposed
  const cam = window.__game?.testCamera?.();
  void cam;
  return { pos, hasApi: !!window.__game };
});
// Fallback: read canvas pixels, find the brightest ground band vertical position.
const band = await g.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
  const ctx = cv.getContext('2d'); ctx.drawImage(c, 0, 0);
  const w = cv.width, h = cv.height;
  const rows = 12; let topFill = 0, botFill = 0;
  for (let i = 0; i < rows; i++) {
    const y = Math.floor((i + 0.5) / rows * h);
    const d = ctx.getImageData(0, y, w, 1).data;
    let sum = 0; for (let p = 0; p < d.length; p += 4) sum += d[p] + d[p+1] + d[p+2];
    const avg = sum / (d.length / 4);
    if (i < rows/2) topFill += avg; else botFill += avg;
  }
  return { topAvg: +(topFill/(rows/2)).toFixed(1), botAvg: +(botFill/(rows/2)).toFixed(1), w, h };
});
console.log('ORIENT_PROBE', JSON.stringify({ ...r, band }));
await b.close();
