import type { Affix, Item, Rarity, StatKey, WeaponProfile, ItemSlot } from '../core/Types';
import type { RNG } from '../core/RNG';

export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 100, fine: 46, rare: 18, relic: 5, mythic: 1,
};

export const RARITY_AFFIXES: Record<Rarity, number> = {
  common: 1, fine: 2, rare: 3, relic: 4, mythic: 5,
};

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0, fine: 1.18, rare: 1.42, relic: 1.8, mythic: 2.35,
};

export interface WeaponDef {
  defId: string;
  name: string;
  profile: WeaponProfile;
  flavor: string;
  icon: string;
}

export const WEAPONS: WeaponDef[] = [
  {
    defId: 'w_cairnblade', name: 'Cairnblade', icon: 'icon_blade',
    profile: { archetype: 'blade', baseDamage: 22, swingTime: 0.42, reach: 2.6, arc: 1.5, stagger: 0.5, damageType: 'physical' },
    flavor: 'Standard warden issue. Balanced, unremarkable, dependable.',
  },
  {
    defId: 'w_widowspine', name: 'Widowspine', icon: 'icon_blade',
    profile: { archetype: 'blade', baseDamage: 18, swingTime: 0.31, reach: 2.3, arc: 1.3, stagger: 0.3, damageType: 'physical' },
    flavor: 'Thin, fast, and unkind. Favoured by wardens who expect to be outnumbered.',
  },
  {
    defId: 'w_barrowmaul', name: 'Barrow Maul', icon: 'icon_maul',
    profile: { archetype: 'maul', baseDamage: 46, swingTime: 0.78, reach: 2.9, arc: 1.9, stagger: 1.3, damageType: 'physical' },
    flavor: 'Made for breaking cairn seals. Works on husks too.',
  },
  {
    defId: 'w_slagbreaker', name: 'Slagbreaker', icon: 'icon_maul',
    profile: { archetype: 'maul', baseDamage: 54, swingTime: 0.92, reach: 3.1, arc: 2.1, stagger: 1.6, damageType: 'ember' },
    flavor: 'The head still holds heat from the burning. It has never cooled.',
  },
  {
    defId: 'w_reachspear', name: 'Reach Spear', icon: 'icon_spear',
    profile: { archetype: 'spear', baseDamage: 27, swingTime: 0.52, reach: 4.2, arc: 0.55, stagger: 0.7, damageType: 'physical' },
    flavor: 'Kill it before it reaches you. That is the whole doctrine.',
  },
  {
    defId: 'w_gravepike', name: 'Gravepike', icon: 'icon_spear',
    profile: { archetype: 'spear', baseDamage: 33, swingTime: 0.6, reach: 4.6, arc: 0.5, stagger: 0.9, damageType: 'rot' },
    flavor: 'Pulled from a barrow, still wearing its owner.',
  },
  {
    defId: 'w_emberconser', name: 'Ember Censer', icon: 'icon_censer',
    profile: { archetype: 'censer', baseDamage: 16, swingTime: 0.36, reach: 3.4, arc: 2.6, stagger: 0.4, damageType: 'ember' },
    flavor: 'Swung on a chain. Leaves a line of fire in the ash.',
  },
  {
    defId: 'w_frostcenser', name: 'Hoarfrost Censer', icon: 'icon_censer',
    profile: { archetype: 'censer', baseDamage: 19, swingTime: 0.44, reach: 3.2, arc: 2.4, stagger: 0.6, damageType: 'frost' },
    flavor: 'Cold enough that the ash freezes into glass where it passes.',
  },
  {
    defId: 'w_moorcutter', name: 'Moorcutter Glaive', icon: 'icon_glaive',
    profile: { archetype: 'glaive', baseDamage: 38, swingTime: 0.55, reach: 3.6, arc: 2.6, stagger: 0.95, damageType: 'physical' },
    flavor: 'A reaping blade on a warden haft. It cuts the whole line, not the man.',
  },
  {
    defId: 'w_hollowreap', name: 'Hollow Reaper', icon: 'icon_glaive',
    profile: { archetype: 'glaive', baseDamage: 41, swingTime: 0.58, reach: 3.8, arc: 2.7, stagger: 1.05, damageType: 'rot' },
    flavor: 'Swung once at the barrow mouth. Nothing that stood there stands now.',
  },
];

export interface GearDef {
  defId: string;
  name: string;
  slot: ItemSlot;
  icon: string;
  flavor: string;
}

export const GEAR: GearDef[] = [
  { defId: 'g_wardencloak', name: 'Warden Cloak', slot: 'cloak', icon: 'icon_cloak', flavor: 'Oiled wool. Sheds ash, sheds rain, sheds blame.' },
  { defId: 'g_ashshroud', name: 'Ash Shroud', slot: 'cloak', icon: 'icon_cloak', flavor: 'Woven so fine the drift slides off it.' },
  { defId: 'g_barrowmantle', name: 'Barrow Mantle', slot: 'cloak', icon: 'icon_cloak', flavor: 'Taken from a warden who did not need it any more.' },
  { defId: 'g_boneCharm', name: 'Knucklebone Charm', slot: 'charm', icon: 'icon_charm', flavor: 'Nine bones on a cord. Eight are not yours.' },
  { defId: 'g_emberCharm', name: 'Ember Knot', slot: 'charm', icon: 'icon_charm', flavor: 'Still warm. It will not go out.' },
  { defId: 'g_mossCharm', name: 'Moorbind Charm', slot: 'charm', icon: 'icon_charm', flavor: 'Bog-cotton and copper wire. Smells of home.' },
  { defId: 'r_firstcairn', name: 'Relic of the First Cairn', slot: 'relic', icon: 'icon_relic', flavor: 'The stone the very first warden carried. It weighs nothing.' },
  { defId: 'r_hollowbell', name: 'Hollow Bell', slot: 'relic', icon: 'icon_relic', flavor: 'It has no clapper. The dead hear it anyway.' },
  { defId: 'r_ashencrown', name: 'Shard of the Ashen Crown', slot: 'relic', icon: 'icon_relic', flavor: 'A piece of the thing that burned the sky.' },
];

export const CONSUMABLES: GearDef[] = [
  { defId: 'c_emberdraught', name: 'Ember Draught', slot: 'consumable', icon: 'icon_potion', flavor: 'Restores 45 vitality. Tastes of hot iron.' },
  { defId: 'c_moorbrew', name: 'Moorbrew', slot: 'consumable', icon: 'icon_potion', flavor: 'Restores 90 vitality slowly. Bitter.' },
  { defId: 'c_soulsalt', name: 'Soul Salt', slot: 'consumable', icon: 'icon_soul', flavor: 'Steadies a carried soul. Reduces carry burden for 60s.' },
];

export const MATERIALS: GearDef[] = [
  { defId: 'm_ashglass', name: 'Ashglass', slot: 'material', icon: 'icon_ember', flavor: 'Sand fused by the burning.' },
  { defId: 'm_boneshard', name: 'Bone Shard', slot: 'material', icon: 'icon_bone', flavor: 'Old. Clean. Light.' },
  { defId: 'm_emberore', name: 'Ember Ore', slot: 'material', icon: 'icon_ember', flavor: 'Warm to the touch even in frost.' },
];

interface AffixDef {
  id: string;
  label: string;
  stat: StatKey;
  min: number;
  max: number;
  mult?: boolean;
  slots: ItemSlot[];
  tierMin?: number;
}

export const AFFIX_POOL: AffixDef[] = [
  { id: 'a_power', label: 'of Force', stat: 'power', min: 3, max: 22, slots: ['weapon', 'charm', 'relic'] },
  { id: 'a_guard', label: 'of Warding', stat: 'guard', min: 2, max: 18, slots: ['cloak', 'charm', 'relic'] },
  { id: 'a_swift', label: 'of Swiftness', stat: 'swiftness', min: 2, max: 15, slots: ['cloak', 'charm'] },
  { id: 'a_vigor', label: 'of Vigour', stat: 'vigor', min: 6, max: 42, slots: ['cloak', 'charm', 'relic'] },
  { id: 'a_focus', label: 'of Focus', stat: 'focus', min: 3, max: 20, slots: ['charm', 'relic'] },
  { id: 'a_crit', label: 'of the Keen Eye', stat: 'critChance', min: 0.02, max: 0.13, slots: ['weapon', 'charm'] },
  { id: 'a_critmult', label: 'of Butchery', stat: 'critMult', min: 0.15, max: 0.85, slots: ['weapon', 'relic'], tierMin: 2 },
  { id: 'a_ember', label: 'of the Ember', stat: 'emberDmg', min: 3, max: 26, slots: ['weapon', 'charm', 'relic'] },
  { id: 'a_frost', label: 'of Hoarfrost', stat: 'frostDmg', min: 3, max: 24, slots: ['weapon', 'charm', 'relic'] },
  { id: 'a_rot', label: 'of the Mire', stat: 'rotDmg', min: 4, max: 28, slots: ['weapon', 'charm', 'relic'] },
  { id: 'a_leech', label: 'of the Leech', stat: 'lifesteal', min: 0.01, max: 0.07, slots: ['weapon', 'relic'], tierMin: 2 },
  { id: 'a_move', label: 'of the Long Road', stat: 'moveSpeed', min: 0.03, max: 0.17, slots: ['cloak'] },
  { id: 'a_stam', label: 'of Endurance', stat: 'staminaRegen', min: 0.06, max: 0.4, slots: ['cloak', 'charm'] },
  { id: 'a_disc', label: 'of Seeking', stat: 'discovery', min: 0.04, max: 0.3, slots: ['cloak', 'relic'] },
];

const PREFIX = [
  'Ashen', 'Grey', 'Hollow', 'Bitter', 'Wind-cut', 'Cairn', 'Moorborn', 'Slagged',
  'Rimed', 'Peat-black', 'Warden', 'Barrow', 'Sundered', 'Long', 'Quiet',
];

export function rollRarity(rng: RNG, tier: number, luck = 0): Rarity {
  const keys = Object.keys(RARITY_WEIGHT) as Rarity[];
  const weights = keys.map((k) => {
    let w = RARITY_WEIGHT[k];
    if (k !== 'common') w *= 1 + tier * 0.22 + luck;
    return w;
  });
  return rng.weighted(keys, weights);
}

export function rollAffixes(rng: RNG, slot: ItemSlot, rarity: Rarity, tier: number): Affix[] {
  const n = RARITY_AFFIXES[rarity];
  const pool = AFFIX_POOL.filter(
    (a) => a.slots.includes(slot) && (a.tierMin ?? 0) <= tier,
  );
  if (pool.length === 0) return [];
  const picked: Affix[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n && used.size < pool.length; i++) {
    let def = rng.pick(pool);
    let guard = 0;
    while (used.has(def.id) && guard++ < 24) def = rng.pick(pool);
    if (used.has(def.id)) break;
    used.add(def.id);
    const t = rng.next();
    const scale = (0.45 + 0.55 * t) * RARITY_MULT[rarity] * (1 + tier * 0.14);
    const raw = def.min + (def.max - def.min) * t;
    const value = def.max <= 1 ? +(raw * scale).toFixed(3) : Math.round(raw * scale);
    picked.push({ id: def.id, label: def.label, stat: def.stat, value });
  }
  return picked;
}

let uidCounter = 0;
export function makeUid(rng: RNG): string {
  uidCounter++;
  return `i${Math.floor(rng.next() * 1e9).toString(36)}${uidCounter.toString(36)}`;
}

export function rollWeapon(rng: RNG, tier: number, luck = 0): Item {
  const def = rng.pick(WEAPONS);
  const rarity = rollRarity(rng, tier, luck);
  const mult = RARITY_MULT[rarity] * (1 + tier * 0.19);
  const prefix = rarity === 'common' ? '' : `${rng.pick(PREFIX)} `;
  const affixes = rollAffixes(rng, 'weapon', rarity, tier);
  const suffix = affixes[0] && rarity !== 'common' ? ` ${affixes[0].label}` : '';
  return {
    uid: makeUid(rng),
    defId: def.defId,
    name: `${prefix}${def.name}${suffix}`,
    slot: 'weapon',
    rarity,
    icon: def.icon,
    tier,
    affixes,
    flavor: def.flavor,
    weapon: {
      ...def.profile,
      baseDamage: Math.round(def.profile.baseDamage * mult),
    },
  };
}

export function rollGear(rng: RNG, tier: number, luck = 0, slot?: ItemSlot): Item {
  const pool = slot ? GEAR.filter((g) => g.slot === slot) : GEAR;
  const def = rng.pick(pool.length ? pool : GEAR);
  const rarity = rollRarity(rng, tier, luck);
  const affixes = rollAffixes(rng, def.slot, rarity, tier);
  const prefix = rarity === 'common' ? '' : `${rng.pick(PREFIX)} `;
  const suffix = affixes[0] && rarity !== 'common' ? ` ${affixes[0].label}` : '';
  return {
    uid: makeUid(rng),
    defId: def.defId,
    name: `${prefix}${def.name}${suffix}`,
    slot: def.slot,
    rarity,
    icon: def.icon,
    tier,
    affixes,
    flavor: def.flavor,
  };
}

export function makeConsumable(rng: RNG, defId: string, count = 1): Item {
  const def = CONSUMABLES.find((c) => c.defId === defId) ?? CONSUMABLES[0];
  if (!def) throw new Error('no consumables defined');
  return {
    uid: makeUid(rng), defId: def.defId, name: def.name, slot: 'consumable',
    rarity: 'common', icon: def.icon, tier: 1, affixes: [], flavor: def.flavor,
    stackable: true, count,
  };
}

export function makeMaterial(rng: RNG, defId: string, count = 1): Item {
  const def = MATERIALS.find((m) => m.defId === defId) ?? MATERIALS[0];
  if (!def) throw new Error('no materials defined');
  return {
    uid: makeUid(rng), defId: def.defId, name: def.name, slot: 'material',
    rarity: 'common', icon: def.icon, tier: 1, affixes: [], flavor: def.flavor,
    stackable: true, count,
  };
}

/** Full loot roll for a dead enemy. Returns 0..3 items. */
export function rollLoot(rng: RNG, tier: number, elite: boolean, boss: boolean, luck = 0): Item[] {
  const out: Item[] = [];
  const rolls = boss ? 4 : elite ? 2 : 1;
  for (let i = 0; i < rolls; i++) {
    const r = rng.next();
    if (r < 0.2 + luck * 0.2 || boss) {
      out.push(rng.bool(0.45) ? rollWeapon(rng, tier, luck) : rollGear(rng, tier, luck));
    } else if (r < 0.42) {
      out.push(makeConsumable(rng, rng.pick(CONSUMABLES).defId, 1));
    } else if (r < 0.58) {
      out.push(makeMaterial(rng, rng.pick(MATERIALS).defId, rng.int(1, 3)));
    }
  }
  return out;
}
