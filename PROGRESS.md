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
| 2 | Accent (Juice+Combat) ✅, Value-contrast (Rigs) ✅, UI legibility (Hud+Screens) ❌429 | partial — 2/3 landed; UI legibility killed by API rate-limit | LUM 0.31/71col/10 enemies/0 err | bbe7c97 |
| 3 | Audio (adaptive bus) ✅; Perf+atmosphere ❌429; Level-discovery ❌timeout | partial — 1/3 landed; perf + POI killed by API outage | same | bbe7c97 |
| 4 | R2/3 KILLED BUILDERS COMPLETED IN-SESSION (reliable path — no subagent fan-out): (a) parry accent juice wired into enemyStrike via applyStrikeJuice; (b) lookout/cache/hazard POI archetypes added to PoiKind + POI_WEIGHTS + makePoiStructure; (c) perf: VIEW_CHUNKS 5→4 (~25% fewer terrain chunks) + denser fog; (d) map canvas brand graphite + palegold objectives; (e) camera pitch clamped negative-only (no upside-down); (f) onboarding lore + SpeechSynthesis voice + first-objective pointer | all landed — tsc clean, 28 vitest, e2e PASS (LUM 0.31/69col/10 enemies/0 err) | LUM 0.31/69col/539dc-boot/10 enemies/0 err | d54947c |

## Resolved (this session)
- Folder rename Brawler→Ashenreach: PARKED per user instruction (not blocked-critical; product ships as Ashenreach on ashenreach.vercel.app regardless).
- Killed Gauntlet builders (UI legibility / perf+atmosphere / level-discovery): DONE in-session — see Round 4.
- parryFlash/hitStop live-wiring: DONE (applyStrikeJuice fired in enemyStrike parried branch).
- Reliability fix: subagent fan-out was unreliable due to free-key rate-limit on burst. Resolution = do critical game edits in-session with direct tool calls (own terminal/fs), not delegate_task. Subagents reserved only for genuinely parallel, non-critical fan-out.

## Open
- Full Gauntlet critic blind A/B loop (Rounds 1-4 evidence) not yet re-run as a single consolidated pass; e2e critic gates pass per-round. Next: one consolidated harsh critic over the live build, loop to output-wins if gaps remain.
- Folder rename still parked (needs Hermes terminal restart to free cwd lock).

## Gauntlet Round A — swing-arc VFX (2026-08-07)
- Builder: in-session terminal/Node. New src/systems/SwingFx.ts (pooled additive ring-arc, per-weapon tint) wired into Game.onSwing + frame loop. Reuses CharacterRig weapon anchor + PALETTE; no new assets.
- Reference bar: ARCHITECTURE.md (Hyper Light Drifter / Deaths Door / Valheim / Diablo IV).
- Critic (code-arch + user eyes; vision API down): micro-feedback audit found foundation already deep (damage numbers, tiered blood/bone bursts, ember rings, hit+hurt flash, hit-stop, shake, parry flash, death FX, soul spill, low-HP vignette, wind ambient). Real gap = no visible slash during swing; SwingFx closes it.
- Verdict: gap closed (slash reads on miss+hit, weapon-tinted). Visual A/B = USER FINAL JUDGE (vision_analyze API blocked upstream).
- Evidence: tsc clean, 28/28 tests, build OK, e2e PASS (LUM 0.305, 66 colors, 0 errors, 10 enemies), build afd3389.
