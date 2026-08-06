import type { BiomeId, Vec3 } from '../core/Types';
import { fbm, ridged, worley, clamp, smoothstep } from './Noise';
import { hashString } from '../core/RNG';
import { PALETTE_WINTER, paletteFor, type BiomeVariant, type Palette } from '../core/Palette';

export type { BiomeVariant };

export const WORLD_SIZE = 1400;
export const WORLD_HALF = WORLD_SIZE / 2;
export const SEA_LEVEL = 1.2;

export interface TerrainSampler {
  height(x: number, z: number): number;
  normal(x: number, z: number): Vec3;
  biome(x: number, z: number): BiomeId;
  walkable(x: number, z: number): boolean;
  slope(x: number, z: number): number;
}

export interface BiomeProfile {
  id: BiomeId;
  name: string;
  ground: number;
  groundAlt: number;
  fogTint: number;
  treeDensity: number;
  rockDensity: number;
  grassDensity: number;
  enemyTier: number;
  lore: string;
}

export const BIOMES: Record<BiomeId, BiomeProfile> = {
  ashflats: {
    id: 'ashflats', name: 'The Ashflats',
    ground: 0xb5ad9e, groundAlt: 0x8f887b, fogTint: 0xcfc7b8,
    treeDensity: 0.05, rockDensity: 0.3, grassDensity: 0.1, enemyTier: 1,
    lore: 'Where the sky burned first. Ash sits knee-deep and remembers footsteps.',
  },
  moorland: {
    id: 'moorland', name: 'Wetmoor',
    ground: 0x6e7a54, groundAlt: 0x4c5439, fogTint: 0xb9bfa8,
    treeDensity: 0.18, rockDensity: 0.35, grassDensity: 1.0, enemyTier: 1,
    lore: 'Heather and bog cotton. The moor hides its cairns well.',
  },
  pinewood: {
    id: 'pinewood', name: 'The Blackpine',
    ground: 0x4a3f35, groundAlt: 0x2e2820, fogTint: 0x9aa38c,
    treeDensity: 1.0, rockDensity: 0.25, grassDensity: 0.45, enemyTier: 2,
    lore: 'Pines that grew through the burning. Their needles are grey now.',
  },
  crags: {
    id: 'crags', name: 'The Grey Crags',
    ground: 0x3b4149, groundAlt: 0x22262b, fogTint: 0xa7adb5,
    treeDensity: 0.04, rockDensity: 1.0, grassDensity: 0.08, enemyTier: 3,
    lore: 'Bare slate stacked by no hand. Wardens fell here in numbers.',
  },
  mire: {
    id: 'mire', name: 'The Rotmire',
    ground: 0x3f4a3c, groundAlt: 0x2b3329, fogTint: 0x7f8c72,
    treeDensity: 0.3, rockDensity: 0.15, grassDensity: 0.7, enemyTier: 3,
    lore: 'Standing water that never froze and never cleared.',
  },
  scorch: {
    id: 'scorch', name: 'The Scorch',
    ground: 0x6e2a28, groundAlt: 0x3d1a19, fogTint: 0xb08070,
    treeDensity: 0.02, rockDensity: 0.6, grassDensity: 0.0, enemyTier: 4,
    lore: 'The wound at the centre. Nothing here has finished dying.',
  },
};

/**
 * Winter variant profiles: the same six regions read as a frozen highland.
 * Ground tones are pulled from PALETTE_WINTER (frozen slate / pale peat / ice-grey);
 * fog tints go colder and lighter. Scatter densities drop slightly - snow buries
 * the low cover - which also makes winter cheaper to render.
 */
export const BIOMES_WINTER: Record<BiomeId, BiomeProfile> = {
  ashflats: {
    id: 'ashflats', name: 'The Frostflats',
    ground: PALETTE_WINTER.ash, groundAlt: 0xb9bec2, fogTint: 0xdfe3e5,
    treeDensity: 0.04, rockDensity: 0.3, grassDensity: 0.04, enemyTier: 1,
    lore: 'Ash under rime. The drifts keep every footstep for a season.',
  },
  moorland: {
    id: 'moorland', name: 'Whitemoor',
    ground: PALETTE_WINTER.moss, groundAlt: PALETTE_WINTER.mossDark, fogTint: 0xc7d0cd,
    treeDensity: 0.14, rockDensity: 0.35, grassDensity: 0.5, enemyTier: 1,
    lore: 'Heather stiff with frost. The cairns wear white caps now.',
  },
  pinewood: {
    id: 'pinewood', name: 'The Hoarpine',
    ground: PALETTE_WINTER.peat, groundAlt: PALETTE_WINTER.peatDark, fogTint: 0xb4bdbd,
    treeDensity: 0.9, rockDensity: 0.25, grassDensity: 0.2, enemyTier: 2,
    lore: 'Needles glazed grey-white. Nothing drips; nothing thaws.',
  },
  crags: {
    id: 'crags', name: 'The Rimecrags',
    ground: PALETTE_WINTER.slate, groundAlt: PALETTE_WINTER.slateDark, fogTint: 0xc2cacf,
    treeDensity: 0.03, rockDensity: 1.0, grassDensity: 0.03, enemyTier: 3,
    lore: 'Slate split by frost year on year. It sheds itself in sheets.',
  },
  mire: {
    id: 'mire', name: 'The Stillmire',
    ground: PALETTE_WINTER.mire, groundAlt: 0x30393e, fogTint: 0x9fb0b3,
    treeDensity: 0.24, rockDensity: 0.15, grassDensity: 0.35, enemyTier: 3,
    lore: 'Black water under a lid of ice, and something under that.',
  },
  scorch: {
    id: 'scorch', name: 'The Scorch',
    ground: PALETTE_WINTER.oxblood, groundAlt: 0x3d1a19, fogTint: 0xa89094,
    treeDensity: 0.02, rockDensity: 0.6, grassDensity: 0.0, enemyTier: 4,
    lore: 'The one place the snow will not settle.',
  },
};

/** Profile table for a biome variant. Highland is the original, unchanged set. */
export function biomeTable(variant: BiomeVariant = 'highland'): Record<BiomeId, BiomeProfile> {
  return variant === 'winter' ? BIOMES_WINTER : BIOMES;
}

export class Terrain implements TerrainSampler {
  readonly seed: number;
  /** World-wide biome variant this terrain was generated for. */
  readonly variant: BiomeVariant;
  private cache = new Map<number, number>();

  constructor(seedStr: string, variant: BiomeVariant = 'highland') {
    this.seed = hashString(seedStr);
    this.variant = variant;
  }

  /** Colour/scatter profile for a region, resolved through the active variant. */
  profile(biome: BiomeId): BiomeProfile {
    return biomeTable(this.variant)[biome];
  }

  /** Colour set for the active variant - used by the renderer for tint + fog. */
  get palette(): Palette {
    return paletteFor(this.variant);
  }

  /** Distance-from-centre falloff so the world is an island basin, not an infinite plane. */
  private falloff(x: number, z: number): number {
    const d = Math.sqrt(x * x + z * z) / WORLD_HALF;
    return 1 - smoothstep(0.72, 1.0, d);
  }

  height(x: number, z: number): number {
    const key = ((x * 4) | 0) * 100000 + ((z * 4) | 0);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;

    const nx = x / 320;
    const nz = z / 320;

    const continent = fbm(nx, nz, this.seed, { octaves: 4, frequency: 1 }) * 0.5 + 0.5;
    const mountains = ridged(nx * 1.7, nz * 1.7, this.seed + 101, { octaves: 5 });
    const detail = fbm(nx * 7, nz * 7, this.seed + 202, { octaves: 3 }) * 0.5;

    // Central scorch crater: a real depression at the world's heart.
    const dc = Math.sqrt(x * x + z * z);
    const crater = -18 * Math.exp(-(dc * dc) / (2 * 95 * 95));
    const craterRim = 12 * Math.exp(-((dc - 150) * (dc - 150)) / (2 * 48 * 48));

    let h = continent * 26 + mountains * mountains * 46 + detail * 3.4;
    h += crater + craterRim;
    h *= this.falloff(x, z);
    h -= 3.5;

    // Winter: snowpack fills the fine relief. Flatten toward the local mean and
    // damp the high-frequency detail so slopes read smoother and colder.
    if (this.variant === 'winter') {
      const mean = continent * 22 - 3.5;
      h = h * 0.86 + mean * 0.14 - detail * 1.5 + 0.5;
    }

    // Carve river valleys with worley ridges.
    const w = worley(x / 210, z / 210, this.seed + 303);
    const river = smoothstep(0.0, 0.11, w);
    h = h * (0.45 + 0.55 * river) - (1 - river) * 2.2;

    if (this.cache.size > 200000) this.cache.clear();
    this.cache.set(key, h);
    return h;
  }

  normal(x: number, z: number): Vec3 {
    const e = 0.9;
    const hL = this.height(x - e, z);
    const hR = this.height(x + e, z);
    const hD = this.height(x, z - e);
    const hU = this.height(x, z + e);
    const nx = hL - hR;
    const nz = hD - hU;
    const ny = 2 * e;
    const len = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  slope(x: number, z: number): number {
    const n = this.normal(x, z);
    return 1 - clamp(n.y, 0, 1);
  }

  biome(x: number, z: number): BiomeId {
    const d = Math.sqrt(x * x + z * z);
    if (d < 130) return 'scorch';

    const h = this.height(x, z);
    const s = this.slope(x, z);
    const moisture = fbm(x / 400 + 11, z / 400 - 7, this.seed + 404, { octaves: 3 }) * 0.5 + 0.5;
    const temp = fbm(x / 520 - 3, z / 520 + 19, this.seed + 505, { octaves: 3 }) * 0.5 + 0.5;

    if (s > 0.42 || h > 34) return 'crags';
    if (h < SEA_LEVEL + 1.4 && moisture > 0.52) return 'mire';
    if (moisture > 0.6 && temp < 0.62) return 'pinewood';
    if (moisture < 0.36) return 'ashflats';
    return 'moorland';
  }

  walkable(x: number, z: number): boolean {
    if (Math.abs(x) > WORLD_HALF - 12 || Math.abs(z) > WORLD_HALF - 12) return false;
    const h = this.height(x, z);
    if (h < SEA_LEVEL - 0.4) return false;
    return this.slope(x, z) < 0.62;
  }

  /** Find a valid spawn near a hint, spiralling outward. Deterministic. */
  findGround(hintX: number, hintZ: number, maxR = 220): Vec3 {
    for (let r = 0; r < maxR; r += 4) {
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2 + r * 0.11;
        const x = hintX + Math.cos(ang) * r;
        const z = hintZ + Math.sin(ang) * r;
        if (this.walkable(x, z)) return { x, y: this.height(x, z), z };
      }
    }
    return { x: hintX, y: this.height(hintX, hintZ), z: hintZ };
  }
}
