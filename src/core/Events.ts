import type { Vec3, Item, Reward, RunStats } from './Types';

export interface GameEvents {
  'player:hit': { dmg: number; crit: boolean; pos: Vec3 };
  'player:heal': { amount: number };
  'player:death': { cause: string; stats: RunStats };
  'player:dash': { pos: Vec3 };
  'player:parry': { pos: Vec3 };
  'enemy:hit': { id: string; dmg: number; crit: boolean; pos: Vec3; killed: boolean };
  'enemy:death': { id: string; kind: string; pos: Vec3; xp: number };
  'loot:drop': { item: Item; pos: Vec3 };
  'loot:pickup': { item: Item; pos: Vec3 };
  'level:up': { level: number };
  'quest:accept': { id: string; title: string };
  'quest:progress': { id: string; step: number; have: number; need: number };
  'quest:complete': { id: string; title: string; rewards: Reward[] };
  'poi:discover': { id: string; name: string; kind: string };
  'soul:take': { count: number };
  'soul:bank': { count: number; xp: number };
  'soul:lost': { count: number; pos: Vec3 };
  'relic:bind': { id: string; name: string };
  'boss:phase': { id: string; phase: number };
  'boss:defeat': { id: string };
  'embertide:rise': { level: number };
  'codex:unlock': { id: string; title: string };
  'combo:change': { combo: number; tier: string };
  'toast': { text: string; tone: 'info' | 'good' | 'bad' | 'gold' };
  'state:change': { from: string; to: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private map = new Map<string, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(key: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.map.get(key as string);
    if (!set) {
      set = new Set();
      this.map.set(key as string, set);
    }
    set.add(fn as Handler<never>);
    return () => set?.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(key: K, payload: GameEvents[K]): void {
    const set = this.map.get(key as string);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as unknown as Handler<GameEvents[K]>)(payload);
      } catch (err) {
        console.warn(`[events] handler failed for ${String(key)}`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}

export const bus = new EventBus();
