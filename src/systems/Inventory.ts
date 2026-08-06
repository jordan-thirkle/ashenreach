/**
 * Ashenreach - relic inventory + equip system.
 *
 * Owns the player's bag of relic items and the small set of relics that are
 * currently equipped (hard cap of 3). Pure data + typed API: no rendering, no
 * Game import, no `any`. Game (or any caller) drives it; the HUD reads from it.
 */

import type { Affix, Item, ItemSlot, Rarity, StatKey, Stats } from '../core/Types';
import { GEAR } from '../data/Items';

/** Maximum relics a warden may carry equipped at once. */
export const MAX_EQUIPPED_RELICS = 3;

/** Static definition of a relic, resolved from the shared GEAR table. */
export interface RelicDef {
  defId: string;
  name: string;
  slot: ItemSlot;
  icon: string;
  flavor: string;
}

/** Compact view of an equipped relic, for HUD chips and tooltips. */
export interface EquippedRelicView {
  uid: string;
  defId: string;
  name: string;
  /** 1-3 character label used when there is no room for the full name. */
  short: string;
  icon: string;
  rarity: Rarity;
  tier: number;
  affixes: Affix[];
  flavor: string;
}

/** Every relic definition known to the game, keyed by defId. */
export const RELIC_DEFS: ReadonlyMap<string, RelicDef> = new Map(
  GEAR.filter((g) => g.slot === 'relic').map((g) => [g.defId, g as RelicDef]),
);

export function getRelicDef(defId: string): RelicDef | null {
  return RELIC_DEFS.get(defId) ?? null;
}

/** Derive a short chip label ("ASH", "HB") from a relic name. */
export function shortLabel(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(
    (w) => w.length > 2 && !['of', 'the', 'and'].includes(w.toLowerCase()),
  );
  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]!.toUpperCase()).join('');
}

let uidCounter = 0;
function nextUid(defId: string): string {
  uidCounter += 1;
  return `${defId}#${uidCounter.toString(36)}`;
}

export interface InventoryState {
  bag: Item[];
  equippedRelics: string[];
}

export class Inventory {
  private bag: Item[] = [];
  /** uids of equipped relics, in slot order. Never longer than MAX_EQUIPPED_RELICS. */
  private equippedRelics: string[] = [];

  constructor(initial?: Partial<InventoryState>) {
    if (initial?.bag) this.bag = initial.bag.slice();
    if (initial?.equippedRelics) {
      for (const uid of initial.equippedRelics) this.equipRelic(uid);
    }
  }

  // --- bag ------------------------------------------------------------

  getBag(): readonly Item[] {
    return this.bag;
  }

  getItem(uid: string): Item | null {
    return this.bag.find((i) => i.uid === uid) ?? null;
  }

  /** Add an already-rolled item. Returns the item for chaining. */
  addItem(item: Item): Item {
    this.bag.push(item);
    return item;
  }

  /** Remove an item by uid; unequips it first if it was equipped. */
  removeItem(uid: string): boolean {
    const idx = this.bag.findIndex((i) => i.uid === uid);
    if (idx < 0) return false;
    this.unequipRelic(uid);
    this.bag.splice(idx, 1);
    return true;
  }

  /**
   * Create and store a relic from its defId (e.g. 'r_ashencrown').
   * Returns null if the id is not a known relic.
   */
  addRelic(defId: string, affixes: Affix[] = [], tier = 1, rarity: Rarity = 'relic'): Item | null {
    const def = getRelicDef(defId);
    if (!def) return null;
    const item: Item = {
      uid: nextUid(defId),
      defId: def.defId,
      name: def.name,
      slot: 'relic',
      rarity,
      icon: def.icon,
      tier,
      affixes,
      flavor: def.flavor,
    };
    return this.addItem(item);
  }

  getRelics(): Item[] {
    return this.bag.filter((i) => i.slot === 'relic');
  }

  // --- equipping -------------------------------------------------------

  isEquipped(uid: string): boolean {
    return this.equippedRelics.includes(uid);
  }

  hasFreeRelicSlot(): boolean {
    return this.equippedRelics.length < MAX_EQUIPPED_RELICS;
  }

  /**
   * Equip a relic by item uid (or, as a convenience, by defId - the first
   * matching unequipped relic in the bag is used). Enforces the 3-relic cap.
   */
  equipRelic(id: string): boolean {
    let item = this.getItem(id);
    if (!item) {
      item = this.bag.find((i) => i.slot === 'relic' && i.defId === id && !this.isEquipped(i.uid))
        ?? null;
    }
    if (!item || item.slot !== 'relic') return false;
    if (this.isEquipped(item.uid)) return true;
    if (!this.hasFreeRelicSlot()) return false;
    this.equippedRelics.push(item.uid);
    return true;
  }

  unequipRelic(id: string): boolean {
    let idx = this.equippedRelics.indexOf(id);
    if (idx < 0) {
      idx = this.equippedRelics.findIndex((uid) => this.getItem(uid)?.defId === id);
    }
    if (idx < 0) return false;
    this.equippedRelics.splice(idx, 1);
    return true;
  }

  /** Equip if there is room, otherwise swap out the oldest equipped relic. */
  toggleRelic(id: string): boolean {
    if (this.isEquipped(id)) return this.unequipRelic(id);
    if (!this.hasFreeRelicSlot()) {
      const oldest = this.equippedRelics[0];
      if (oldest !== undefined) this.unequipRelic(oldest);
    }
    return this.equipRelic(id);
  }

  /** Raw equipped items, in slot order. */
  getEquippedRelicItems(): Item[] {
    const out: Item[] = [];
    for (const uid of this.equippedRelics) {
      const it = this.getItem(uid);
      if (it) out.push(it);
    }
    return out;
  }

  /** Compact HUD-friendly views of the equipped relics. */
  getEquippedRelics(): EquippedRelicView[] {
    return this.getEquippedRelicItems().map((it) => ({
      uid: it.uid,
      defId: it.defId,
      name: it.name,
      short: shortLabel(it.name),
      icon: it.icon,
      rarity: it.rarity,
      tier: it.tier,
      affixes: it.affixes,
      flavor: it.flavor,
    }));
  }

  /** Summed affix contribution of all equipped relics. */
  relicStats(): Partial<Stats> {
    const out: Partial<Record<StatKey, number>> = {};
    for (const it of this.getEquippedRelicItems()) {
      for (const a of it.affixes) {
        out[a.stat] = (out[a.stat] ?? 0) + a.value;
      }
    }
    return out;
  }

  // --- persistence -----------------------------------------------------

  serialize(): InventoryState {
    return { bag: this.bag.slice(), equippedRelics: this.equippedRelics.slice() };
  }

  load(state: Partial<InventoryState>): void {
    this.bag = state.bag ? state.bag.slice() : [];
    this.equippedRelics = [];
    for (const uid of state.equippedRelics ?? []) this.equipRelic(uid);
  }
}
