/** Ashenreach - shared types. No `any`. */

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type BiomeId = 'ashflats' | 'moorland' | 'pinewood' | 'crags' | 'mire' | 'scorch';

export type PoiKind =
  | 'cairn' | 'ruin' | 'camp' | 'shrine' | 'barrow' | 'watchtower' | 'hollow' | 'grove';

export type Rarity = 'common' | 'fine' | 'rare' | 'relic' | 'mythic';
export type DamageType = 'physical' | 'ember' | 'frost' | 'rot';
export type ItemSlot = 'weapon' | 'charm' | 'cloak' | 'relic' | 'consumable' | 'material';

export type StatKey =
  | 'power' | 'guard' | 'swiftness' | 'vigor' | 'focus'
  | 'critChance' | 'critMult' | 'emberDmg' | 'frostDmg' | 'rotDmg'
  | 'lifesteal' | 'moveSpeed' | 'staminaRegen' | 'discovery';

export type Stats = Record<StatKey, number>;

export interface Affix {
  id: string;
  label: string;
  stat: StatKey;
  value: number;
  mult?: boolean;
}

export interface WeaponProfile {
  archetype: 'blade' | 'maul' | 'spear' | 'censer';
  baseDamage: number;
  swingTime: number;
  reach: number;
  arc: number;
  stagger: number;
  damageType: DamageType;
}

export interface Item {
  uid: string;
  defId: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  icon: string;
  tier: number;
  affixes: Affix[];
  flavor: string;
  stackable?: boolean;
  count?: number;
  weapon?: WeaponProfile;
}

export interface Reward {
  kind: 'item' | 'xp' | 'embers' | 'skillpoint' | 'codex';
  amount?: number;
  itemDefId?: string;
  codexId?: string;
}

export interface RunStats {
  kills: number;
  deaths: number;
  soulsCarried: number;
  soulsBanked: number;
  distance: number;
  timeMs: number;
  bestCombo: number;
  poisFound: number;
  questsDone: number;
  embertideLevel: number;
  bossKilled: boolean;
  seed: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  kind: 'husk' | 'wight' | 'hound' | 'warden' | 'colossus';
  tier: number;
  hp: number;
  damage: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  xp: number;
  scale: number;
  elite?: boolean;
  boss?: boolean;
  ability?: 'charge' | 'volley' | 'summon' | 'slam' | 'blink';
  biomes: BiomeId[];
  lore: string;
}

export interface QuestStep {
  text: string;
  kind: 'kill' | 'reach' | 'collect' | 'carry' | 'survive' | 'discover';
  target: string;
  count: number;
}

export interface QuestDef {
  id: string;
  title: string;
  giver: string;
  summary: string;
  steps: QuestStep[];
  rewards: Reward[];
  unlocks?: string[];
  chain?: string;
  act: 1 | 2 | 3;
}

export interface SkillDef {
  id: string;
  name: string;
  branch: 'warden' | 'ember' | 'wake';
  tier: number;
  desc: string;
  requires?: string;
  apply: Partial<Record<StatKey, number>>;
  grants?: 'dash-burn' | 'soul-nova' | 'second-wind' | 'ash-veil' | 'cairn-echo';
}

export interface CodexEntry {
  id: string;
  category: 'bestiary' | 'places' | 'relics' | 'lore';
  title: string;
  body: string;
}

export interface PoiDef {
  id: string;
  kind: PoiKind;
  name: string;
  pos: Vec3;
  biome: BiomeId;
  radius: number;
  tier: number;
  lore?: string;
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  screenShake: number;
  difficulty: 'wanderer' | 'warden' | 'ashborn';
  colorblindMarkers: boolean;
  subtitles: boolean;
  reduceFlashing: boolean;
  invertY: boolean;
  sensitivity: number;
  quality: 'low' | 'medium' | 'high';
  keybinds: Record<string, string>;
}

export interface SaveData {
  version: number;
  seed: string;
  createdAt: number;
  updatedAt: number;
  daily: boolean;
  name: string;
  level: number;
  xp: number;
  embers: number;
  skillPoints: number;
  learned: string[];
  equipment: Partial<Record<ItemSlot, Item | null>>;
  bag: Item[];
  pos: Vec3;
  hp: number;
  embertide: number;
  litCairns: string[];
  // Legacy nested shape kept for migration compatibility.
  player: {
    name: string;
    level: number;
    xp: number;
    embers: number;
    skillPoints: number;
    skills: string[];
    pos: Vec3;
    hp: number;
    equipped: Partial<Record<ItemSlot, Item | null>>;
    bag: Item[];
  };
  quests: { active: string[]; done: string[]; progress: Record<string, number[]> };
  discovered: string[];
  codex: string[];
  stats: RunStats;
  settings: Settings;
}

export type GameState =
  | 'boot' | 'menu' | 'creating' | 'playing' | 'paused'
  | 'dead' | 'victory' | 'map' | 'inventory' | 'skills' | 'codex';
