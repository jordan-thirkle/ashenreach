import { describe, it, expect } from 'vitest';
import {
  deriveStats, maxHp, computePlayerDamage, computeEnemyDamage, comboTier,
  carryPenalty, soulBankXp, DIFFICULTY,
} from '../../src/systems/Combat';
import { makeRNG } from '../../src/core/RNG';

describe('Combat formulas', () => {
  it('maxHp scales with vigor + level', () => {
    const low = deriveStats(1, [], {});
    const high = deriveStats(20, ['s_bulwark'], {});
    expect(maxHp(high)).toBeGreaterThan(maxHp(low));
  });

  it('crit chance stays boolean and clamps internally', () => {
    const s = deriveStats(10, [], {});
    s.critChance = 2;
    const r = makeRNG('crit');
    for (let i = 0; i < 50; i++) {
      const { crit } = computePlayerDamage(s, { baseDamage: 10, damageType: 'physical' }, () => r.next(), 1, 'warden');
      expect(typeof crit).toBe('boolean');
    }
  });

  it('enemy damage rises with embertide', () => {
    const s = deriveStats(5, [], {});
    const r = makeRNG('e');
    const calm = computeEnemyDamage(10, s, 0, 'warden', () => r.next());
    const hot = computeEnemyDamage(10, s, 5, 'warden', () => r.next());
    expect(hot).toBeGreaterThan(calm);
  });

  it('combo tier escalates and never undefined', () => {
    expect(comboTier(0).mult).toBeLessThanOrEqual(comboTier(40).mult);
    expect(comboTier(999).color).toBeDefined();
  });

  it('carry penalty slows but never freezes or reverses', () => {
    const none = carryPenalty(0, false, false);
    const heavy = carryPenalty(40, false, false);
    expect(heavy.speedMult).toBeLessThan(none.speedMult);
    expect(heavy.speedMult).toBeGreaterThan(0.2);
    expect(heavy.speedMult).toBeLessThanOrEqual(1);
  });

  it('soul bank xp rewards volume', () => {
    expect(soulBankXp(10, 0)).toBeGreaterThan(soulBankXp(1, 0));
  });

  it('difficulty table has the three tiers', () => {
    for (const d of ['wanderer', 'warden', 'ashborn'] as const) {
      expect(DIFFICULTY[d]).toBeDefined();
    }
  });
});
