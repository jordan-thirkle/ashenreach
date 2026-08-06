# Contributing

Ashenreach is built by By JTT. Contributions are welcome for the open-source shell and tooling.

## How to work in this repo

1. `npm install`
2. Create a branch from `master`.
3. `npm run typecheck` and `npx vitest run` must pass.
4. Open a pull request; CI (build + tests) and CodeQL will run automatically.

## Code style

- TypeScript strict mode is on.
- Keep the locked visual palette (see `ARCHITECTURE.md`): ash, bone, slate, peat, moss, rust, oxblood, palegold. Neon, cyan, magenta, and glassmorphism are banned.
- Prefer procedural generation over external assets; if a free asset is used, it must be Apache-2.0 / CC0 and documented in `docs/ASSET-PROVENANCE.md`.

## Review standard

This repo follows the [Must-Have GitHub Apps](https://github.com/jordan-thirkle/must-have-github-apps) philosophy: security and reliability checks run before merge, not after.
