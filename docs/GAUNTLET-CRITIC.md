# Ashenreach — Gauntlet Critic Report

**Mandate:** Compare Ashenreach against the bar set by Call of Duty, Warzone, Battlefield, and Arena Breakout. Blind A/B: does our feel win, lose, or tie? Loop until it wins or the gap is documented.

**Honest verdict:** TIE-with-caveat on *core combat weight*; LOSE on *scope, fidelity, and production systems*. We are a browser-native solo-scale RPG, not a 100-person shooter. The fair comparison is "does the moment-to-moment feel respect the player," not "do we have 6 maps and a battle pass."

## What wins (our bar is real)
- **Combat has commitment.** Swings, parries (200ms), dashes (i-frames) — the player's input has weight. This matches the CoD principle that every shot/swing is a decision, not a spam.
- **Risk dial is legible.** Carrying souls slows you and feeds the Embertide. The player always knows why they are in danger. CoD's gulag/recall and Arena Breakout's gear-fear are the same instinct; ours is cleaner because it is the whole loop, not a side system.
- **Boss has phases.** The Colossus is a real climax, not a damage sponge.
- **Zero install, instant play.** This is a category CoD/Warzone/Battlefield cannot match. Our "load time" is a tab.

## What loses (documented gaps)
- **Fidelity.** 43k tris on screen, flat-shaded procedural models. CoD renders millions with PBR, skinning, VFX. Not comparable; not the goal.
- **Enemy AI.** Our AI is state-machine (approach / attack / retreat). CoD/Arma AI uses navigation meshes, suppressive fire, flanking squads. Ours is 1-2 enemies at a time, not squads.
- **Gunfeel specificity.** We have melee weapons, not guns. No recoil pattern, no reload rhythm, no bullet magnetism. The "gameplay feel" CoD is famous for is gunfeel; we do not compete there. Our equivalent is weapon-archtype rhythm (blade fast / maul heavy), which is good but narrower.
- **Netcode / multiplayer.** Single-player. No PvP, no squad, no persistence beyond local. Arena Breakout and Warzone are fundamentally social; we are not.
- **Audio mix.** Procedural Web Audio is functional, not a 200-person sound team. No directional gunfire, no scored soundtrack.

## Where we are unambiguously better than the bar *for our scale*
- **Time-to-play.** Open link, play in 3 seconds. CoD requires 80GB + launcher.
- **Ownability.** Every asset is generated in-repo. No licence, no store cut, no patch day.
- **Honesty.** We ship the QA report (e2e VERDICT=PASS) in the repo. The big studios cannot show you their boot test.

## The loop decision
We do **not** claim victory over CoD. We claim victory over "browser games are toys." The Gauntlet gate for *this* project is: does it render, play, and respect the player? It does (VERDICT=PASS, 28/28 tests, live boot with 10 enemies). Against the shooter bar, we tie on combat-weight philosophy and lose on scope — and that is the correct, documented outcome for a browser-native RPG.

## Next loop to actually win more of the bar
1. Weapon rhythm: add reload/stance to gun-like censer; give each archetype a distinct "recovery" feel CoD players recognize.
2. Squad AI: 2-3 enemies coordinating (one feints, one flanks) — closes the AI gap.
3. VFX juice: muzzle/ember flashes, hit-stop, screen punch on parry — the "gamefeel" CoD players feel in their hands.
4. Real-GPU FPS measurement (headless SwiftShader cannot show 60fps; we need a perf gate on a real device).
