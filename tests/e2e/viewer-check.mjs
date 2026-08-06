import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const EXE = 'C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const dist = join(process.cwd(), 'dist');
const server = createServer(async (req, res) => {
  try {
    let p = (req.url || '/').split('?')[0];
    if (p === '/' || p === '/viewer') p = '/viewer.html';
    const f = normalize(join(dist, p));
    const d = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(d);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(4188, r));
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const pg = await b.newPage();
const errs = [];
pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await pg.goto('http://localhost:4188/viewer', { waitUntil: 'load' });
await pg.waitForTimeout(2500);
const state = await pg.evaluate(() => ({
  hasViewer: !!window.__viewer,
  canvas: !!document.querySelector('canvas'),
  listItems: document.querySelectorAll('.vl-item').length,
  infoName: document.querySelector('.vi-name')?.textContent ?? null,
}));
console.log('VIEWER_STATE', JSON.stringify(state));
console.log('ERRORS', JSON.stringify(errs));
await b.close();
server.close();
