# ASHENREACH — Coordination Contract (Gauntlet Build)

> **This file is the law.** Every builder and critic reads it first. Any code that
> violates a Hard Rule is rejected at critic gate regardless of how good it looks.

---

## 0. Goal

Ship **Ashenreach**: a complete, addicting, browser-native open-world action RPG —
playable end-to-end (boot → character → open world → combat → quests → progression →
endgame → death/victory → share), with an in-product **Asset Viewer**, a **marketing
website**, and a **full press/Steam kit**. One shot. No stubs. No TODOs in shipped code.

**Reference bar (blind A/B):** the critic compares Ashenreach against *Hyper Light
Drifter* (readability + art discipline), *Death's Door* (combat feel + camera),
*Valheim* (open-world traversal + discovery loop), and *Diablo IV* (loot/affix depth).
Not "good for a browser game" — good, full stop.

---

## 1. Creative Direction (LOCKED — do not re-litigate)

**Name:** Ashenreach. Verified unclaimed on Steam storesearch API (`total: 0`).

**Setting:** The Reach — a wind-scoured highland basin where an old war burned the
sky. Ash falls like snow. The dead are not gone; they are *deferred*. You are a
**Cairnwarden**, one of the few who can carry a soul back to its stone.

**Art register:** *Weathered highland folk-mythic.* Low-poly stylised geometry, hand-
authored gradient skies, heavy atmospheric depth fog, low-angle raking light.

**Palette (LOCKED):**
| Role | Hex | Use |
|---|---|---|
| Ash | `#D9D2C5` | sky haze, particulate, UI text |
| Bone | `#EFE9DC` | highlights, rim light |
| Slate | `#3B4149` | rock, cliffs, shadow |
| Peat | `#4A3F35` | soil, bark, leather |
| Moss | `#6E7A54` | vegetation, terrain mid |
| Rust | `#A6552F` | ember, warning, damage |
| Oxblood | `#6E2A28` | blood, elite enemies, danger |
| Palegold | `#C9A227` | loot, objectives, sacred |

**BANNED (instant critic fail):** neon, cyan/magenta pairing, synthwave grids, purple
gradients, chromatic aberration as a style, emoji as UI iconography, Comic-Sans-tier
fonts, "cyberpunk" anything. This is the AI-default slop register and it is rejected.

**Rationale:** a desaturated earth palette with two saturated accents (Rust, Palegold)
reads perfectly at low poly counts, keeps loot/objectives instantly legible against the
world, survives aggressive fog, and is the exact opposite of the AI-default neon.

---

## 2. Tech Stack (LOCKED)

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript 5.9, `strict: true` | no `any` escapes in gameplay code |
| Bundler | Vite 7 | fast HMR, clean prod build, no config archaeology |
| Renderer | three.js r18x, WebGL2 | universal support; WebGPU is still gated on Safari |
| Physics | **custom deterministic heightfield + capsule** | Rapier WASM costs ~1MB, breaks determinism for daily seeds, and we only need capsule-vs-heightfield + sphere overlaps. Owning it is smaller, faster, replayable. |
| Audio | **100% procedural Web Audio** | zero audio bytes shipped, infinite variation, no licensing |
| Assets | **procedurally generated GLB + PBR** via `tools/assetgen` | zero third-party licence risk, fully regenerable, tiny |
| State | hand-rolled typed event bus + stores | no framework tax in a 60fps loop |
| Persistence | `localStorage` + versioned migration | no backend required to play |
| Tests | Vitest (unit) + Playwright/SwiftShader (e2e, real WebGL) | e2e renders actual pixels |
| Deploy | Vercel static | proven |

### Verified environment facts
- Headless WebGL **2.0** confirmed via Playwright + ANGLE/SwiftShader
  (`--use-angle=swiftshader --enable-unsafe-swiftshader`), Chromium at
  `C:/Users/jorda/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`.
  **The critic renders real frames. Nobody grades from a summary.**
- Playwright's `chromium_headless_shell` is NOT installed → always pass
  `executablePath` + `headless: true`. Never rely on the default resolver.
- Windows/git-bash. No `sqlite3` CLI, no `SIGALRM`. `ffmpeg` 8.1.1 present.

---

## 3. Directory Ownership (disjoint — do not cross)

| Path | Owner | Contents |
|---|---|---|
| `src/core/**` | **Engine (lead)** | Game loop, renderer, input, audio, RNG, save, events |
| `src/world/**` | **Engine (lead)** | Noise, terrain, biomes, worldgen, scatter, sky, water |
| `src/entities/**` | **Engine (lead)** | Player, enemy, NPC, projectile, loot |
| `src/systems/**` | **Engine (lead)** | Physics, combat, AI, quests, inventory, progression, juice |
| `src/ui/**` | **Engine (lead)** | HUD, menus, map, dialogue, codex, mobile controls |
| `src/data/**` | **Engine (lead)** | Item/enemy/quest/skill/dialogue tables |
| `src/shaders/**` | **Engine (lead)** | GLSL |
| `tools/assetgen/**` | **Builder A** | Procedural GLB/PBR/icon generators |
| `public/assets/**` | **Builder A** (generated) | Output only — never hand-edited |
| `src/viewer/**` | **Builder C** | Asset Viewer app |
| `tests/**` | **Builder C** | Vitest + Playwright suites |
| `web/**`, `press/**` | **Builder B** | Marketing site, Steam kit, X.com content |
| `docs/**` | **Builder B** | GDD, design docs, manuals |
| `ARCHITECTURE.md`, `PROGRESS.md` | **Engine (lead)** | This contract + critic receipts |

**Rule:** a builder that writes outside its column has its work reverted.

---

## 4. Interfaces (stable — builders code against these)

```ts
// src/core/RNG.ts
export interface RNG { next(): number; int(min:number,max:number): number;
  range(min:number,max:number): number; pick<T>(a:readonly T[]): T;
  bool(p?:number): boolean; fork(salt:string): RNG; }
export function makeRNG(seed: number|string): RNG;

// src/core/Events.ts  — every gameplay event the Juice + Audio layers listen to
export interface GameEvents {
  'player:hit':      { dmg:number; crit:boolean; pos:Vec3 };
  'player:death':    { cause:string; stats:RunStats };
  'enemy:hit':       { id:string; dmg:number; crit:boolean; pos:Vec3; killed:boolean };
  'enemy:death':     { id:string; kind:string; pos:Vec3; xp:number };
  'loot:pickup':     { item:Item; pos:Vec3 };
  'level:up':        { level:number };
  'quest:progress':  { id:string; step:number; total:number };
  'quest:complete':  { id:string; rewards:Reward[] };
  'poi:discover':    { id:string; name:string; kind:PoiKind };
  'relic:bind':      { id:string };
  'boss:phase':      { id:string; phase:number };
  'embertide:rise':  { level:number };
}

// src/world/Terrain.ts  — the single source of ground truth for ALL systems
export interface TerrainSampler {
  height(x:number, z:number): number;
  normal(x:number, z:number): Vec3;
  biome(x:number, z:number): BiomeId;
  walkable(x:number, z:number): boolean;
}

// tools/assetgen — every generator conforms to this
export interface AssetSpec { id:string; kind:'model'|'texture'|'icon';
  out:string; generate(): Promise<Buffer>|Buffer; }

// public/assets/manifest.json — Builder A writes it, Viewer + Game read it
export interface AssetManifest { version:number; generatedAt:string;
  entries: Array<{ id:string; kind:string; path:string; bytes:number;
    tris?:number; dims?:[number,number]; tags:string[]; description:string }>; }
```

---

## 5. Hard Rules

1. **No stubs, no `TODO`, no `throw new Error('not implemented')` in shipped code.**
2. **`npx tsc --noEmit` must pass with zero errors.** `strict: true`. No `any` in
   `src/**` gameplay code (`unknown` + narrowing is fine).
3. **`npm run build` must succeed** and the prod bundle must boot.
4. **Determinism:** same seed → same world, same daily. All gameplay randomness flows
   through `makeRNG`. `Math.random()` is banned in `src/` except for pure cosmetic VFX.
5. **Perf budget:** ≥50 FPS at 1280×720 on a mid GPU; ≤2500 draw calls; initial
   transfer <10MB; time-to-playable <5s on cable.
6. **Accessibility:** rebindable keys, screen-shake slider, colourblind-safe objective
   markers (shape + colour, never colour alone), subtitle toggle, difficulty options.
7. **Mobile:** virtual stick + action buttons; 44px min tap targets; safe-area insets.
8. **Every asset is CC0/self-generated.** Provenance recorded in the manifest.
9. **Six retention hooks required** (per `game-feel`): randomness, discovery, social,
   urgency, near-miss, collection. Juice comes *after* hooks are in.
10. **Evidence or it didn't happen.** Every claim in `PROGRESS.md` carries a command
    output, a screenshot path, or a metric.

---

## 6. Critic Bar (the gate)

The critic is a **separate agent with fresh context**. It never reads a builder's
summary. It:

1. Runs `npx tsc --noEmit`, `npm run build`, `npm test`.
2. Launches the real build under headless SwiftShader WebGL2 and **captures frames**.
3. Measures: mean-luminance (blank-screen detector), unique-colour count (flat-render
   detector), FPS, draw calls, triangle count, heap.
4. Does a **blind A/B**: shown Ashenreach frames next to the reference bar, scores
   Art / Readability / Feel / Depth / Polish out of 10 each.
5. Verdict is one of `reference-wins` / `parity` / `output-wins`, plus a numbered gap
   list. **`reference-wins` → loop again.** Budget: 5 rounds.

Hard fails, regardless of score:
- mean luminance < 0.02 (black screen) or unique colours < 32 (flat screen)
- any console error during a 60s play session
- FPS < 30 at 720p
- any banned-palette element present

---

## 7. Build Order

1. Contract (this file) → 2. Core engine + world + systems (lead) →
3. Assets (A) ∥ Site/docs (B) ∥ Viewer/tests (C) → 4. Integration →
5. Critic round → 6. Fix → repeat → 7. Deploy → 8. Verify live → 9. `PROGRESS.md`.
