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
- Integration: tsc clean, 28/28 vitest, build OK, e2e VERDICT=PASS. Pushed a239395. Redeploying.

## Tier 2 (next — pending deploy confirm)
- T2-A: Quest depth — 2 new side quests + codex entries (src/data/Quests.ts, src/systems/Quests.ts)
- T2-B: Boss phases — Colossus 3-phase escalation (src/entities/Rigs.ts colossus, src/systems/EnemyAI.ts)
- T2-C: Mobile polish — on-screen joystick tuning + safe-area (src/ui/MobileControls.ts, src/ui/Hud.ts)

## Integration batch (PM, after agents return)
- Full `npm run build` + `npx vitest run` + e2e critic
- Commit + push
- Redeploy to Vercel
