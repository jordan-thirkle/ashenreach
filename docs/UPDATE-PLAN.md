# Ashenreach — Update Plan & Long-Term Maintenance

> The "set and forget" roadmap: how the game stays maintainable without heavy
> ongoing development, while still improving toward release. Constitution + AGENTS.md apply.

## 1. Principle: Low-Maintenance by Structure

- **One build, three surfaces** (marketing `/`, game `/play.html`, viewer `/viewer.html`, devlog `/devlog`) — a change to palette/voice applies everywhere from the same source.
- **Procedural-first asset pipeline**: textures derived in-engine, audio synthesized, 22 generated glTFs — no per-frame content gatekeeping; new content is data, not assets.
- **Docs as the memory**: CONSTITUTION.md, AGENTS.md, .hermes/HANDOFF.md, NEXT.md (Command Code queue), PROGRESS.md (receipts), docs/GAME-LOOP.md. Any agent can resume in one read.
- **Shared tree protocol**: pull-rebase before edit, handoff lane, commit-per-chunk, push-per-chunk (see AGENTS.md §Shared-repo protocol).

## 2. Current Stage: Pre-Release (alpha → beta)

Gate to **beta**: persistence semantics decided (NEXT #4), biome fix accepted (CommandCode NEXT #3), mobile/touch read, real playtest session, known-issues list closed to zero release-blockers.

Gate to **release** (public players): onboarding ≤60s, no console errors on 3 test machines, score/leaderboard stable, one full loop (harvest→bank→death-pile retrieval) verified live by a human, release notes + trailer-ready capture.

## 3. Update Cadence (low-touch)

| Cadence | What | Who |
|---|---|---|
| Continuous (commit) | bug fixes, balance constants, docs accuracy | active agent (Hermes/CC), in-session |
| Weekly | e2e gate, critic pass, dev-log regen (`node scripts/gen-devlog.mjs`), deploy if green | scheduled agent or manual |
| Per release | version bump, save-version bump if schema changed, release notes, marketing shot refresh | Jordan approves |

**No nightly grind**: the game is structured so a single weekly checkpoint keeps it healthy. Only issues tagged release-blocker get pulled into the active lane.

## 4. Backlog Into Releases (current intent)

Order comes from `NEXT.md` (Command Code) + docs/AGENTS next-levers + Jordan calls:

1. **Persistence semantics** (NEXT #4): decide souls banked / death piles / world state persistence rules — unblocks Save/Scores hardening.
2. **HUD clarity** (NEXT #5): total souls banked + cairn interaction instruction — helps onboarding, low risk.
3. **Mobile/touch** (web-app decision): if Jordan opts full web-app cross-device, add touch controls (virtual stick + attack/dash buttons) behind a device query; e2e gate stays desktop-first.
4. **Enemy AI variety + boss phases**: raise HARVEST cost through behavior, not stats.
5. **Weapon feel pass**: attack window, parry punish, hit-stop (Juice).
6. **Biome readability + density**: more CC0 PBR where it helps; embertide must be visually legible.
7. **Release marketing**: OG/social shots refresh, press kit (docs/press), trailer capture when loop is locked.

Rule: every release must answer "what permanently improves the studio?" (constitution success metric), not just "what changed?"

## 5. Playability Bar (acceptance checklist)

- e2e PASS (boot, LUM>0, 0 console errors, enemies spawn, no crash overlay)
- Local SmolVLM2 critic pass on boot/combat/inventory/map shots
- Human: one full loop feels complete; score feels earned; death pile decision is legible
- No console errors on Chrome stable, Edge, Firefox (Playwright smoke)

## 6. Release Rotation (what a "release" is)

1. `npm run typecheck && npm run build && E2E_PORT=4191 node tests/e2e/run.mjs`
2. Node `scripts/gen-devlog.mjs` (history page + docs mirror update)
3. Commit "release: vX.Y.Z" + push
4. `npx vercel deploy --prod --yes --name ashenreach`
5. Curl live `/`, `/play.html`, `/voice/manifest.json` → 200
6. Update PROGRESS.md receipt + HANDOFF

## 7. Decision Log (login / web-app)

**Decision (2026-08-10, Jordan delegated "you decide"):** keep **client-side shared identity** (localStorage `ashenreach.save.v1` + `scores.v1`) — the website already reads the same keys the game writes, so "login" is the bearer name, no backend. A real accounts backend is DEFERRED until either (a) cross-device continuity is required by real users, or (b) leaderboard integrity matters (score verification). Rationale: YAGNI, zero backend cost, privacy-friendly, and the constitution says delete > build. If deferred-ever becomes deferred-too-long, revisit at the beta gate (Section 2).

**Cross-device:** game is desktop-first (keyboard+mouse). Full touch support is scoped as a release item (#3 above), NOT today — shipping touch half-baked violates the playability bar.