// Procedural PBR texture-set generator. Writes albedo + normal + roughness PNGs.
import { writePNG } from './png.mjs';
import { makeRNG } from '../../src/core/RNG.js';

const SIZE = 512;

// value-noise helper
function makeNoise(rng, w, h, octaves) {
  const base = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) base[y * w + x] = rng.next();
  const out = new Float32Array(w * h);
  let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const step = 1 << o;
    const freq = 1 / step;
    let s = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * freq) * step;
        const sy = Math.floor(y * freq) * step;
        const tx = (x * freq - Math.floor(x * freq));
        const ty = (y * freq - Math.floor(y * freq));
        const a = base[((sy % h) * w + (sx % w))];
        const b = base[((sy % h) * w + ((sx + step) % w))];
        const c = base[(((sy + step) % h) * w + (sx % w))];
        const d = base[(((sy + step) % h) * w + ((sx + step) % w))];
        const top = a + (b - a) * tx;
        const bot = c + (d - c) * tx;
        out[y * w + x] += (top + (bot - top) * ty) * amp;
        s++;
      }
    tot += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Build one tileable texture set from a spec.
export function generateTextureSet(spec) {
  const rng = makeRNG('tex-' + spec.id);
  const noise = makeNoise(rng, SIZE, SIZE, spec.octaves ?? 4);
  const noise2 = makeNoise(rng, SIZE, SIZE, 2);
  const albedo = new Uint8Array(SIZE * SIZE * 4);
  const normal = new Uint8Array(SIZE * SIZE * 4);
  const rough = new Uint8Array(SIZE * SIZE * 4);
  const base = hexToRgb(spec.base);
  const accent = hexToRgb(spec.accent ?? spec.base);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const n = noise[i];
    const n2 = noise2[i];
    const t = Math.min(1, Math.max(0, (n - spec.lo) / (spec.hi - spec.lo)));
    const r = base[0] + (accent[0] - base[0]) * t;
    const g = base[1] + (accent[1] - base[1]) * t;
    const b = base[2] + (accent[2] - base[2]) * t;
    const o = i * 4;
    albedo[o] = r; albedo[o + 1] = g; albedo[o + 2] = b; albedo[o + 3] = 255;
    // normal: derive from noise gradient (cheap)
    const gx = noise[(i + 1) % (SIZE * SIZE)] - n;
    const gy = noise[(i + SIZE) % (SIZE * SIZE)] - n;
    const len = Math.hypot(gx, gy, 1) || 1;
    normal[o] = (gx / len) * 127 + 128;
    normal[o + 1] = (gy / len) * 127 + 128;
    normal[o + 2] = (1 / len) * 127 + 128;
    normal[o + 3] = 255;
    // roughness varies with second noise
    const rv = Math.max(0, Math.min(255, (spec.rough + (n2 - 0.5) * spec.roughVar) * 255));
    rough[o] = rv; rough[o + 1] = rv; rough[o + 2] = rv; rough[o + 3] = 255;
  }
  return { albedo, normal, rough };
}

export const TEXTURE_SPECS = [
  { id: 'rock_slate', base: '#3c4046', accent: '#5a6068', lo: 0.25, hi: 0.85, rough: 0.85, roughVar: 0.2, octaves: 5 },
  { id: 'soil_peat', base: '#2e271f', accent: '#463a2c', lo: 0.2, hi: 0.9, rough: 0.95, roughVar: 0.1, octaves: 4 },
  { id: 'grass_moss', base: '#39402c', accent: '#5c6b3a', lo: 0.15, hi: 0.8, rough: 0.8, roughVar: 0.25, octaves: 5 },
  { id: 'ash_drift', base: '#4a4641', accent: '#6b645c', lo: 0.3, hi: 0.95, rough: 0.7, roughVar: 0.2, octaves: 3 },
  { id: 'bark_pine', base: '#2a241c', accent: '#43382a', lo: 0.2, hi: 0.85, rough: 0.9, roughVar: 0.15, octaves: 6 },
  { id: 'stone_ruin', base: '#55504a', accent: '#7a736a', lo: 0.3, hi: 0.9, rough: 0.8, roughVar: 0.2, octaves: 5 },
  { id: 'metal_rust', base: '#6b4a32', accent: '#8a6a45', lo: 0.3, hi: 0.95, rough: 0.75, roughVar: 0.3, octaves: 4 },
  { id: 'cloth_worn', base: '#54493d', accent: '#736452', lo: 0.25, hi: 0.85, rough: 0.9, roughVar: 0.1, octaves: 4 },
  { id: 'bone_pale', base: '#c9c2ad', accent: '#e8e2cf', lo: 0.35, hi: 0.95, rough: 0.6, roughVar: 0.2, octaves: 3 },
  { id: 'mire_mud', base: '#26231c', accent: '#3a342a', lo: 0.2, hi: 0.85, rough: 0.98, roughVar: 0.05, octaves: 4 },
];

export { writePNG, SIZE };
