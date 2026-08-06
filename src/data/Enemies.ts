import type { EnemyDef } from '../core/Types';

export const ENEMIES: EnemyDef[] = [
  {
    id: 'e_husk', name: 'Ash Husk', kind: 'husk', tier: 1,
    hp: 46, damage: 9, speed: 2.4, aggroRange: 18, attackRange: 2.2,
    attackCooldown: 1.6, xp: 12, scale: 1.0,
    biomes: ['ashflats', 'moorland', 'pinewood'],
    lore: 'A body that kept walking because nobody told it the war ended.',
  },
  {
    id: 'e_husk_burnt', name: 'Burnt Husk', kind: 'husk', tier: 2,
    hp: 78, damage: 14, speed: 2.7, aggroRange: 20, attackRange: 2.3,
    attackCooldown: 1.4, xp: 22, scale: 1.05, ability: 'charge',
    biomes: ['ashflats', 'scorch', 'crags'],
    lore: 'Closer to the burning. Its ribs still glow when it runs.',
  },
  {
    id: 'e_hound', name: 'Ash Hound', kind: 'hound', tier: 1,
    hp: 34, damage: 11, speed: 5.4, aggroRange: 26, attackRange: 1.9,
    attackCooldown: 1.1, xp: 16, scale: 0.8, ability: 'charge',
    biomes: ['moorland', 'pinewood', 'crags', 'ashflats'],
    lore: 'They hunt in threes. You will usually meet the third one last.',
  },
  {
    id: 'e_hound_rot', name: 'Mire Hound', kind: 'hound', tier: 3,
    hp: 66, damage: 18, speed: 6.0, aggroRange: 30, attackRange: 2.0,
    attackCooldown: 0.95, xp: 34, scale: 0.9, ability: 'charge',
    biomes: ['mire', 'pinewood'],
    lore: 'Bog water instead of blood. It does not tire.',
  },
  {
    id: 'e_wight', name: 'Pale Wight', kind: 'wight', tier: 2,
    hp: 62, damage: 16, speed: 2.0, aggroRange: 24, attackRange: 14,
    attackCooldown: 2.4, xp: 28, scale: 1.1, ability: 'volley',
    biomes: ['moorland', 'pinewood', 'mire', 'crags'],
    lore: 'It throws pieces of itself. It has a great many pieces.',
  },
  {
    id: 'e_wight_ember', name: 'Ember Wight', kind: 'wight', tier: 3,
    hp: 92, damage: 24, speed: 2.2, aggroRange: 28, attackRange: 17,
    attackCooldown: 2.1, xp: 46, scale: 1.15, ability: 'volley',
    biomes: ['scorch', 'crags', 'ashflats'],
    lore: 'Its throwing arm never cooled down.',
  },
  {
    id: 'e_warden_fallen', name: 'Fallen Warden', kind: 'warden', tier: 3,
    hp: 145, damage: 27, speed: 3.4, aggroRange: 26, attackRange: 3.0,
    attackCooldown: 1.5, xp: 78, scale: 1.15, elite: true, ability: 'blink',
    biomes: ['crags', 'pinewood', 'scorch', 'mire'],
    lore: 'It still carries a soul. It has forgotten which cairn.',
  },
  {
    id: 'e_warden_grave', name: 'Gravebound Warden', kind: 'warden', tier: 4,
    hp: 240, damage: 38, speed: 3.6, aggroRange: 30, attackRange: 3.2,
    attackCooldown: 1.3, xp: 140, scale: 1.25, elite: true, ability: 'summon',
    biomes: ['scorch', 'crags'],
    lore: 'It buried itself and then changed its mind.',
  },
  {
    id: 'e_colossus', name: 'The Ashen Crown', kind: 'colossus', tier: 5,
    hp: 2600, damage: 52, speed: 2.6, aggroRange: 60, attackRange: 6.5,
    attackCooldown: 2.0, xp: 2400, scale: 3.6, boss: true, ability: 'slam',
    biomes: ['scorch'],
    lore: 'The thing that burned the sky, still standing in its own crater.',
  },
];

export const ENEMY_BY_ID: Record<string, EnemyDef> = Object.fromEntries(
  ENEMIES.map((e) => [e.id, e]),
);

export function enemiesForBiome(biome: string, maxTier: number): EnemyDef[] {
  return ENEMIES.filter(
    (e) => !e.boss && e.biomes.includes(biome as EnemyDef['biomes'][number]) && e.tier <= maxTier,
  );
}
