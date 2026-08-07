// Ashenreach — opening lore. Weathered-highland folk-mythic voice.
// Free-written, no external assets. Spoken via Audio.narrate() on first spawn.

export const OPENING_LINES: string[] = [
  'The highland burns, and the dead do not stay buried.',
  'You are a Bearer — the only hands left to carry them home.',
  'Each soul you gather is a debt. Each cairn, a forgiveness.',
];

// Short framing shown with the first objective so the player always has direction.
export const FIRST_OBJECTIVE_FRAME: string =
  'Your first cairn waits ahead. Reach it, and lay the first soul to rest.';

// Ambient world-voice lines, surfaced on discovery / quiet moments (no spoilers).
export const AMBIENT_LINES: string[] = [
  'The wind here remembers names no one speaks anymore.',
  'Something old turned its back on this land, and the ash followed.',
  'They say the Crown at the centre was a mercy, once.',
];

export function pickAmbient(seed: number): string {
  return AMBIENT_LINES[Math.abs(Math.floor(seed)) % AMBIENT_LINES.length];
}
