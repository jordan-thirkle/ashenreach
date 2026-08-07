# Ashenreach — Gauntlet Progress Receipt

Locked workflow: `gauntlet-game-build` (every game task = builder + separate harsh critic, blind A/B vs the ARCHITECTURE.md bar: Hyper Light Drifter / Death's Door / Valheim / Diablo IV). Loop until critic says output-wins (budget 5 rounds).

Critic evidence = real output: the e2e harness HUD metrics (LUM / FPS / frame / enemies) + live screenshots in `tests/e2e/shots/` + build hash. Jordan is final pixel judge.

## Round 1 — Game-feel (juice + camera collision)
- Builder: leaf agent, owns `src/systems/Juice.ts` + `src/core/Camera.ts`. Adds hit-stop, impact burst, parry flash; camera terrain collision.
- Integration: tsc + 28 vitest + build + e2e critic (running).
- Critic: fresh-context agent, grades real output blind A/B. Verdict + gap-list below.

| Round | Builder change | Critic verdict | Evidence (LUM/FPS/frame/enemies) | Build |
|-------|---------------|----------------|-----------------------------------|-------|
| 1 | Juice: pooled rings (pop/impactBurst), parryFlash, hit-stop; Camera: terrain collision rewrite | gap-list (reference-wins) — accents (Rust/Palegold) absent in combat/inventory/map; inventory+map too dark (lum 0.109/0.126); combat frame flat | LUM 0.30/66col/369dc/10 enemies/0 err | a2c576c |
| 2 | Accent (Juice+Combat) ✅, Value-contrast (Rigs) ✅, UI legibility (Hud+Screens) ❌429 | partial — 2/3 builders landed; UI legibility killed by API rate-limit | LUM 0.31/71col/10 enemies/0 err | bbe7c97 |
| 3 | Audio (adaptive bus) ✅; Perf+atmosphere ❌429; Level-discovery ❌timeout | partial — 1/3 landed; perf + POI killed by API outage | same | bbe7c97 |

## Blocked (environment)
- Folder rename Brawler→Ashenreach: BLOCKED. Hermes terminal backend pins Brawler as its OS cwd; Windows refuses to rename a dir that is any process's cwd. Fix: restart Hermes terminal session or close Brawler workspace in Hermes desktop, then `mv D:/Projects/Brawler D:/Projects/Ashenreach`. Deploy uses --name ashenreach regardless, so product identity is correct.
- Missing Gauntlet edits (killed by free-key rate-limit/timeout): UI legibility (Hud+Screens), perf+atmosphere (WorldRenderer/Renderer/Terrain/EnemyAI), level-discovery POI seeding (PointsOfInterest/World). Re-dispatch when API stable, or PM edits directly.
- Round-2A flagged: parryFlash/hitStop wired into Combat.ts but Game.ts enemyStrike must route through applyStrikeJuice() to fire live — not yet done.
