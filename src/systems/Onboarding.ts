// Ashenreach — first-spawn onboarding. Gives the player direction + voice on load.
// Sequences lore subtitles and narrates them, then points at the first objective.
import type { HudRefs } from '../ui/Hud';
import type { AudioEngine } from '../core/Audio';
import { subtitle } from '../ui/Hud';
import { OPENING_LINES, FIRST_OBJECTIVE_FRAME } from './Lore';

const STEP_MS = 3600;

/**
 * Run the opening sequence once, at the start of a fresh run.
 * Respects the user's subtitle + voiceover settings (checked inside callees).
 */
export function runIntro(hud: HudRefs, audio: AudioEngine, firstObjective: string): void {
  const lines = [...OPENING_LINES, '', FIRST_OBJECTIVE_FRAME, '', firstObjective];
  let i = 0;
  const next = (): void => {
    if (i >= lines.length) return;
    const text = lines[i];
    if (text.length > 0) {
      subtitle(hud, text, STEP_MS + 900);
      audio.narrate(text);
    }
    i += 1;
    window.setTimeout(next, text.length > 0 ? STEP_MS : 600);
  };
  next();
}
