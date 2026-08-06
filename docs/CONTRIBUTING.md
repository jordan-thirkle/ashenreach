# Contributing

Ashenreach is built by By JTT. Contributions are welcome for the open-source shell; game design direction stays with the studio.

## How to work in the repo
1. `npm install`
2. Create a branch: `git checkout -b fix/short-name`
3. Make the change. Keep `npm run test` green.
4. If you touch rendering or boot: run `npm run e2e` and confirm `VERDICT=PASS`.
5. Open a PR with a short "what / why".

## Rules
- All art/audio must be procedural (no external assets / licences).
- No new third-party runtime deps without sign-off (bundle size matters in-browser).
- Keep the locked palette (see `src/core/Palette.ts` + `ARCHITECTURE.md` section 1).
- Determinism: world/loot/asset gen stays seeded.

## Where things live
- Gameplay: `src/systems/`, `src/entities/`.
- World: `src/world/`.
- UI: `src/ui/`.
- Tests: `tests/unit/`, `tests/e2e/`.
- Docs: `docs/`.

## Code style
- TypeScript strict. `npm run typecheck` must pass.
- Prefer small, named functions; no giant files.
