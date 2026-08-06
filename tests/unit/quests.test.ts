import { describe, it, expect } from 'vitest';
import { QuestEngine, initQuests, initProgress, grantXp, applyReward, levelFromXp, xpForLevel } from '../../src/systems/Quests';

describe('Quest progression', () => {
  function fresh() {
    return new QuestEngine(initQuests(), () => {}, () => {}, () => {});
  }

  it('first quest is active on init', () => {
    const q = fresh();
    expect(q.activeDefs.length).toBe(1);
    expect(q.activeDefs[0].id).toBe('q_first_stone');
  });

  it('advances a step on matching notify', () => {
    const q = fresh();
    q.notify('collect', 'soul', 1);
    const prog = q.state.progress['q_first_stone'];
    expect(prog[0]).toBeGreaterThanOrEqual(1);
  });

  it('completes when all steps done and fires onComplete', () => {
    let completed: string | null = null;
    const q = new QuestEngine(initQuests(), (d) => { completed = d.id; }, () => {}, () => {});
    const def = q.activeDefs[0];
    // Drive each step with its real kind/target.
    q.notify(def.steps[0].kind, def.steps[0].target, def.steps[0].count);
    q.notify(def.steps[1].kind, def.steps[1].target, def.steps[1].count);
    expect(completed).toBe('q_first_stone');
    expect(q.state.done).toContain('q_first_stone');
  });

  it('boss gate requires enough completed quests', () => {
    const q = fresh();
    expect(q.bossUnlocked).toBe(false);
  });
});

describe('Levelling', () => {
  it('xp curve is monotonic', () => {
    expect(xpForLevel(5)).toBeGreaterThan(xpForLevel(4));
    expect(xpForLevel(4)).toBeGreaterThan(xpForLevel(3));
  });

  it('grantXp grants skill points on level up', () => {
    const p = initProgress();
    const before = p.skillPoints;
    grantXp(p, 500);
    expect(p.level).toBeGreaterThan(1);
    expect(p.skillPoints).toBeGreaterThan(before);
  });

  it('levelFromXp returns partial progress', () => {
    const r = levelFromXp(50);
    expect(r.level).toBeGreaterThanOrEqual(1);
    expect(r.into).toBeLessThanOrEqual(r.need);
  });

  it('applyReward handles xp / embers / skillpoint', () => {
    const p = initProgress(); // skillPoints starts at 1
    applyReward(p, { kind: 'xp', amount: 200 }, () => {}); // crosses lvl1->2 (+1 sp)
    applyReward(p, { kind: 'embers', amount: 5 }, () => {});
    applyReward(p, { kind: 'skillpoint', amount: 1 }, () => {});
    expect(p.embers).toBe(5);
    expect(p.skillPoints).toBe(3); // 1 base + 1 from level up + 1 reward
  });
});
