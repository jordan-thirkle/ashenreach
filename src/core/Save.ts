import type { SaveData, Settings, Item, RunStats, ItemSlot } from './Types';
import { DEFAULT_SETTINGS } from './Input';

export const SAVE_VERSION = 3;
const KEY = 'ashenreach.save.v1';
const SETTINGS_KEY = 'ashenreach.settings.v1';
const SCORES_KEY = 'ashenreach.scores.v1';

export function emptyStats(seed: string): RunStats {
  return {
    kills: 0, deaths: 0, soulsCarried: 0, soulsBanked: 0, distance: 0,
    timeMs: 0, bestCombo: 0, poisFound: 0, questsDone: 0,
    embertideLevel: 0, bossKilled: false, seed,
  };
}

export function newSave(seed: string, name = 'Warden'): SaveData {
  const now = Date.now();
  const player = {
    name, level: 1, xp: 0, embers: 0, skillPoints: 1, skills: [],
    pos: { x: 0, y: 0, z: 0 }, hp: 100,
    equipped: { weapon: null, charm: null, cloak: null, relic: null } as Partial<Record<ItemSlot, Item | null>>,
    bag: [] as Item[],
  };
  return {
    version: SAVE_VERSION,
    seed,
    createdAt: now,
    updatedAt: now,
    daily: false,
    name,
    level: 1, xp: 0, embers: 0, skillPoints: 1, learned: [],
    equipment: { weapon: null, charm: null, cloak: null, relic: null },
    bag: [],
    pos: { x: 0, y: 0, z: 0 },
    hp: 100,
    embertide: 0,
    litCairns: [],
    player,
    quests: { active: [], done: [], progress: {} },
    discovered: [],
    codex: [],
    stats: emptyStats(seed),
    settings: { ...DEFAULT_SETTINGS },
  };
}

type LegacySave = Partial<SaveData> & {
  version?: number;
  player?: Partial<SaveData['player']> & { bag?: Item[] };
  embertide?: { level: number; elapsedMs?: number; nextAtMs?: number };
};

/** Version migration. Old saves must never hard-fail into a lost character. */
export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as LegacySave;
  if (typeof s.seed !== 'string') return null;

  const base = newSave(s.seed, s.player?.name ?? "Warden");
  const v = s.version ?? 1;

  const out: SaveData = {
    ...base,
    version: SAVE_VERSION,
    createdAt: s.createdAt ?? base.createdAt,
    updatedAt: Date.now(),
    daily: s.daily ?? false,
    name: s.name ?? s.player?.name ?? "Warden",
    level: s.level ?? s.player?.level ?? 1,
    xp: s.xp ?? s.player?.xp ?? 0,
    embers: s.embers ?? s.player?.embers ?? 0,
    skillPoints: s.skillPoints ?? s.player?.skillPoints ?? 1,
    learned: s.learned ?? s.player?.skills ?? [],
    embertide: s.embertide?.level ?? 0,
    player: {
      ...base.player,
      ...(s.player ?? {}),
      equipped: { ...base.player.equipped, ...(s.player?.equipped ?? {}) },
      bag: ((s as any).bag ?? s.player?.bag ?? []) as Item[],
      skills: Array.isArray(s.player?.skills) ? (s.player.skills as string[]) : [],
      pos: s.player?.pos ?? base.player.pos,
    },
    quests: {
      active: s.quests?.active ?? [],
      done: s.quests?.done ?? [],
      progress: s.quests?.progress ?? {},
    },
    discovered: Array.isArray(s.discovered) ? s.discovered : [],
    codex: Array.isArray(s.codex) ? s.codex : [],
    stats: { ...base.stats, ...(s.stats ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
    equipment: { ...base.equipment, ...(s.player?.equipped ?? {}), ...((s.equipment ?? {}) as Record<string, unknown>) },
    bag: ((s as any).bag ?? s.player?.bag ?? []) as Item[],
    pos: s.player?.pos ?? base.pos,
    hp: s.player?.hp ?? base.hp,
    litCairns: Array.isArray((s as Record<string, unknown>).litCairns)
      ? ((s as Record<string, unknown>).litCairns as string[])
      : [],
  };

  if (v < 3) {
    out.stats.soulsBanked = out.stats.soulsBanked ?? 0;
    out.settings.keybinds = { ...DEFAULT_SETTINGS.keybinds, ...out.settings.keybinds };
  }
  return out;
}

export function saveGame(data: SaveData): boolean {
  try {
    data.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function deleteSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage disabled */
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage disabled */
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keybinds: { ...DEFAULT_SETTINGS.keybinds, ...(parsed.keybinds ?? {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export interface ScoreRow {
  seed: string;
  name: string;
  score: number;
  level: number;
  souls: number;
  kills: number;
  timeMs: number;
  at: number;
  daily: boolean;
}

export function submitScore(row: ScoreRow): ScoreRow[] {
  const all = loadScores();
  all.push(row);
  all.sort((a, b) => b.score - a.score);
  const trimmed = all.slice(0, 100);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage disabled */
  }
  return trimmed;
}

export function loadScores(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ScoreRow[]) : [];
  } catch {
    return [];
  }
}

/** Deterministic run score. Rewards banking souls over hoarding them. */
export function computeScore(st: RunStats, level: number): number {
  return Math.round(
    st.soulsBanked * 120 +
    st.kills * 18 +
    st.poisFound * 90 +
    st.questsDone * 260 +
    level * 340 +
    st.bestCombo * 25 +
    st.embertideLevel * 500 -
    st.deaths * 150,
  );
}
