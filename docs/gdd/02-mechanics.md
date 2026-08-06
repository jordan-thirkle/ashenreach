# 02 — Mechanics

## Core loop
1. Spawn at a cairn on the highland.
2. Explore; fight husks, wights, hounds to reach soul pickups.
3. Pick up a soul (carry capacity rises with count).
4. Reach the next cairn; **bank** souls for score + safety, or **carry on**.
5. The Embertide rises with time carried. Bank to reset it.
6. Die or defeat the Colossus -> run ends, score submitted.

## Movement
- Walk/run (stamina-limited sprint), dash (i-frames, cooldown 0.8s).
- Jump is contextual (ledges/climb). No fall damage below 6m.
- Carry weight slows move speed: `speedMult = clamp(1 - souls*0.03, 0.55, 1)`.

## Carry system
- Each soul adds 1 to carry count and a small `embertideRate` bump.
- At 0 souls, Embertide decays. At 10+, it accelerates.
- Carrying N souls at death loses them (no score); banking locks them in.

## Interaction
- `E` / tap: pick up soul, light cairn, open chest, talk to shade.
- Cairn lighting is permanent for the session and reveals nearby POIs.

## Time budget
Target run: 10–20 min. Soft cap at 25 min (Embertide maxes).
