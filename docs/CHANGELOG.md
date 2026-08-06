# Changelog

## [1.0.0] — First playable
- Open-world action RPG loop: explore, fight, carry souls, bank at cairns.
- 4 weapon archetypes (blade, maul, spear, censer) with distinct feel.
- Embertide difficulty system (rises with souls carried + time).
- 3 enemy tiers + Colossus boss (3 phases).
- Procedural highland: 5 biomes, seeded generation, chunked streaming.
- Cairn banking, quests, skill points, codex.
- Local leaderboard + daily seeds.
- Asset viewer (`/viewer.html`) over all procedural models.
- Procedural asset pipeline: 22 GLBs, 10 PBR texture sets, 16 icons.
- Marketing site + press kit + GDD.
- QA: 28 unit tests, e2e boot/critic (VERDICT=PASS).

## Known issues
- Headless SwiftShader FPS is not representative; real-GPU perf unmeasured in CI.
- Touch auto-aim is conservative by design.
