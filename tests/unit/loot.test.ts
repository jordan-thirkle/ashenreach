import { describe, it, expect } from 'vitest';
import { rollLoot, makeConsumable } from '../../src/data/Items';
import { makeRNG } from '../../src/core/RNG';

describe('Loot / inventory', () => {
  it('rarity distribution trends toward common', () => {
    const r = makeRNG('loot');
    const tally: Record<string, number> = {};
    let total = 0;
    for (let i = 0; i < 400; i++) {
      for (const item of rollLoot(r, 1, false, false, 0)) {
        tally[item.rarity] = (tally[item.rarity] ?? 0) + 1;
        total++;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(tally.common ?? 0).toBeGreaterThan(tally.relic ?? 0);
  });

  it('boss drops yield at least one item', () => {
    const r = makeRNG('boss');
    const drops = rollLoot(r, 10, false, true, 0);
    expect(drops.length).toBeGreaterThanOrEqual(1);
  });

  it('consumables stack and carry count', () => {
    const a = makeConsumable(makeRNG('c1'), 'draught', 3);
    const b = makeConsumable(makeRNG('c2'), 'draught', 2);
    expect(a.stackable).toBe(true);
    expect(a.count).toBe(3);
    expect(a.defId).toBe(b.defId);
  });

  it('items get unique uids', () => {
    const r = makeRNG('uid');
    const a = rollLoot(r, 1, false, true, 0)[0];
    const b = rollLoot(r, 1, false, true, 0)[0];
    expect(a.uid).not.toEqual(b.uid);
  });
});
