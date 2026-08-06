# 07 — Audio

All audio is generated procedurally with the Web Audio API. No audio files are shipped.

## Palette
- Warden: low wooden thuds, cloth rustle (filtered noise).
- Enemies: detuned metallic groans, ash hiss.
- Embertide: rising drone (sawtooth + low-pass sweep) tied to level.
- Cairn: warm bell (sine partials) on bank.

## Systems
- **One-shot SFX:** swing (whoosh noise burst), impact (body resonance), parry (metallic ping), dash (air rip), soul-bank (chime).
- **Music:** none by default; adaptive drone layers in with Embertide.
- **Spatialization:** panned by enemy bearing; distance attenuation.
- **Ducking:** music/SFX duck 6dB during shade dialogue.

## Mix
- Master -3 LUFS target. SFX bus -6dB, drone bus -12dB.
- Optional mute per bus (Settings).
