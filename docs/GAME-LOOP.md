# Ashenreach — Game Loop & Design Flow (Production Spec)

> Source of truth for HOW the game plays and HOW it is designed/iterated.
> Implementation lives in `src/` (see AGENTS.md). Constitution in CONSTITUTION.md.

## 1. The Loop (as implemented)

**Core tension: Bank or Burn.** Souls are the run currency AND the heat source.

```
HARVEST ──► CARRY ──► BANK (at cairn) ──► spend on growth ──► deeper runs
   ▲            │            │                                │
   │            ▼            ▼                                │
   └──── DIE ◄──┴─ EMBERTIDE (heat rises while you carry) ────┘
```

- **Harvest**: kills drop soul orbs; magnet pulls them in.
- **Carry**: `soulsCarried`. **Embertide level climbs while carrying** (`src/Game.ts:778` — "Escalation clock: rises while you hold souls, resets when you bank"). Higher embertide = stronger enemies, better rewards.
- **Bank**: interactive cairns convert carried → `soulsBanked` (persistent currency). Banking resets embertide. **This is the skill test: spend down pressure vs keep the reward streak.**
- **Lose**: death drops `min(carried, max(1, 28% carried))` into a recoverable **death pile** at your body — souls-like retrieval, but there's a decision: chase the pile or re-bank.
- **Meta growth** (persistent, survives death): `level`/`xp` (kills + quests), `skillPoints` → `learned` skills, `embers` (banked spend), equipment (weapon/charm/cloak/relic), quest chains, `litCairns` (world-state), codex entries.
- **Score** (`src/core/Save.ts:206`): `soulsBanked*120 + kills*18 + poisFound*90 + questsDone*260 + level*340 + bestCombo*25 + embertideLevel*500 − deaths*150`. Explicitly rewards banking over hoarding; deaths are a real cost.

## 2. Risky-Return Knobs (tuned in `src/`)

| Knob | Where | Direction of fun |
|---|---|---|
| Death loss rate | `Game.ts:734` (0.28) | lower = friendlier; higher = tenser. Keep ~0.25–0.30 |
| Embertide scale | `Game.ts:778` + DIFFICULTY | must be readable: world visibly heats |
| Stamina/dash/parry | `Player.ts` | decide: skill ceiling via parry window + dash iframes |
| Loot magnet | `Game.ts:559` | near-instant pickup feels good |

## 3. Design Flow (how we iterate)

**Loop for ANY change** (locked by constitution — Gauntlet):
1. **Pain** → evidence (screenshot/metric/crash; never vibes).
2. **Hypothesis** → smallest change that could work.
3. **Build** → implement in-session, tsc clean.
4. **Critic** → local SmolVLM2 + HUMAN Jordan screenshot if contradicting live.
5. **A/B** → blind compare vs reference bars (Diablo IV, Death's Door, HLD).
6. **Verify** → e2e PASS (boot, LUM>0, 0 errors, enemies spawn), live deploy, numeric state checks.
7. **Commit + push** → handoff write.
8. **Log** → PROGRESS.md / dev-log (visible at /devlog).

**Accepted workflow:** validate real gameplay, not menus. Never call a game clean off menu-only critic passes.

## 4. Long-Term Balance Rules (low maintenance)

- **Numbers live in one place**: balance constants colocated with their system (see table) — no magic numbers scattered.
- **New content docks to the loop**: a new enemy must answer "how does it raise HARVEST cost or BANK pressure?" If neither, it's decoration — cut it.
- **Reuse before build**: procedural textures, CC0 where it helps, in-engine normal derivation. Never reinvent a working path.
- **Save versioning**: `SAVE_VERSION=3`, migration in `migrate()`. Old saves must never hard-fail.
- **Compatibility**: e2e hard gates + local critic are the regression net. If a change doesn't pass both, it doesn't ship.