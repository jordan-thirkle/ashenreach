# Agent Handoff — Ashenreach (shared tree: Hermes + Command Code CLI)

> Before touching `src/`, read this file and record your name in the Active lane.
> One agent in `src/` at a time. Push after each committed chunk.

## Active lane (who is editing what, right now)
| Agent | Area | Status |
|---|---|---|
| Hermes | repo hygiene, SEO, docs, website | ACTIVE (2026-08-10) |
| CommandCode | NEXT.md #1-#3: dep restore, typecheck/build, biome fix acceptance | PENDING — blocked on rollup binary lock |

## Verified facts
- Camera: live deploy numeric `above:true` (pitch -0.28, camY>tgtY) verified 2026-08-10 — NOT upside down. Do not revert the pitch clamp.
- Marketing site: game-craft hero (parallax, cairn bloom) + shared localStorage identity live.
- Identity: client-side only (ashenreach.save.v1 / scores.v1). No backend auth by design. TODO: Jordan decides persistence semantics (NEXT #4) before Save/Scores work.

## Rules (both agents)
1. `git pull --rebase` before starting a session.
2. Read this file before any `src/` edit; write your lane when you start.
3. Commit per logical chunk; push per chunk. Never force-push.
4. Never hand-edit `node_modules` (rollup binary lock — retry restore when released, no force copies).
5. Keep `git status` truthful: no temp scripts (cap_*.mjs guarded), no regenerated e2e reports (gitignored), no CRLF noise (.gitattributes).
6. E2E: `E2E_PORT=4191 node tests/e2e/run.mjs` (port env override) if 4173 is contended.