# 03 — Systems

## Combat
- Light/heavy attack, parry (200ms window), dash (i-frames).
- Weapon archetypes differ in reach/swing-time/stagger:
  - Blade: reach 2.4, swing 0.4s, low stagger.
  - Maul: reach 1.8, swing 0.7s, high stagger.
  - Spear: reach 3.0, swing 0.5s, mid stagger.
  - Censer: reach 2.0, swing 0.55s, ember DoT.
- Combo tier escalates damage every 5 hits (max x1.5 at 40).
- Damage formula: `dmg = base * (1 + comboMult) * (1 + emberMod) * difficultyMult * crit?1.6:1`.

## Embertide
- `embertideLevel` 0..10. Rises with souls carried and time.
- Effects: +enemy damage (level*8%), +spawn density, ambient darkening, audio low-pass.
- Banking all souls resets to 0. Partial bank reduces proportionally.

## Loot & affixes
- Enemy/world drops roll rarity: common > fine > ethereal > relic.
- Affixes: +baseDamage, +crit, +soulXp, +moveSpeed, +emberResist.
- Weapons roll 0–3 affixes by rarity.

## Quests
- 3 active at once. Types: collect souls, carry to cairn, slay elite, light cairns.
- Rewards: XP -> level -> skill point; embers (currency); codex entries.

## Cairns (safe points)
- Bank souls, restore HP to full, save checkpoint, reveal map.
- Lighting a new cairn grants a permanent small score multiplier.
