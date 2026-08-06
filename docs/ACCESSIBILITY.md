# Accessibility

Ashenreach targets broad playability. These are implemented or planned for v1.

## Visual
- **Colorblind safety:** state is never encoded by red/green alone. Embertide uses a brightness + icon ramp; HP uses a shape-aware bar.
- **Scalable HUD:** 3 sizes in Settings.
- **Reduced motion:** disables screen shake, ash-drift animation, and parry flashes.
- **High contrast:** UI text meets WCAG AA on the locked dark palette.

## Motor
- **Full key remap** for desktop (Settings -> keybinds).
- **Toggle aim assist** on touch (auto-snaps swings).
- **Hold-to-interact** alternative to tap.
- **Pause any time** (Esc / button); no timed menus.

## Cognitive
- **Subtitles** for shade dialogue.
- **On-screen audio pips** double every audio cue.
- **Clear objective list** (active quests always visible).
- **No hidden mechanics:** every system is explained at first contact.

## Audio
- **Per-bus mute** (SFX / drone / dialogue).
- **Stereo panning** for enemy bearing.

## Tested
- e2e harness runs with no console errors; booth render verified non-black.
- Manual pass on 360px viewport (mobile layout).
