# Ashenreach — Launch Checklist

## Pre-launch
- [x] Game compiles clean (tsc --noEmit)
- [x] Production build green (vite build)
- [x] 28 unit tests pass
- [x] E2E boot harness: VERDICT=PASS (no black screen, no flat render, no console errors, enemies spawn)
- [x] Asset generator produces GLB + PBR + icons + manifest
- [x] Marketing site (web/) with OG/Twitter/JSON-LD
- [x] Press kit (press/)
- [ ] Deploy game to production URL (Vercel)
- [ ] Deploy marketing site to ashenreach.game
- [ ] Register Steam page, set wishlist live
- [ ] Create X account assets (banner, avatar)

## Launch
- [ ] Post X launch thread (10 posts)
- [ ] Post 20 standalone posts across 2 weeks
- [ ] Submit to browser-game directories
- [ ] Share in relevant communities (no spam)

## Post-launch
- [ ] Monitor error logs / leaderboard
- [ ] First hotfix window (48h)
- [ ] Collect run telemetry (score distribution)
- [ ] Plan next biome + Colossus phase
- [ ] Write post-mortem

## Evidence on hand
- tests/e2e/REPORT.md (critic verdict)
- tests/e2e/shots/ (boot, combat, inventory, map)
- public/assets/manifest.json (asset inventory)
- docs/ (GDD, manual, accessibility)
