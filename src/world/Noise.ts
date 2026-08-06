import { hash2 } from '../core/RNG';

/** Smoothstep-interpolated value noise. Deterministic from seed. */
export function valueNoise2(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const ab = a + (b - a) * u;
  const cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}

/** Gradient-ish noise in [-1,1] using hashed unit vectors. Cheaper than simplex, good enough. */
export function gradNoise2(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const grad = (ix: number, iy: number, dx: number, dy: number): number => {
    const ang = hash2(ix, iy, seed) * Math.PI * 2;
    return Math.cos(ang) * dx + Math.sin(ang) * dy;
  };

  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

  const n00 = grad(xi, yi, xf, yf);
  const n10 = grad(xi + 1, yi, xf - 1, yf);
  const n01 = grad(xi, yi + 1, xf, yf - 1);
  const n11 = grad(xi + 1, yi + 1, xf - 1, yf - 1);

  const x1 = n00 + (n10 - n00) * u;
  const x2 = n01 + (n11 - n01) * u;
  return x1 + (x2 - x1) * v;
}

export interface FbmOptions {
  octaves?: number;
  lacunarity?: number;
  gain?: number;
  frequency?: number;
  amplitude?: number;
}

/** Fractal brownian motion over gradNoise2. Returns roughly [-1,1]. */
export function fbm(x: number, y: number, seed: number, opts: FbmOptions = {}): number {
  const octaves = opts.octaves ?? 5;
  const lacunarity = opts.lacunarity ?? 2.0;
  const gain = opts.gain ?? 0.5;
  let freq = opts.frequency ?? 1;
  let amp = opts.amplitude ?? 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += gradNoise2(x * freq, y * freq, seed + i * 7919) * amp;
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Ridged multifractal - produces sharp mountain ridges. Returns [0,1]. */
export function ridged(x: number, y: number, seed: number, opts: FbmOptions = {}): number {
  const octaves = opts.octaves ?? 5;
  const lacunarity = opts.lacunarity ?? 2.0;
  const gain = opts.gain ?? 0.5;
  let freq = opts.frequency ?? 1;
  let amp = opts.amplitude ?? 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(gradNoise2(x * freq, y * freq, seed + i * 6151));
    sum += n * n * amp;
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Cellular / Worley F1 distance, normalised approx [0,1]. Used for cracks + scatter. */
export function worley(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 8;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const px = cx + hash2(cx, cy, seed);
      const py = cy + hash2(cx, cy, seed ^ 0x9e3779b9);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) best = d;
    }
  }
  return Math.min(1, Math.sqrt(best));
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));
