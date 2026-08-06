import type { Item, Stats, StatKey, DamageType, Settings } from '../core/Types';
import { SKILL_BY_ID } from '../data/Quests';

export const BASE_STATS: Stats = {
  power: 10, guard: 0, swiftness: 0, vigor: 100, focus: 0,
  critChance: 0.05, critMult: 1.5,
  emberDmg: 0, frostDmg: 0, rotDmg: 0,
  lifesteal: 0, moveSpeed: 0, staminaRegen: 1.0, discovery: 0,
};

export const DIFFICULTY: Record<Settings['difficulty'], { dmgIn: number; dmgOut: number; xp: number }> = {
  wanderer: { dmgIn: 0.65, dmgOut: 1.15, xp: 0.85 },
  warden: { dmgIn: 1.0, dmgOut: 1.0, xp: 1.0 },
  ashborn: { dmgIn: 1.55, dmgOut: 0.88, xp: 1.35 },
};

/** Level curve: superlinear so late levels feel earned but not grindy. */
export function xpForLevel(level: number): number {
  return Math.round(90 * Math.pow(level, 1.62));
}

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let remaining = xp;
  for (;;) {
    const need = xpForLevel(level);
    if (remaining < need || level >= 60) return { level, into: remaining, need };
    remaining -= need;
    level++;
  }
}

/** Derive the full stat block from level + skills + equipment. */
export function deriveStats(
  level: number,
  skills: readonly string[],
  equipped: Partial<Record<string, Item | null>>,
): Stats {
  const s: Stats = { ...BASE_STATS };
  s.power += (level - 1) * 2.4;
  s.vigor += (level - 1) * 11;
  s.guard += (level - 1) * 1.1;

  for (const id of skills) {
    const def = SKILL_BY_ID[id];
    if (!def) continue;
    for (const [k, v] of Object.entries(def.apply)) {
      if (v === undefined) continue;
      s[k as StatKey] += v;
    }
  }

  for (const item of Object.values(equipped)) {
    if (!item) continue;
    for (const a of item.affixes) {
      if (a.mult) s[a.stat] *= a.value;
      else s[a.stat] += a.value;
    }
  }

  s.critChance = Math.min(0.75, s.critChance);
  s.lifesteal = Math.min(0.35, s.lifesteal);
  s.moveSpeed = Math.min(0.9, s.moveSpeed);
  s.vigor = Math.max(20, s.vigor);
  return s;
}

export function maxHp(stats: Stats): number {
  return Math.round(stats.vigor);
}

/**
 * Damage reduction curve. Guard has diminishing returns and can never
 * reach immunity - important so late gear never trivialises the game.
 */
export function mitigate(raw: number, guard: number): number {
  const reduction = guard / (guard + 110);
  return raw * (1 - Math.min(0.78, reduction));
}

export interface HitResult {
  damage: number;
  crit: boolean;
  killed: boolean;
}

export interface WeaponSwing {
  baseDamage: number;
  damageType: DamageType;
}

/** Player -> enemy damage. */
export function computePlayerDamage(
  stats: Stats,
  swing: WeaponSwing,
  rng: () => number,
  comboMult: number,
  difficulty: Settings['difficulty'],
): { damage: number; crit: boolean } {
  const elemental =
    swing.damageType === 'ember' ? stats.emberDmg :
    swing.damageType === 'frost' ? stats.frostDmg :
    swing.damageType === 'rot' ? stats.rotDmg : 0;

  let dmg = (swing.baseDamage + stats.power * 0.85 + elemental) * comboMult;
  const crit = rng() < stats.critChance;
  if (crit) dmg *= stats.critMult;
  dmg *= DIFFICULTY[difficulty].dmgOut;
  // +/-8% variance so numbers do not look robotic.
  dmg *= 0.92 + rng() * 0.16;
  return { damage: Math.max(1, Math.round(dmg)), crit };
}

/** Enemy -> player damage. */
export function computeEnemyDamage(
  enemyDamage: number,
  stats: Stats,
  embertideLevel: number,
  difficulty: Settings['difficulty'],
  rng: () => number,
): number {
  const scaled = enemyDamage * (1 + embertideLevel * 0.16);
  const mitigated = mitigate(scaled, stats.guard);
  const varied = mitigated * (0.9 + rng() * 0.2) * DIFFICULTY[difficulty].dmgIn;
  return Math.max(1, Math.round(varied));
}

/** Combo tiers drive both damage and juice intensity. */
export function comboTier(combo: number): { tier: string; mult: number; color: number } {
  if (combo >= 20) return { tier: 'unbroken', mult: 1.6, color: 0xd4763f };
  if (combo >= 12) return { tier: 'savage', mult: 1.4, color: 0xa6552f };
  if (combo >= 7) return { tier: 'great', mult: 1.25, color: 0xc9a227 };
  if (combo >= 4) return { tier: 'good', mult: 1.12, color: 0xefe9dc };
  return { tier: 'none', mult: 1.0, color: 0xd9d2c5 };
}

/** Enemy scaling with player level and embertide. */
export function scaleEnemy(
  baseHp: number, baseDmg: number, playerLevel: number, embertide: number,
): { hp: number; damage: number } {
  const lv = 1 + (playerLevel - 1) * 0.13;
  const et = 1 + embertide * 0.22;
  return {
    hp: Math.round(baseHp * lv * et),
    damage: Math.round(baseDmg * (1 + (playerLevel - 1) * 0.055) * (1 + embertide * 0.14)),
  };
}

/** Carrying souls: slower, louder, richer. The core risk/reward dial. */
export function carryPenalty(souls: number, hasAshVeil: boolean, hasBroadShoulders: boolean): {
  speedMult: number; aggroMult: number;
} {
  const reduce = hasBroadShoulders ? 0.75 : 1;
  const speedMult = Math.max(0.55, 1 - souls * 0.055 * reduce);
  const aggroMult = hasAshVeil ? 1 : 1 + souls * 0.09;
  return { speedMult, aggroMult };
}

/** Souls -> XP on banking. Superlinear so a big risky carry pays off. */
export function soulBankXp(souls: number, embertide: number): number {
  return Math.round(souls * 45 * Math.pow(souls, 0.28) * (1 + embertide * 0.25));
}
