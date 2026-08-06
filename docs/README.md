# Ashenreach

> Carry the dead home. A browser-native open-world action RPG.

Ashenreach is a free, install-free action RPG that runs in your browser (WebGL2). You are the Warden: cross a burning highland, bear the souls of the fallen to the cairns that hold them, and outrun the rising Embertide. Every asset is generated in-repo — no third-party art or audio licences.

## Quick start

```bash
npm install
npm run dev        # play at the printed localhost URL
# open /viewer.html for the asset viewer
```

```bash
npm run build      # production bundle -> dist/
npm run preview    # serve the built game
npm run test       # 28 unit tests (Vitest)
npm run e2e        # headless boot + critic (Playwright)
```

## What's in the box
- `src/` — game source (TypeScript + three.js).
- `viewer.html` / `src/viewer/` — visual asset viewer (orbit + inspector).
- `tools/assetgen/` — procedural GLB / PBR / icon generator + manifest.
- `tests/` — unit (Vitest) + e2e boot/critic (Playwright).
- `web/` — standalone marketing site (no build step).
- `press/` — Steam page, press kit, X thread, checklist, trailer script.
- `docs/` — GDD (10 sections) + manuals.

## Verify it actually runs
`npm run e2e` boots the built game headless, captures render metrics + screenshots, and `tests/e2e/critic.mjs` applies hard-fail gates (no black screen, no flat render, no console errors, enemies spawn). Last run: **VERDICT=PASS**.

## License
Code: MIT. Assets: all procedurally generated in-repo; no third-party licences.
