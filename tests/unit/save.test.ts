import { describe, it, expect } from 'vitest';
import { newSave, saveGame, loadGame, emptyStats, computeScore, submitScore, migrate } from '../../src/core/Save';

describe('Save / load', () => {
  it('newSave has flat equipment + bag', () => {
    const s = newSave('t1', 'Hero');
    expect(s.equipment.weapon).toBeNull();
    expect(Array.isArray(s.bag)).toBe(true);
    expect(s.embertide).toBe(0);
    expect(s.litCairns).toEqual([]);
  });

  it('round-trip preserves data', () => {
    const s = newSave('rt', 'Ward');
    s.bag.push({ uid: 'x', defId: 'draught', name: 'Draught', slot: 'consumable', rarity: 'common', icon: 'potion', tier: 1, affixes: [], flavor: '' });
    s.equipment.weapon = { uid: 'w', defId: 'blade', name: 'Blade', slot: 'weapon', rarity: 'fine', icon: 'blade', tier: 2, affixes: [], flavor: '', weapon: { archetype: 'blade', baseDamage: 14, swingTime: 0.4, reach: 2.4, arc: 1.4, stagger: 0.2, damageType: 'physical' } };
    saveGame(s);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.bag.length).toBe(1);
    expect(loaded!.equipment.weapon?.defId).toBe('blade');
  });

  it('version migration tolerates legacy shape', () => {
    const legacy = { version: 1, seed: 'leg', player: { name: 'Old', level: 3, xp: 120, embers: 4, skillPoints: 2, skills: [], pos: { x: 1, y: 0, z: 2 }, hp: 80, equipped: { weapon: null }, bag: [] }, embertide: { level: 2, elapsedMs: 9000 }, quests: { active: [], done: [], progress: {} }, discovered: [], codex: [], stats: emptyStats('leg'), settings: {} };
    const migrated = migrate(legacy);
    expect(migrated).not.toBeNull();
    expect(migrated!.level).toBe(3);
    expect(migrated!.embertide).toBe(2);
  });

  it('computeScore rewards banking over hoarding', () => {
    const a = computeScore({ ...emptyStats('s'), soulsBanked: 50, kills: 10, poisFound: 3, questsDone: 4, bossKilled: true, timeMs: 60_000, embertideLevel: 2, deaths: 1, soulsCarried: 0, distance: 1000, bestCombo: 20, seed: 's' }, 10);
    const b = computeScore({ ...emptyStats('s'), soulsBanked: 5, kills: 10, poisFound: 3, questsDone: 4, bossKilled: true, timeMs: 60_000, embertideLevel: 2, deaths: 1, soulsCarried: 0, distance: 1000, bestCombo: 20, seed: 's' }, 10);
    expect(a).toBeGreaterThan(b);
  });

  it('submitScore returns a sorted leaderboard with the new row', () => {
    submitScore({ name: 'A', score: 100, level: 2, souls: 5, seed: 's', at: 1, kills: 1, timeMs: 1, daily: false });
    const board2 = submitScore({ name: 'B', score: 999, level: 9, souls: 50, seed: 's', at: 2, kills: 30, timeMs: 2, daily: false });
    expect(board2[0].name).toBe('B');
    expect(board2.find((x) => x.name === 'A')).toBeDefined();
  });
});
