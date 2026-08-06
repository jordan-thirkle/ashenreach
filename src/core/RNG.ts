export interface RNG {
  next(): number;
  int(min: number, max: number): number;
  range(min: number, max: number): number;
  pick<T>(a: readonly T[]): T;
  bool(p?: number): boolean;
  gauss(mean?: number, sd?: number): number;
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  shuffle<T>(arr: T[]): T[];
  fork(salt: string): RNG;
  readonly seed: number;
}

/** Mulberry32 — fast, seedable, deterministic. */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

class Rng implements RNG {
  private readonly seedNum: number;
  private readonly gen: () => number;

  constructor(seed: number | string) {
    this.seedNum = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    this.gen = mulberry32(this.seedNum);
  }

  next(): number {
    return this.gen();
  }

  int(min: number, max: number): number {
    return Math.floor(this.gen() * (max - min + 1)) + min;
  }

  range(min: number, max: number): number {
    return this.gen() * (max - min) + min;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('RNG.pick on empty array');
    return arr[Math.floor(this.gen() * arr.length)] as T;
  }

  bool(p = 0.5): boolean {
    return this.gen() < p;
  }

  /** Gaussian via Box-Muller, clamped to +/-3 sigma. */
  gauss(mean = 0, sd = 1): number {
    const u = Math.max(1e-9, this.gen());
    const v = this.gen();
    const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + sd * Math.max(-3, Math.min(3, n));
  }

  /** Weighted pick. weights must align with items and be non-negative. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.gen() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i] ?? 0;
      if (r <= 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.gen() * (i + 1));
      const a = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = a;
    }
    return arr;
  }

  fork(salt: string): RNG {
    return new Rng((this.seedNum ^ hashString(salt)) >>> 0);
  }

  get seed(): number {
    return this.seedNum;
  }
}

export function makeRNG(seed: number | string): RNG {
  return new Rng(seed);
}

/** Deterministic 2D value hash in [0,1). Used by worldgen without state. */
export function hash2(x: number, y: number, seed: number): number {
  let h = (seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Today's daily-challenge seed, stable per UTC day. */
export function dailySeed(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `ashenreach-daily-${y}${m}${day}`;
}
