import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const EXE = 'C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const dist = join(process.cwd(), 'dist');
const server = createServer(async (req, res) => {
  try {
    let p = (req.url || '/').split('?')[0];
    if (p === '/') p = '/index.html';
    const f = normalize(join(dist, p));
    const d = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(d);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(4176, r));
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
const pg = await b.newPage();
pg.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
pg.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await pg.goto('http://localhost:4176/', { waitUntil: 'load' });
await pg.waitForTimeout(2500);
const has = await pg.evaluate(() => ({ game: typeof window.__game, startRun: typeof window.__game?.startRun, dbg: window.__game?.debug }));
console.log('STATE', JSON.stringify(has));
const res = await pg.evaluate(() => { try { window.__game.startRun('qa','QA',false); return 'called'; } catch (e) { return 'ERR ' + e.message; } });
await pg.waitForTimeout(800);
const after = await pg.evaluate(() => window.__game?.debug);
console.log('AFTER_START', JSON.stringify(after));
await b.close();
server.close();
