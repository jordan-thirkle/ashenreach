// Generate web/og.png — a 1200x630 social card in the locked palette.
import { writePNG } from '../tools/assetgen/png.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const px = new Uint8Array(W * H * 4);
// palette
const slateDark = [0x22, 0x26, 0x2b];
const peat = [0x4a, 0x3f, 0x35];
const bone = [0xef, 0xe9, 0xdc];
const rust = [0xa6, 0x55, 0x2f];
const palegold = [0xc9, 0xa2, 0x27];

function set(x, y, c) { const o = (y * W + x) * 4; px[o] = c[0]; px[o+1] = c[1]; px[o+2] = c[2]; px[o+3] = 255; }
// background gradient (slateDark -> peat)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const t = y / H;
  const c = [ Math.round(slateDark[0]+(peat[0]-slateDark[0])*t), Math.round(slateDark[1]+(peat[1]-slateDark[1])*t), Math.round(slateDark[2]+(peat[2]-slateDark[2])*t) ];
  set(x, y, c);
}
// ash specks
let seed = 12345; const rnd = () => (seed = (seed*1103515245+12345)&0x7fffffff) / 0x7fffffff;
for (let i = 0; i < 400; i++) { const x = (rnd()*W)|0, y = (rnd()*H)|0; set(x, y, bone); }
// title band (rust rule + bone text block)
for (let y = 250; y < 258; y++) for (let x = 120; x < 1080; x++) set(x, y, rust);
for (let y = 300; y < 340; y++) for (let x = 120; x < 760; x++) set(x, y, bone);
for (let y = 360; y < 396; y++) for (let x = 120; x < 620; x++) set(x, y, palegold);

mkdirSync(join(process.cwd(), 'web'), { recursive: true });
writePNG(join(process.cwd(), 'web', 'og.png'), W, H, px);
console.log('wrote web/og.png (1200x630)');
