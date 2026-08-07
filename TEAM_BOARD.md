# Ashenreach — Agent Coordination Board (TEAM_BOARD)

Active sprint: **Tier 1 — Living World & Combat Depth**
Status: IN PROGRESS
Last updated: 2026-08-06

## Coordination rules
- Each agent owns EXCLUSIVE files. Do NOT edit files owned by another agent.
- Verify your own work with `npx tsc --noEmit` (typecheck only — do NOT run `vite build`, it writes dist/ and collides with other agents).
- Do NOT commit. The PM verifies and commits after integration.
- Read the file you are about to edit BEFORE editing it.

## Platform constraints (Windows / git-bash)
PLATFORM: Windows (git-bash / MSYS). Terminal uses POSIX syntax.
- sqlite3 CLI is NOT available — use Python's sqlite3 module instead.
- signal.SIGALRM does NOT exist — use subprocess.run(timeout=N) for timeouts.
- du is SLOW on large dirs (node_modules) — use Python os.path.getsize()/os.walk sums.
- Use POSIX-style paths (/d/Projects/Brawler/...).
- Keep per-tool timeouts at 30s; do not chain multiple long du operations.
- gh repo view works — verify GitHub presence before deletion decisions.

## File ownership

| Agent | Owns | Do NOT touch |
|-------|------|--------------|
| AGENT-A (Living World) | `src/world/WorldRenderer.ts`, `src/world/AmbientRigs.ts` (new) | `src/world/GltfModels.ts` (read-only), `src/Game.ts` |
| AGENT-B (New Weapon) | `src/data/Items.ts`, `src/entities/Rigs.ts`, `src/systems/Combat.ts`, `src/viewer/catalog.ts` | `src/systems/Spawner.ts`, `src/Game.ts` |
| AGENT-C (Audio) | `src/core/Audio.ts` | everything else |

## Known interfaces (read-only contracts)
- `src/world/GltfModels.ts` exports `loadGltf(id: string): Promise<{id, object: THREE.Group, anims: THREE.AnimationClip[], source} | null>`.
  Free rig ids available: `cesiumman` (rigged humanoid), `fox` (rigged + animated), `boombox`, `duck`.
- `src/core/Palette.ts` exports `PALETTE` with: ash, bone, slate, slateDark, peat, moss, rust, rustBright, oxblood, palegold, ember.
- Weapon archetype type is the union used in `Items.ts` WEAPONS + `Rigs.ts buildWeapon(arch, color, swingTime?)`.
- Locked visual rule: only the PALETTE colors. No neon/cyan/magenta/glassmorphism.

## Tasks
- [x] T1-A Free rigs in gameplay (ambient Fox + CesiumMan statues)
- [x] T1-B New weapon archetype: glaive
- [x] T1-C Expand procedural audio (embertide swell, soul-bank chime, parry clang)

## Completed
- T1-A: src/world/AmbientRigs.ts (new) + WorldRenderer wiring. Fox (animated) + CesiumMan statues in world.
- T1-B: glaive weapon — Items.ts (2 weapons), Rigs.ts (case), catalog.ts viewer entry. Combat.ts reads profile generically (no edit needed).
- T1-C: Audio.ts — embertideSwell, soulBankChime, parryClang.
- T1 integration: tsc clean, 28/28 vitest, build OK, e2e PASS. Pushed a239395, deployed.
- T2-B: Colossus 3-phase (Rigs.ts setColossusPhaseVisual + EnemyAI.ts BOSS_PHASES/isColossus/animateColossus). Clean tsc.
- T2-C: MobileControls + Hud safe-area + joystick deadzone/lerp. Clean tsc.
- T2-A (RE-DONE by PM after silent agent failure): quests q_ashbridge + q_wakecall + c_wakecall codex in Quests.ts.
- T2 integration: tsc clean, 28/28 vitest, build OK, e2e PASS. Pushed d6d15d5. Redeploying.

## Tier 3 (COMPLETE — deployed)
- T3-A: winter biome — Palette.ts (PALETTE_WINTER + BiomeVariant + paletteFor + Palette interface), Terrain.ts (biomeTable + variant), WorldRenderer.ts (variant threading). PM fixed typeof-PALETTE literal errors.
- T3-B: Inventory.ts (relic add/equip, max 3) + Hud.ts equipped-relics panel.
- T3-C: Scores.ts (localStorage leaderboard + formatTime).
- T3 integration: tsc clean, 28/28 vitest, build OK, e2e PASS. Pushed 158b857. Redeploying.

## Tier 4 (candidate — pending user go)
- T4-A: Expose biome choice in run-start UI + wire Game to pass variant to Terrain/WorldRenderer.
- T4-B: Wire Inventory.equipRelic into Game (relic pickups drop, equip on pickup, stats apply).
- T4-C: Wire Scores.submit into run-end + a simple end-screen leaderboard panel.

## Integration batch (PM, after agents return)
- Full `npm run build` + `npx vitest run` + e2e critic
- Commit + push
- Redeploy to Vercel
