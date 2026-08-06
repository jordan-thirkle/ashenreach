# 04 — World

## Biomes (5)
1. Peat lowlands — soft ground, husks, fog.
2. Moss slopes — incline, wights, sightlines.
3. Slate ruins — cover, hounds, verticality.
4. Mire hollows — slow terrain, elites, ambush.
5. Embertide crest — ash storms, Colossus arena.

## Procedural generation
- Seeded value-noise heightfield, slope-based biome blend.
- Water at low altitude; impassable above 55° slope.
- POIs scattered: cairns (every 120–200m), chests, shade encounters, ruin arches.

## POI rules
- First cairn always at spawn.
- Next cairn placed in a walkable ring, biased toward unexplored biome.
- Boss arena spawns after the player has banked >= 3 souls OR carried >= 10.

## World streaming
- Chunked terrain (64m cells). Only nearby cells simulate enemies.
- Draw distance tuned to 220m desktop / 140m mobile.

## Scale
- Human ~1.8m. Warden cloak drape ~0.4m. Colossus ~3.2m.
