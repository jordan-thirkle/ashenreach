/**
 * Ashenreach — localStorage-backed speedrun/score leaderboard.
 *
 * Dependency-free, fully typed, importable module.
 * Persists run records to localStorage under a namespaced key and exposes
 * a small, self-test-friendly API for HUD/leaderboard use.
 *
 * No backend, no Supabase, no three.js, no DOM beyond localStorage.
 */

/** A persisted speedrun/score record. */
export interface RunRecord {
  id: string;
  score: number;
  timeMs: number;
  souls: number;
  kills: number;
  date: string;
  seed?: string;
}

/** Shape accepted by ScoreBoard.submit (id + date are assigned on save). */
export type RunSubmission = Omit<RunRecord, "id" | "date">;

/** Options for constructing a ScoreBoard. */
export interface ScoreBoardOptions {
  /** Override the storage key (defaults to "ashenreach.scores"). */
  storageKey?: string;
  /** Override the storage backend (defaults to global localStorage). */
  storage?: StorageLike;
}

/** Minimal storage surface so this module is testable with a fake backend. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DEFAULT_STORAGE_KEY = "ashenreach.scores";

/**
 * Safe localStorage wrapper: guards against unavailable storage (e.g. SSR,
 * privacy mode, or tests without a DOM) and against corrupt JSON on read.
 */
class SafeStorage {
  private readonly storage: StorageLike | null;

  constructor(storage?: StorageLike) {
    this.storage = resolveStorage(storage);
  }

  get available(): boolean {
    return this.storage !== null;
  }

  read(key: string): RunRecord[] {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Defensively filter to well-formed records only.
      return parsed.filter(isValidRecord);
    } catch {
      // Corrupt or unreadable data — fail safe to empty, never throw.
      return [];
    }
  }

  write(key: string, records: RunRecord[]): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(key, JSON.stringify(records));
      return true;
    } catch {
      // Quota exceeded or storage blocked — fail safe, no throw.
      return false;
    }
  }

  remove(key: string): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch {
      /* best-effort */
    }
  }
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      // Touch it to confirm it is actually usable (throws in some browsers).
      const probe = "__ashenreach_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* unavailable */
  }
  return null;
}

function isValidRecord(value: unknown): value is RunRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.score === "number" &&
    typeof r.timeMs === "number" &&
    typeof r.souls === "number" &&
    typeof r.kills === "number" &&
    typeof r.date === "string"
  );
}

/** Generate a reasonably unique id without external deps. */
function makeId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return rand;
}

function makeDate(): string {
  try {
    return new Date().toISOString();
  } catch {
    return new Date().toString();
  }
}

/**
 * Local-only speedrun/score leaderboard.
 *
 * @example
 * const board = new ScoreBoard();
 * const rec = board.submit({ score: 1200, timeMs: 95321, souls: 8, kills: 42 });
 * const top10 = board.top(10);
 * const bestRec = board.best();
 */
export class ScoreBoard {
  private readonly storage: SafeStorage;
  private readonly key: string;

  constructor(options: ScoreBoardOptions = {}) {
    this.key = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.storage = new SafeStorage(options.storage);
  }

  /** True if a working storage backend was found. */
  get available(): boolean {
    return this.storage.available;
  }

  /** Top `n` records sorted by score descending (ties: earlier date first). */
  top(n = 10): RunRecord[] {
    const all = this.storage.read(this.key);
    return all
      .slice()
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.date.localeCompare(b.date);
      })
      .slice(0, Math.max(0, n));
  }

  /**
   * Persist a new run and return the saved record (with generated id + date).
   * On a storage failure the record is still returned but is not persisted.
   */
  submit(rec: RunSubmission): RunRecord {
    const saved: RunRecord = {
      id: makeId(),
      date: makeDate(),
      score: rec.score,
      timeMs: rec.timeMs,
      souls: rec.souls,
      kills: rec.kills,
      ...(rec.seed !== undefined ? { seed: rec.seed } : {}),
    };

    const all = this.storage.read(this.key);
    all.push(saved);
    this.storage.write(this.key, all);
    return saved;
  }

  /** Highest-scoring record, or null if none. */
  best(): RunRecord | null {
    const all = this.storage.read(this.key);
    if (all.length === 0) return null;
    return all.reduce((best, r) =>
      r.score > best.score || (r.score === best.score && r.date < best.date)
        ? r
        : best,
    );
  }

  /** Remove all stored records. */
  clear(): void {
    this.storage.remove(this.key);
  }
}

/**
 * Format a duration in milliseconds as `MM:SS.mmm` for HUD display.
 * Examples: 0 -> "00:00.000", 95321 -> "01:35.321".
 */
export function formatTime(ms: number): string {
  const safe = Number.isFinite(ms) && ms >= 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(safe % 1000);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

export default ScoreBoard;
