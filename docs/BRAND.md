# Ashenreach — Brand System

Single source of truth for the Ashenreach identity across the game, the website,
and all outward communication. By JTT. Version 1 (pre-Steam / pre-custom-domain).

## One-line identity
Ashenreach is a free, browser-native open-world action RPG. You carry the souls of
the fallen across a burning highland to the cairns that will hold them. Tagline:
"Carry the dead home."

## Visual identity (LOCKED — see ARCHITECTURE.md section 1)
Weathered highland folk-mythic. Two saturated accents against desaturated earth.
- Earth base: slate graphite, peat, moss, bone, ash.
- Accent 1 — EMBER (0xd9763a / rust 0xa6552f): danger, the Embertide, damage.
- Accent 2 — PALEGOLD (0xc9a227): objectives, loot rarity, safe points (cairns).
- BANNED: neon, cyan/magenta, synthwave, purple gradients. (Jordan rejection trigger.)
- Type: display serif (Iowan Old Style / Palatino) for titles + a clean grotesk (Inter)
  for UI. Tabular mono for numbers.
- Icon: the cairn star — a five-point star glyph used as the boot mark, favicon, and
  POI marker. It is the brand's only logomark.

## Voice
Plain, mythic, unhurried. Short sentences. No exclamation-spam, no em dashes in
outward copy. Speak of weight, debt, and rest — not "features" and "engagement."
The player is a bearer, not a consumer.

## Cohesion rule (game UI + website must match)
The in-game HUD/menus and the marketing site share ONE palette, ONE type system,
and ONE icon (the cairn star). If a surface introduces a new color or shape, it is
not on-brand until added here. Current surfaces: game HUD (src/styles.css), marketing
(web/styles.css), map canvas (src/ui/Screens.ts — graphite base, palegold objectives).

## Launch comms (Version 1 — when the game is actually complete)
Post to x.com/byjtt and relevant Reddit subs (r/IndieGaming, r/playmygame,
r/WebGames, r/ActionRPG) telling the STORY of how it was built, not just "play my game."
Angle: "We built a complete open-world ARPG entirely in the browser, AI-assisted, from
the highland up. Here's what shipped and what we learned." Lead with a real screenshot
+ the cairn-star mark. Never buy followers or use follow-for-follow.

### X/Twitter post template (v1)
"Carry the dead home. Ashenreach is a free, browser-native open-world action RPG —
built start to finish in the browser. No install. Play: ashenreach.vercel.app/play
We made every asset, system, and line of play in-house. AMA in replies. #indiegame"

### Reddit post template (v1)
Title: "We built a complete open-world action RPG that runs in your browser — no
install, free. Here's the build log + what we'd do differently."
Body: short origin, the Embertide loop, one hard lesson, one screenshot, the link.
Disclose it is our (By JTT) project. Answer every comment.

## Do NOT
- Use the unbought ashenreach.game domain in any live link (point to ashenreach.vercel.app).
- Reference a Steam page until the store page exists (no placeholder URLs).
- Drift the palette toward "AI slop" neon. The brand lives or dies on restraint.
