import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = Number(process.env.E2E_PORT)||4173;
const EXE = 'C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const dist = join(process.cwd(), 'dist');
const server = createServer(async (req, res) => {
  const p = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (p === '/favicon.ico') { res.writeHead(204).end(); return; }
  try {
    let fp = p;
    if (fp === '/') fp = '/index.html';
    const file = normalize(join(dist, fp));
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((r) => server.listen(PORT, r));
console.log(`[server] serving dist/ on http://localhost:${PORT}`);

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox',
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const warnings = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  else if (m.type() === 'warning') warnings.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto('http://localhost:' + PORT + '/play.html?capture=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 })
  .catch(() => console.log('[warn] game boot signal not seen'));

const shotsDir = join(process.cwd(), 'tests/e2e/shots');
mkdirSync(shotsDir, { recursive: true });

async function dbg() {
  return page.evaluate(() => window.__game?.debug ?? {});
}

console.log('[boot]', JSON.stringify(await dbg()));

await page.evaluate(() => window.__game?.startRun?.('qa-seed', 'QA', false));
await page.waitForTimeout(800);
await page.screenshot({ path: join(shotsDir, '01-boot.png') });

await page.keyboard.down('KeyW');
for (let i = 0; i < 6; i++) {
  await page.mouse.click(640, 360);
  await page.waitForTimeout(400);
}
await page.keyboard.up('KeyW');
await page.screenshot({ path: join(shotsDir, '02-combat.png') });

const metrics = await dbg();
console.log('[after-play]', JSON.stringify(metrics));

await page.keyboard.press('KeyI');
await page.waitForTimeout(400);
await page.screenshot({ path: join(shotsDir, '03-inventory.png') });
await page.keyboard.press('Escape');
await page.keyboard.press('KeyM');
await page.waitForTimeout(400);
await page.screenshot({ path: join(shotsDir, '04-map.png') });
await page.keyboard.press('Escape');

// Real FPS measurement from the game's own frame counter (rAF is throttled in headless).
await page.waitForTimeout(800);
const f0 = (await dbg()).frame ?? 0;
const t0 = Date.now();
await page.waitForTimeout(2000);
const f1 = (await dbg()).frame ?? 0;
const fpsReal = Math.max(0, Math.round(((f1 - f0) * 1000) / (Date.now() - t0)));
metrics.fps = fpsReal;

const lum = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const off = document.createElement('canvas');
  off.width = 64; off.height = 36;
  const ctx = off.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(c, 0, 0, 64, 36);
  const d = ctx.getImageData(0, 0, 64, 36).data;
  let sum = 0; const colors = new Set();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    colors.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
  }
  return { meanLuminance: sum / (d.length / 4), uniqueColors: colors.size };
});

await browser.close();
server.close();

const report = {
  timestamp: new Date().toISOString(),
  shots: ['01-boot.png', '02-combat.png', '03-inventory.png', '04-map.png'],
  render: lum,
  metrics,
  consoleErrors: errors,
  consoleWarnings: warnings.slice(0, 20),
};
console.log('REPORT_JSON=' + JSON.stringify(report, null, 2));
writeFileSync(join(shotsDir, '../metrics.json'), JSON.stringify(report, null, 2));
console.log('[done]');
