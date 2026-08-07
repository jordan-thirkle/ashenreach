# Ashenreach — Studio Constitution

Single source of truth for how this project is built, judged, and shipped.
By JTT. Echoed into AGENTS.md, docs/, and every agent context. If a decision
conflicts with this file, this file wins.

## Mission
Ship a complete, addictive, browser-native open-world action RPG (Ashenreach)
that feels hand-made, not AI-slop. Evidence-led: every claim is backed by a
screenshot, metric, or reproducible run. "By JTT publishes evidence that leads
to conclusions."

## Operating principles (LOCKED)
1. **Max 3 active projects.** Delete is greater than build. When something is
   not active, commit + push + delete locally. Only maintained work stays on disk.
2. **AI-first, fully automated.** Delegate builds to subagents/agents. The human
   reviews outcomes, not keystrokes. When a tool or API is down, HUNT the
   alternative (local model, other provider, open source) — never route around
   it or ask. Blocked capability = go find the working path.
3. **Validation before expansion.** No feature ships on a green test alone.
   Boot a real match, confirm it renders (no crash overlay, LUM > 0), and the
   player survives spawn grace. Visual claims need a screenshot, not a score.
4. **Pain → Evidence → Pattern → Automation.** Turn every friction into a
   documented, repeatable workflow (skill or script).
5. **Perfection loop (Gauntlet).** Builder + separate harsh critic, blind A/B
   vs reference bars (CoD / Warzone / Arena Breakout / Diablo IV). Loop until the
   critic says output wins. Emergency is not an excuse to bypass the loop.

## Brand lock (anti-slop, NON-NEGOTIABLE)
- Weathered highland folk-mythic. Two saturated accents on desaturated earth.
- Accents: EMBER (0xd9763a / rust 0xa6552f), PALEGOLD (0xc9a227). No others.
- BANNED: neon, cyan, magenta, synthwave, purple gradients. (Hard rejection.)
- Type: display serif (Iowan Old Style / Palatino) for titles + Inter for UI.
- Icon: the cairn star (five-point) — the only logomark, game + site + favicon.
- Voice: plain, mythic, unhurried. Short sentences. No exclamation-spam, no em
  dashes in OUTWARD copy. The player is a bearer, not a consumer.
- Game HUD, marketing site, and map canvas share ONE palette, ONE type system,
  ONE icon. A new colour or shape is not on-brand until added here.

## Quality bar
- tsc clean, build green, e2e PASS (no-black-screen LUM>=0.02, not-flat>=32
  colours, 0 console errors, boots, enemies spawn) before any deploy.
- Self-critique with a local VLM (SmolVLM2 via torch+transformers in the Hermes
  venv) — no dependence on the Nous web/vision API, which is frequently down.
- Deploy to Vercel (ashenreach.vercel.app). Commit, push, deploy, verify live.

## Identity model
- Client-side only. The player's bearer, progress, and scores live in
  localStorage (ashenreach.save.v1, ashenreach.scores.v1) on the game origin.
  The marketing site reads the SAME keys — one save, one bearer, no separate
  login. No backend auth exists by design (single-player, local persistence).
