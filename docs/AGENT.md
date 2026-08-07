# AGENTS.md — Ashenreach (read me first, any agent)

You are working on Ashenreach, a browser-native open-world action RPG by By JTT.
This file is set-and-forget onboarding for Hermes, Claude, Codex, or any agent.
Constitution lives in CONSTITUTION.md — it wins on conflict.

## What this is
- TypeScript + Vite + three.js + Web Audio. Single-player, client-only (no backend).
- Three surfaces from one build: marketing at /, game at /play.html, asset
  viewer at /viewer.html. Vercel alias: ashenreach.vercel.app.
- Fully AI-built. ~22 generated glTF models, procedural PBR textures, 100% Web
  Audio synthesis, neural-voice lore (edge-tts). See docs/ASSET-PROVENANCE.md.

## Current state (2026-08-07)
- Build green, e2e PASS. Latest deploy t18 live. Commits d175d22, 7e81879.
- Done this session: branded loading screen, rim-light + exposure, CC0 ground
  texture + derived normal map, swing-FX slash fix, neural-voice narration
  (edge-tts), local SmolVLM2 visual critic operational.
- Folder is D:ProjectsBrawler; do not rename on Windows (cwd lock).

## Build / test / deploy
- npm install
- npm run typecheck   (tsc --noEmit)
- npm run build       (tsc + vite build + package-dist folds web/ into dist root)
- npm run e2e         (headless Playwright boot + LUM/colour/error gates)
- npm run critic      (e2e verdict)
- npm test            (vitest unit)
- npx vercel deploy --prod --yes --name ashenreach   (Vercel token set)

Game source: src/ (Game.ts orchestrates). Marketing: web/ (reads game
localStorage for shared identity). Docs: docs/. ARCHITECTURE.md = bar.
docs/BRAND.md = brand lock. PROGRESS.md = gauntlet receipts.

## Self-critique (do not skip)
- Visual: run the local VLM critic C:/Users/jorda/AppData/Local/Temp/critic_smol.py
  after npm run e2e (shots in tests/e2e/shots/). Needs torch+transformers+
  torchvision+num2words in the Hermes venv (installed). Avoids the down Nous API.
- Web research when Firecrawl is 402: use free-web-fallback skill (DuckDuckGo).
  skill_view / delegation can route via OpenRouter fallback.

## Next levers (priority order)
1. Mechanics depth: enemy AI variety, boss phases, weapon feel.
2. World density + biome readability; more CC0 PBR (stable hosts only).
3. Marketing page is game-integrated + anti-slop; keep it honest.
4. Accessibility pass (docs/ACCESSIBILITY.md exists).

## Hard rules
- Anti-slop brand lock: ember + palegold on graphite. NO neon/cyan/magenta.
- Validate real gameplay (boot a match, LUM>0) before claiming done.
- Don't fake a backend login — identity is localStorage, shared game<->site.
- Commit + push when not active; don't leave the build red.
