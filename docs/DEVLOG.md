# Ashenreach — Build Dev Log

> Every commit, from the first prompt to the live game. Transparent, including the parts that failed.

_Generated 2026-08-07 from `docs/devlog-data.json`. This document is the canonical mirror of the live [dev-log page](https://ashenreach.vercel.app/devlog) — both are generated from the same source so they always match._

By JTT builds in the open. Below is every commit across the lineage that became Ashenreach, from the very first prompt to the live game — including the parts that failed. No curation, no spin.

## Repositories

- **Driftrun (prototype)** — Unpublished prototype — local only, superseded by VANGUARD. _unpublished (local only)_
- **VANGUARD** — Shipped — 40 commits, archived as the foundation for Ashenreach. [https://github.com/jordan-thirkle/vanguard](https://github.com/jordan-thirkle/vanguard)
- **Ashenreach** — Live — https://ashenreach.vercel.app. [https://github.com/jordan-thirkle/ashenreach](https://github.com/jordan-thirkle/ashenreach)

**63 commits** across **3 phases**. Each phase below is a contiguous slice of real git history.

## Phase 0 — The first prompt: Driftrun

_2026-08-05 · Driftrun (prototype)_

The very first instruction was to build a game with Genex in plain three.js. That produced Driftrun — a neon canyon hover racer — as a single genesis commit. It proved the pipeline could stand up a playable world, but the brief moved on before it was sliced into reviewable history. It is kept here as the honest origin point; it has no remote and was superseded by VANGUARD.

### What went wrong (documented, not hidden)

- Shipped as one large commit rather than sliced per-feature — the only repo in this lineage without a clean per-step history.
- Neon/synthwave aesthetic was the first thing Jordan rejected later ('proper AI slop'); the brand had not yet been defined.

### Commits

| Commit | Date | Author | Change |
| --- | --- | --- | --- |
| a287ff0 | 2026-08-05 | agent | Driftrun v1: neon canyon hover racer |

---

## Phase 1 — VANGUARD: the 30-wave build

_2026-08-05 → 2026-08-06 · VANGUARD_

VANGUARD is the game that became the studio's working method: build in named 'Waves', each Wave a single reviewable unit, each critic round a named follow-through. The first deploy did NOT pass the bar — Jordan loaded in to LUM:0.000, a watchdog hang, enemies that never shot, and two fake achievements we had shipped by mistake. Every one of those became a named Wave fix. We did not claim 'done' until the game actually rendered and played.

### What went wrong (documented, not hidden)

- First deploy rendered black on Genex (LUM:0.000) — boot threw before WebGL; fixed by rebuilding the splash/loader (Wave 3).
- Watchdog: a frame took >1s — the renderer had hung; traced through the critic rounds.
- Enemies 'never shoot' — fixed in Wave 6 (spawn placement, hunt activation, LOS).
- Two fake achievements were shipped, then removed in Wave 4 fix set.
- Stat bars were inverted (shorter = worse) — fixed in Wave 2 fix (invert reload/ADS bars).
- loaderPlan(9) did not match 9 loaderStep calls — fixed in Wave 3 fix (clean stagger indices).

### Commits

| Commit | Date | Author | Change |
| --- | --- | --- | --- |
| [3afd6be](https://github.com/jordan-thirkle/vanguard/commit/3afd6be) | 2026-08-05 | Rune | Wave 1: progression core — XP/levels, level-gated unlocks, guest+account auth, achievements, stats, attachment customization, gun-stats panel, post-match progression readout, account screen |
| [b1f6b17](https://github.com/jordan-thirkle/vanguard/commit/b1f6b17) | 2026-08-05 | Rune | Wave 2: loadout creator (Primary/Secondary/Perk1-3/Lethal/Tactical/Operator) + live gun-stats panel + attachment picker + Operators screen with level-gated roster |
| [533faca](https://github.com/jordan-thirkle/vanguard/commit/533faca) | 2026-08-05 | Rune | Wave 3 design contract: exact loader/online/achievements/leaderboard/lobby hooks for builder |
| [1c65b05](https://github.com/jordan-thirkle/vanguard/commit/1c65b05) | 2026-08-05 | Rune | Wave 2 fix: invert reload/ADS stat bars (shorter=better) + refresh operators hero on loadout change |
| [7649037](https://github.com/jordan-thirkle/vanguard/commit/7649037) | 2026-08-05 | Rune | Wave 2 fix: dispatch vanguard:loadout-changed from loadout equip/attachment + guard operators listener (closes stale-hero bug) |
| [14f563d](https://github.com/jordan-thirkle/vanguard/commit/14f563d) | 2026-08-05 | By JTT | Add CI build gate, README, and Gauntlet PROGRESS.md audit log |
| [573f6f9](https://github.com/jordan-thirkle/vanguard/commit/573f6f9) | 2026-08-05 | Rune | Wave 3: branded splash/loader (real progress + build tag), home online count, achievements screen, leaderboard, lobby chat |
| [370bf4d](https://github.com/jordan-thirkle/vanguard/commit/370bf4d) | 2026-08-05 | Rune | Wave 3 fix: loaderPlan(9) matches 9 loaderStep calls + clean stagger indices (no collisions) |
| [0573f71](https://github.com/jordan-thirkle/vanguard/commit/0573f71) | 2026-08-05 | Rune | Wave 4 fix set: removed 2 fake achievements, per-life longestLife, auth-switch refresh, version.json BASE_URL fetch |
| [e57b01a](https://github.com/jordan-thirkle/vanguard/commit/e57b01a) | 2026-08-05 | By JTT | Wave 5: coastal flagship map, stance HUD, death report + killcam, asset library |
| [bb38b87](https://github.com/jordan-thirkle/vanguard/commit/bb38b87) | 2026-08-05 | By JTT | Wave 6: enemies fight back — spawn placement + hunt activation + LOS fix |
| [b62850b](https://github.com/jordan-thirkle/vanguard/commit/b62850b) | 2026-08-05 | By JTT | Wave 6b: ADS iron-sight alignment — red-dot sits dead on the crosshair |
| [51589e6](https://github.com/jordan-thirkle/vanguard/commit/51589e6) | 2026-08-05 | By JTT | Wave 7: 5 custom loadout slots (CoD classes) + ADS sight alignment |
| [edf27df](https://github.com/jordan-thirkle/vanguard/commit/edf27df) | 2026-08-06 | By JTT | Wave 8: live operator 3D preview + class-system transparency |
| [44719ad](https://github.com/jordan-thirkle/vanguard/commit/44719ad) | 2026-08-06 | By JTT | Wave 8b: operator preview hardened + operators screen restored |
| [f1f28e2](https://github.com/jordan-thirkle/vanguard/commit/f1f28e2) | 2026-08-06 | By JTT | Wave 9: procedural player footsteps (no credits) |
| [2d01ce2](https://github.com/jordan-thirkle/vanguard/commit/2d01ce2) | 2026-08-06 | By JTT | Wave 10: primary objective — clear the outpost + win condition |
| [1c6711d](https://github.com/jordan-thirkle/vanguard/commit/1c6711d) | 2026-08-06 | By JTT | Wave 11: enemy contact alert audio (procedural, no credits) |
| [8f0ce33](https://github.com/jordan-thirkle/vanguard/commit/8f0ce33) | 2026-08-06 | By JTT | Wave 12: enemies fire through cover — fix "they never shoot" |
| [1b6e8fb](https://github.com/jordan-thirkle/vanguard/commit/1b6e8fb) | 2026-08-06 | By JTT | Wave 13: gun at hip carries muzzle-down, never "points up" |
| [ece6b17](https://github.com/jordan-thirkle/vanguard/commit/ece6b17) | 2026-08-06 | By JTT | Wave 14: menu no longer overflows short windows |
| [b7457ef](https://github.com/jordan-thirkle/vanguard/commit/b7457ef) | 2026-08-06 | By JTT | DESIGN.md: build plan reflects reality (full working loop) |
| [b5225e1](https://github.com/jordan-thirkle/vanguard/commit/b5225e1) | 2026-08-06 | By JTT | Wave 15: live generated rifle replaces the placeholder box + free-asset lane opened |
| [ddd2b56](https://github.com/jordan-thirkle/vanguard/commit/ddd2b56) | 2026-08-06 | By JTT | Wave 16: in-hand gun matches your loadout (rifle vs SMG) + SMG asset wired |
| [ab8b5cf](https://github.com/jordan-thirkle/vanguard/commit/ab8b5cf) | 2026-08-06 | By JTT | Wave 17: per-weapon recoil personality — closes critic gap "9 skins on one gun" |
| [3718c02](https://github.com/jordan-thirkle/vanguard/commit/3718c02) | 2026-08-06 | By JTT | Wave 17b: per-weapon shot audio — SMG sharp/fast, DMR thumps deep/loud |
| [9f283aa](https://github.com/jordan-thirkle/vanguard/commit/9f283aa) | 2026-08-06 | By JTT | Wave 17c: kill-confirmation tone — every drop chimes |
| [ed063b5](https://github.com/jordan-thirkle/vanguard/commit/ed063b5) | 2026-08-06 | By JTT | Wave 18: real weapon damage bridge — DMR ≠ SMG per shot (critic round 2) |
| [d53f376](https://github.com/jordan-thirkle/vanguard/commit/d53f376) | 2026-08-06 | By JTT | Wave 19: enemy hit-flinch — hostiles stagger when shot (CoD hit-reaction) |
| [bf4f419](https://github.com/jordan-thirkle/vanguard/commit/bf4f419) | 2026-08-06 | By JTT | Wave 20: player screenshot fixes — reload anim, armed soldiers, SMG ADS |
| [4fa19fc](https://github.com/jordan-thirkle/vanguard/commit/4fa19fc) | 2026-08-06 | By JTT | Wave 21: deploy streak — the game's point (how far can you go) |
| [920e879](https://github.com/jordan-thirkle/vanguard/commit/920e879) | 2026-08-06 | By JTT | Wave 22: rigged soldiers carry rifles (silhouette armed + pose-rotated) |
| [4441e0b](https://github.com/jordan-thirkle/vanguard/commit/4441e0b) | 2026-08-06 | By JTT | Wave 23: zone damage actually applies + hit-stop weight (critic round 3) |
| [62ce6ef](https://github.com/jordan-thirkle/vanguard/commit/62ce6ef) | 2026-08-06 | By JTT | Wave 24: cover actually protects you + extraction phase (critic round 4) |
| [84620a9](https://github.com/jordan-thirkle/vanguard/commit/84620a9) | 2026-08-06 | By JTT | Wave 25: Asset Library live — 3D weapon gallery (visual asset viewer) |
| [400c221](https://github.com/jordan-thirkle/vanguard/commit/400c221) | 2026-08-06 | By JTT | Wave 26: incoming-fire feedback — wall impacts + bullet whiz (critic follow-through) |
| [059ddeb](https://github.com/jordan-thirkle/vanguard/commit/059ddeb) | 2026-08-06 | By JTT | Wave 27: custom marketing website — VANGUARD landing + press kit |
| [7b3a95f](https://github.com/jordan-thirkle/vanguard/commit/7b3a95f) | 2026-08-06 | By JTT | Wave 28: live HUD deploy-streak chip |
| [2fa73fe](https://github.com/jordan-thirkle/vanguard/commit/2fa73fe) | 2026-08-06 | By JTT | Wave 29: NavGrid A* wired in — enemies flank instead of grinding in walls |
| [43e519d](https://github.com/jordan-thirkle/vanguard/commit/43e519d) | 2026-08-06 | By JTT | Wave 30: remove wall-hack enemy marker — threat location is earned |

---

## Phase 2 — Ashenreach: the one-shot RPG

_2026-08-06 → 2026-08-07 · Ashenreach_

Ashenreach is the mature build: a complete open-world action RPG, generated from the highland up, with its own asset viewer, procedural assets, marketing site, GDD, and QA harness. It shipped as one large foundation commit, then was refined in transparent Tiers and Gauntlet rounds. The Gauntlet critic was honest: TIE-with-caveat on combat weight, LOSE on scope/fidelity vs. CoD-scale shooters. We documented the gap instead of hiding it — the gate for a browser-native RPG is 'does it render, play, and respect the player,' and it does (VERDICT=PASS, 28/28 tests, live boot).

### What went wrong (documented, not hidden)

- Gauntlet critic verdict: TIE/LOSE on shooter scope — documented, not claimed as a win.
- Off-theme models (duck, boombox) were added then dropped for brand cohesion (commit 6e4a2e7).
- Stray Poly Haven test artifacts committed then removed (commit 7e81879).
- Loading screen masked world build — fixed (commit 6e4a2e7).
- Camera pitch could flip upside-down — clamped (commit 06e2e08).

### Commits

| Commit | Date | Author | Change |
| --- | --- | --- | --- |
| [b194830](https://github.com/jordan-thirkle/ashenreach/commit/b194830) | 2026-08-06 | By JTT | Ashenreach: complete browser RPG — game, asset viewer, procedural assets, marketing site, GDD, QA harness; GitHub Apps + SEO setup |
| [a239395](https://github.com/jordan-thirkle/ashenreach/commit/a239395) | 2026-08-06 | By JTT | Tier 1 (multi-agent): free CC0 rigs in gameplay (Fox/CesiumMan ambient), glaive weapon archetype, 3 procedural audio cues (embertide swell, soul-bank chime, parry clang) |
| [d6d15d5](https://github.com/jordan-thirkle/ashenreach/commit/d6d15d5) | 2026-08-07 | By JTT | Tier 2 (multi-agent): Colossus 3-phase boss escalation, mobile joystick + safe-area polish, 2 new side quests (ashbridge, wakecall) + codex |
| [158b857](https://github.com/jordan-thirkle/ashenreach/commit/158b857) | 2026-08-07 | By JTT | Tier 3 (multi-agent): winter biome variant (Palette+Tterrain+WorldRenderer), relic inventory + equip HUD, localStorage score leaderboard. Fixed BiomeVariant literal-type errors. |
| [a2c576c](https://github.com/jordan-thirkle/ashenreach/commit/a2c576c) | 2026-08-07 | By JTT | Tier 4 (wiring): biome choice in run-start UI + Game/Terrain/WorldRenderer threading; relic HUD wired to equip/discard via syncRelicHud; T4-C score leaderboard already live via core/Save. Verified winter biome boots. |
| [bbe7c97](https://github.com/jordan-thirkle/ashenreach/commit/bbe7c97) | 2026-08-07 | Rune | SEO/AIO + Gauntlet R2/R3 partial: Vercel links, robots/sitemap/llms, JSON-LD, accent/audio/contrast |
| [e64eb9e](https://github.com/jordan-thirkle/ashenreach/commit/e64eb9e) | 2026-08-07 | Rune | Brand cohesion: map canvas graphite+palegold objectives, BRAND.md identity system |
| [06e2e08](https://github.com/jordan-thirkle/ashenreach/commit/06e2e08) | 2026-08-07 | Rune | Boss fixes: camera pitch clamp (no upside-down), onboarding lore+voice, palegold map, BRAND.md |
| [d54947c](https://github.com/jordan-thirkle/ashenreach/commit/d54947c) | 2026-08-07 | Rune | Gauntlet R2/3 completed in-session: parry accent juice wired, lookout/cache/hazard POIs, VIEW_CHUNKS perf, denser fog |
| [ecb8b6d](https://github.com/jordan-thirkle/ashenreach/commit/ecb8b6d) | 2026-08-07 | Rune | Movement feel: snappier accel/decel, footstep audio cadence + ash puff, camera dash lead |
| [aa869c3](https://github.com/jordan-thirkle/ashenreach/commit/aa869c3) | 2026-08-07 | Rune | Combat weight: hit-stop freeze on player weapon hits (55ms normal / 110ms crit) |
| [9cb4bab](https://github.com/jordan-thirkle/ashenreach/commit/9cb4bab) | 2026-08-07 | Rune | Boss escalation: adaptive music ramps with fight, phase-3 climax lore+voice, tension drop on victory |
| [cab6a8a](https://github.com/jordan-thirkle/ashenreach/commit/cab6a8a) | 2026-08-07 | Rune | Weapon feel: per-archetype hit-stop + screen shake (maul lands heavy, blade crisp) |
| [ddfb255](https://github.com/jordan-thirkle/ashenreach/commit/ddfb255) | 2026-08-07 | Rune | Enemy telegraph VFX: wind-up ember/rust glow so attacks read by sight, not just sound |
| [d151458](https://github.com/jordan-thirkle/ashenreach/commit/d151458) | 2026-08-07 | Rune | World density: roaming fox herd (free Khronos rigs) + higher foliage scatter |
| [45f8f58](https://github.com/jordan-thirkle/ashenreach/commit/45f8f58) | 2026-08-07 | Rune | Always-on objective banner (top-center, brand palegold) so direction is never lost |
| [afd3389](https://github.com/jordan-thirkle/ashenreach/commit/afd3389) | 2026-08-07 | Rune | Gauntlet Round A: weapon swing-arc VFX (pooled slash, per-weapon tint) |
| [c4dfffe](https://github.com/jordan-thirkle/ashenreach/commit/c4dfffe) | 2026-08-07 | Rune | PROGRESS.md: Gauntlet Round A receipt |
| [6e4a2e7](https://github.com/jordan-thirkle/ashenreach/commit/6e4a2e7) | 2026-08-07 | Rune | Fix: branded loading screen masks world build; drop off-theme duck/boombox models |
| [6f3bc5a](https://github.com/jordan-thirkle/ashenreach/commit/6f3bc5a) | 2026-08-07 | Rune | Visual critic round: branded menu backdrop, rim light for silhouette pop, exposure boost (local BLIP critic self-run) |
| [d175d22](https://github.com/jordan-thirkle/ashenreach/commit/d175d22) | 2026-08-07 | Rune | Leverage-everything round: CC0 ground texture + derived normal map (kills flat low-poly), swing-FX slash fix, neural-voice narration via edge-tts (replaces robotic SpeechSynthesis) |
| [7e81879](https://github.com/jordan-thirkle/ashenreach/commit/7e81879) | 2026-08-07 | Rune | chore: remove stray Poly Haven test artifacts |

---

## How to read this log

- **Waves / Tiers / Gauntlet rounds** are the studio's build units. Each is one reviewable slice, not a dump.
- **Critic rounds** are named follow-throughs where an automated harsh critic (blind A/B vs. CoD/Warzone/Battlefield/Arena Breakout) found a gap and we closed it in the next Wave.
- **Failures are kept on purpose.** If a deploy rendered black, an enemy never shot, or a critic returned TIE/LOSE, it is recorded here. By JTT publishes evidence that leads to conclusions — not just wins.

---

_This dev log is regenerated from `docs/devlog-data.json`. To add an entry, edit that file and run `node scripts/gen-devlog.mjs` — the page and this document update together._