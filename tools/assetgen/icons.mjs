// Procedural 128x128 icon generator. Draws simple geometric glyphs per item/skill id.
import { writePNG } from './png.mjs';

const S = 128;

function newCanvas() {
  return { px: new Uint8Array(S * S * 4), w: S, h: S };
}

function clear(c, hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    c.px[o] = r; c.px[o + 1] = g; c.px[o + 2] = b; c.px[o + 3] = 255;
  }
}

function px(c, x, y, hex) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const [r, g, b] = hex.match(/\w\w/g).map((v) => parseInt(v, 16));
  const o = (y * S + x) * 4;
  c.px[o] = r; c.px[o + 1] = g; c.px[o + 2] = b; c.px[o + 3] = 255;
}

function line(c, x0, y0, x1, y1, hex) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    px(c, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), hex);
  }
}

function rect(c, x, y, w, h, hex) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(c, xx, yy, hex);
}

function circle(c, cx, cy, rad, hex, fill = false) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++) {
      const d = x * x + y * y;
      if (fill ? d <= rad * rad : Math.abs(d - rad * rad) <= rad) px(c, cx + x, cy + y, hex);
    }
}

// Per-id glyph drawing. Defaults to a simple emblem if unknown.
const DRAW = {
  blade: (c) => { rect(c, 60, 20, 8, 80, 'cfd6dd'); line(c, 64, 16, 64, 104, 'e8eef4'); rect(c, 58, 100, 12, 8, '7a5a32'); },
  maul: (c) => { rect(c, 58, 30, 12, 70, '7a5a32'); rect(c, 44, 24, 40, 22, '8a8f96'); circle(c, 64, 35, 8, 'b0b6bd'); },
  spear: (c) => { line(c, 64, 18, 64, 104, '7a5a32'); line(c, 64, 18, 74, 34, 'cfd6dd'); line(c, 64, 18, 54, 34, 'cfd6dd'); },
  censer: (c) => { circle(c, 64, 50, 22, 'd98a3a', true); rect(c, 62, 70, 4, 32, '7a5a32'); circle(c, 64, 50, 12, 'f4b860', true); },
  cloak: (c) => { rect(c, 40, 30, 48, 64, '5a4a8a'); line(c, 40, 30, 64, 22, '6e5ca8'); line(c, 88, 30, 64, 22, '6e5ca8'); },
  charm: (c) => { circle(c, 64, 64, 26, 'd8c36a', true); circle(c, 64, 64, 14, 'f0e0a0', true); },
  relic: (c) => { rect(c, 48, 44, 32, 40, 'c9a23a'); rect(c, 44, 60, 40, 8, 'e8c860'); circle(c, 64, 54, 8, 'f4e0a0'); },
  potion: (c) => { rect(c, 58, 30, 12, 16, '9aa0a6'); circle(c, 64, 76, 26, '7ad0c0', true); rect(c, 54, 66, 20, 20, 'aee0d4'); },
  ember: (c) => { circle(c, 64, 64, 28, 'd9492a', true); circle(c, 64, 64, 16, 'f4a13a', true); circle(c, 64, 64, 6, 'ffe08a', true); },
  soul: (c) => { circle(c, 64, 60, 24, '6ad0e8', true); circle(c, 64, 60, 12, 'bff0f8', true); rect(c, 56, 80, 16, 6, '6ad0e8'); },
  skill_strike: (c) => { line(c, 30, 98, 98, 30, 'e8c860'); line(c, 40, 90, 90, 40, 'f4e0a0'); },
  skill_dash: (c) => { line(c, 24, 64, 104, 64, '6ad0e8'); circle(c, 100, 64, 10, 'bff0f8', true); },
  skill_parry: (c) => { circle(c, 64, 64, 30, 'cfd6dd'); circle(c, 64, 64, 18, '8a8f96', true); circle(c, 64, 64, 8, 'f4e0a0', true); },
  skill_ember: (c) => { circle(c, 64, 64, 28, 'd9492a', true); line(c, 64, 36, 64, 92, 'f4a13a'); line(c, 36, 64, 92, 64, 'f4a13a'); },
  skill_bank: (c) => { rect(c, 44, 48, 40, 40, 'd8c36a'); rect(c, 52, 56, 24, 24, 'f0e0a0'); line(c, 64, 40, 64, 48, 'f4e0a0'); },
  skill_combo: (c) => { line(c, 34, 80, 64, 48, 'e8c860'); line(c, 64, 48, 94, 80, 'f4e0a0'); circle(c, 64, 48, 10, 'fff0c0', true); },
};

export const ICON_IDS = Object.keys(DRAW);

export function generateIcon(id) {
  const c = newCanvas();
  clear(c, '1b1f24');
  rect(c, 8, 8, S - 16, S - 16, '262b31');
  (DRAW[id] || DRAW.relic)(c);
  return c.px;
}

export { writePNG, S as ICON_SIZE };
