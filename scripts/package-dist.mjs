// Post-build packager: fold the marketing site (web/) into dist/ as the root,
// keep the game at /play.html and the asset viewer at /viewer.html.
import { cpSync, renameSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const web = join(root, 'web');

if (!existsSync(dist)) { console.error('dist/ not found - run vite build first'); process.exit(1); }

// Game entry -> /play.html
if (existsSync(join(dist, 'index.html'))) renameSync(join(dist, 'index.html'), join(dist, 'play.html'));

// Copy marketing site to root (index.html, styles.css, main.js, shots/)
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src)) {
    const s = join(src, e), d = join(dest, e);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}
if (existsSync(web)) copyDir(web, dist);

console.log('Packaged dist/: marketing at /, game at /play.html, viewer at /viewer.html');
