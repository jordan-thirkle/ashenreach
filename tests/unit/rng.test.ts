import { describe, it, expect } from 'vitest';
import { makeRNG } from '../../src/core/RNG';

describe('RNG determinism', () => {
  it('same seed -> identical sequence', () => {
    const a = makeRNG('seed-A');
    const b = makeRNG('seed-A');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = makeRNG('one');
    const b = makeRNG('two');
    expect(a.next()).not.toEqual(b.next());
  });

  it('fork isolation (int/range/pick/bool are stable)', () => {
    const r = makeRNG('fork');
    const before = r.next();
    const i = r.int(1, 100);
    const r2 = makeRNG('fork');
    expect(r2.next()).toEqual(before);
    expect(i).toBeGreaterThanOrEqual(1);
    expect(i).toBeLessThanOrEqual(100);
  });

  it('double range stays in bounds', () => {
    const r = makeRNG('bounds');
    for (let i = 0; i < 500; i++) {
      const v = r.range(-3.5, 8.2);
      expect(v).toBeGreaterThanOrEqual(-3.5);
      expect(v).toBeLessThanOrEqual(8.2);
    }
  });
});
