import type { QuestDef, QuestStep, Reward, Item } from '../core/Types';
import { QUESTS } from '../data/Quests';

export interface QuestState {
  active: string[];
  done: string[];
  progress: Record<string, number[]>;
}

export function initQuests(): QuestState {
  const first = QUESTS.find((q) => q.id === 'q_first_stone');
  return {
    active: ['q_first_stone'],
    done: [],
    progress: { q_first_stone: first ? first.steps.map(() => 0) : [0] },
  };
}

export class QuestEngine {
  state: QuestState;
  private onComplete: (q: QuestDef) => void;
  private onStep: (q: QuestDef, idx: number) => void;
  private onOffer: (q: QuestDef) => void;

  constructor(
    state: QuestState,
    onComplete: (q: QuestDef) => void,
    onStep: (q: QuestDef, idx: number) => void,
    onOffer: (q: QuestDef) => void,
  ) {
    this.state = state;
    this.onComplete = onComplete;
    this.onStep = onStep;
    this.onOffer = onOffer;
  }

  get activeDefs(): QuestDef[] {
    return this.state.active
      .map((id) => QUESTS.find((q) => q.id === id))
      .filter((q): q is QuestDef => q !== undefined);
  }

  /** Advance every active step matching this event. */
  notify(kind: QuestStep['kind'], targetId: string | undefined, amount = 1): void {
    for (const qid of [...this.state.active]) {
      const q = QUESTS.find((x) => x.id === qid);
      if (!q) continue;
      const prog = (this.state.progress[qid] ?? []).slice();
      while (prog.length < q.steps.length) prog.push(0);
      this.state.progress[qid] = prog;

      // Only the first incomplete step of a quest can advance - keeps
      // objectives ordered and readable in the tracker.
      const idx = prog.findIndex((v, i) => v < (q.steps[i]?.count ?? 1));
      if (idx < 0) continue;
      const step = q.steps[idx];
      if (!step || step.kind !== kind) continue;
      if (step.target && step.target !== targetId) continue;

      prog[idx] = Math.min(step.count, (prog[idx] ?? 0) + amount);
      if (prog[idx]! >= step.count) this.onStep(q, idx);

      const allDone = q.steps.every((s, i) => (prog[i] ?? 0) >= s.count);
      if (allDone) this.complete(q);
    }
  }

  private complete(q: QuestDef): void {
    this.state.active = this.state.active.filter((id) => id !== q.id);
    if (!this.state.done.includes(q.id)) this.state.done.push(q.id);
    this.onComplete(q);
    for (const nid of q.unlocks ?? []) {
      this.offer(nid);
    }
  }

  offer(id: string): void {
    if (this.state.done.includes(id) || this.state.active.includes(id)) return;
    const q = QUESTS.find((x) => x.id === id);
    if (!q) return;
    this.state.active.push(id);
    this.state.progress[id] = q.steps.map(() => 0);
    this.onOffer(q);
  }

  isDone(id: string): boolean {
    return this.state.done.includes(id);
  }

  /** Final boss gate: the Crown only wakes once the Reach is properly walked. */
  get bossUnlocked(): boolean {
    return this.state.done.includes('q_crown_ascent') ||
      this.state.done.filter((d) => d.startsWith('q_')).length >= 5;
  }
}

// -------------------------------------------------------------- LEVELLING

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.42));
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

export interface Progress {
  xp: number;
  level: number;
  skillPoints: number;
  learned: string[];
  embers: number;
  codex: string[];
  discovered: string[];
}

export function initProgress(): Progress {
  return { xp: 0, level: 1, skillPoints: 1, learned: [], embers: 0, codex: ['c_ash'], discovered: [] };
}

export function grantXp(p: Progress, amount: number): { levelsGained: number } {
  const before = levelFromXp(p.xp).level;
  p.xp += Math.max(0, Math.round(amount));
  const after = levelFromXp(p.xp).level;
  const gained = after - before;
  if (gained > 0) {
    p.level = after;
    p.skillPoints += gained;
  }
  return { levelsGained: gained };
}

export function applyReward(p: Progress, r: Reward, _giveItem?: (i: Item) => void): string[] {
  const lines: string[] = [];
  const amt = r.amount ?? 0;
  switch (r.kind) {
    case 'xp': {
      const res = grantXp(p, amt);
      lines.push(`+${amt} experience`);
      if (res.levelsGained > 0) lines.push(`Level ${p.level}`);
      break;
    }
    case 'embers':
      p.embers += amt;
      lines.push(`+${amt} embers`);
      break;
    case 'skillpoint':
      p.skillPoints += amt;
      lines.push(`+${amt} skill point${amt === 1 ? '' : 's'}`);
      break;
    case 'codex':
      if (r.codexId && !p.codex.includes(r.codexId)) {
        p.codex.push(r.codexId);
        lines.push('Codex entry recovered');
      }
      break;
    case 'item': {
      // itemDefId items are issued by the caller via giveItem; the
      // Game layer resolves defId -> concrete Item here is out of scope.
      break;
    }
  }
  return lines;
}

// --------------------------------------------------------------- SCORING

export interface ScoreInput {
  soulsBanked: number;
  kills: number;
  poisFound: number;
  questsDone: number;
  bestCombo: number;
  embertideLevel: number;
  deaths: number;
  bossKilled: boolean;
  timeMs: number;
}

/**
 * Score rewards the risky play the game is built around: banking souls under
 * Embertide pressure, long combos, and clearing without dying.
 */
export function computeScore(s: ScoreInput): number {
  let score = 0;
  score += s.soulsBanked * 120;
  score += s.kills * 35;
  score += s.poisFound * 180;
  score += s.questsDone * 450;
  score += s.bestCombo * 25;
  score += s.embertideLevel * 300;
  if (s.bossKilled) score += 4000;
  score -= s.deaths * 250;
  // Speed bonus only applies to a cleared run.
  if (s.bossKilled) {
    const minutes = s.timeMs / 60000;
    score += Math.max(0, Math.round((45 - minutes) * 60));
  }
  return Math.max(0, Math.round(score));
}
