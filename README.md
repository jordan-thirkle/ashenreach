# Ashenreach

> **Carry the dead home.** A free, install-free open-world action RPG that runs in your browser.

![Ashenreach](https://img.shields.io/badge/Ashenreach-Browser%20RPG-6E2A28) ![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6) ![License](https://img.shields.io/badge/license-MIT-22262B) ![CI](https://github.com/jordan-thirkle/ashenreach/actions/workflows/ci.yml/badge.svg) ![CodeQL](https://github.com/jordan-thirkle/ashenreach/actions/workflows/codeql.yml/badge.svg)

**Play now:** https://ashenreach.vercel.app &nbsp;·&nbsp; **Docs:** [`docs/`](docs/)

---

## What is Ashenreach?

Ashenreach is a browser-native open-world action RPG. You are the **Cairnwarden**,
crossing a wind-scoured highland called the Reach to carry the souls of the dead
back to their cairn stones. The world is procedurally generated, the combat is
weighty, and the choice is always the same: bank what you carry for safety, or
risk the Embertide for more.

It is built entirely with web technology — **TypeScript, three.js (WebGL2), and
Vite** — and ships as a single static site. No download, no launcher, no
account. Open the link and play.

## Features

- **Open-world exploration** — six biomes (Ashflats, Wetmoor, Blackpine, Grey
  Crags, Rotmire, Scorch) generated from a seed.
- **Weighty combat** — light/heavy attacks, parry, dash i-frames, and four
  weapon archetypes with distinct feel.
- **The risk dial** — carrying more souls makes you slower and louder.
- **Embertide** — a rising difficulty timer that makes the world harder and the
  loot richer as the run goes on.
- **The Ashen Crown** — a Colossus boss in the central crater.
- **Progression** — three skill branches (Warden, Ember, Wake), quests, a codex,
  and daily seeds.
- **Zero asset licences** — every model, texture, and sound is generated in
  code, or sourced from Apache-2.0 rigs.
- **Asset viewer** — inspect every model in the game at `/viewer`.

## Quick start (development)

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npx vitest run     # unit tests
```

## Links

| Resource | URL |
| --- | --- |
| Play the game | https://ashenreach.vercel.app |
| Asset viewer | https://ashenreach.vercel.app/viewer |
| Documentation | [`docs/`](docs/) |
| Game Design Document | [`docs/gdd/`](docs/gdd/) |
| By JTT (studio) | https://byjtt.com |

## Tech stack

TypeScript · three.js · WebGL2 · Vite · Vitest · Playwright (headless QA)

## Repository health

This repository follows a security-first automation standard
([must-have-github-apps](https://github.com/jordan-thirkle/must-have-github-apps)):

- **Dependabot** keeps npm and Actions dependencies current.
- **CodeQL** runs static security analysis on every change.
- **CI** builds, typechecks, and unit-tests every push and pull request.
- **GitHub Pages** mirrors the production build as a backup deploy.

## License

MIT. See [LICENSE](LICENSE). Procedural asset pipeline included; free rigged
models are Apache-2.0 (Khronos glTF-Sample-Assets).

---

By JTT — an evidence-led AI-native game studio.
