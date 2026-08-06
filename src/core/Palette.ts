/**
 * Ashenreach palette - LOCKED by ARCHITECTURE.md section 1.
 * Weathered highland folk-mythic. Two saturated accents against desaturated earth.
 * Banned: neon, cyan/magenta, synthwave, purple gradients.
 */
export const PALETTE = {
  ash: 0xd9d2c5,
  bone: 0xefe9dc,
  slate: 0x3b4149,
  slateDark: 0x22262b,
  peat: 0x4a3f35,
  peatDark: 0x2e2820,
  moss: 0x6e7a54,
  mossDark: 0x4c5439,
  rust: 0xa6552f,
  rustBright: 0xd4763f,
  oxblood: 0x6e2a28,
  blood: 0x6e2a28,
  palegold: 0xc9a227,
  ember: 0xd9763a,
  mire: 0x3f4a3c,
  frost: 0x8fa6a8,
  rot: 0x7a8449,
} as const;

/** Structural shape shared by all biome palettes. */
export interface Palette {
  ash: number;
  bone: number;
  slate: number;
  slateDark: number;
  peat: number;
  peatDark: number;
  moss: number;
  mossDark: number;
  rust: number;
  rustBright: number;
  oxblood: number;
  blood: number;
  palegold: number;
  ember: number;
  mire: number;
  frost: number;
  rot: number;
}

/**
 * Winter variant of the locked palette - frozen slate, pale peat, ice-grey earth.
 * Accents (oxblood / palegold / ember / rust) are deliberately UNCHANGED so the
 * game's two saturated reads stay identical across biome variants.
 * Same keys as PALETTE, so it is drop-in substitutable.
 */
export const PALETTE_WINTER: Palette = {
  ash: 0xe4e6e8,
  bone: 0xf2f4f4,
  slate: 0x49525c,
  slateDark: 0x272d34,
  peat: 0x4b4a44,
  peatDark: 0x2f2f2c,
  moss: 0x66705f,
  mossDark: 0x464e44,
  rust: 0xa6552f,
  rustBright: 0xd4763f,
  oxblood: 0x6e2a28,
  blood: 0x6e2a28,
  palegold: 0xc9a227,
  ember: 0xd9763a,
  mire: 0x46545a,
  frost: 0xb6c9cc,
  rot: 0x6f7a63,
};

/** Which world-wide biome variant a run is generated in. */
export type BiomeVariant = 'highland' | 'winter';

/** Resolve the colour set for a run's biome variant. Defaults to highland. */
export function paletteFor(variant: BiomeVariant = 'highland'): Palette {
  return variant === 'winter' ? PALETTE_WINTER : PALETTE;
}

export const CSS = {
  ash: '#D9D2C5',
  bone: '#EFE9DC',
  slate: '#3B4149',
  slateDark: '#22262B',
  peat: '#4A3F35',
  moss: '#6E7A54',
  rust: '#A6552F',
  rustBright: '#D4763F',
  oxblood: '#6E2A28',
  palegold: '#C9A227',
  paleGoldBright: '#E8C14A',
} as const;

export const RARITY_COLOR: Record<string, number> = {
  common: 0xa6a094,
  fine: 0x8fa6a8,
  rare: 0x6e7a54,
  relic: 0xc9a227,
  mythic: 0xa6552f,
};

export const RARITY_CSS: Record<string, string> = {
  common: '#A6A094',
  fine: '#8FA6A8',
  rare: '#8B9A6B',
  relic: '#C9A227',
  mythic: '#D4763F',
};

/** Objective marker shapes - colourblind-safe pairing (shape carries the meaning). */
export const MARKER_SHAPE: Record<string, string> = {
  quest: 'diamond',
  poi: 'triangle',
  enemy: 'square',
  loot: 'circle',
  boss: 'hexagon',
};
