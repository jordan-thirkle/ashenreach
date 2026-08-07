import type { Settings } from './Types';

type Ctx = AudioContext;

/**
 * 100% procedural Web Audio. No files, no licensing, infinite variation.
 * Three buses: music, sfx, ambient -> master. Ducking on impact.
 */
export class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private ambientSrc: AudioBufferSourceNode | null = null;
  private started = false;
  private settings: Settings;
  private step = 0;
  private intensity = 0;
  private lastSfx = new Map<string, number>();
  // Adaptive music layers: calm bed always on, tension layer fades in.
  private calmLayer: GainNode | null = null;
  private tensionLayer: GainNode | null = null;
  private tension = 0;
  private embertideActive = false;
  private nearbyEnemies = 0;
  private layersBuilt = false;

  /** Symmetric random jitter in [-a, a]. */
  private jit(a: number): number {
    return (Math.random() * 2 - 1) * a;
  }

  /** Multiplicative jitter around 1 (e.g. 0.06 => 0.94..1.06). */
  private jmul(a: number): number {
    return 1 + this.jit(a);
  }

  constructor(settings: Settings) {
    this.settings = settings;
  }

  get ready(): boolean {
    return this.started;
  }

  /** Must be called from a user gesture (autoplay policy). */
  async resume(): Promise<void> {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  private init(): void {
    type WinAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? (window as WinAudio).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.settings.masterVolume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 22;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.settings.musicVolume;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfxVolume;
    this.sfxBus.connect(this.master);

    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = this.settings.masterVolume * 0.45;
    this.ambBus.connect(this.master);

    // 2s of pink-ish noise, reused everywhere.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      d[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }
    this.noiseBuf = buf;
    this.started = true;
  }

  applySettings(s: Settings): void {
    this.settings = s;
    if (this.master) this.master.gain.value = s.masterVolume;
    if (this.musicBus) this.musicBus.gain.value = s.musicVolume;
    if (this.sfxBus) this.sfxBus.gain.value = s.sfxVolume;
    if (this.ambBus) this.ambBus.gain.value = s.masterVolume * 0.45;
  }

  private noiseSource(): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noiseBuf) return null;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    return s;
  }

  /** Rate-limit identical sfx so spam does not become mush. */
  private gate(key: string, ms: number): boolean {
    const now = performance.now();
    const last = this.lastSfx.get(key) ?? -1e9;
    if (now - last < ms) return false;
    this.lastSfx.set(key, now);
    return true;
  }

  private env(
    node: AudioNode, peak: number, attack: number, decay: number, when: number,
  ): GainNode {
    const ctx = this.ctx as Ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    node.connect(g);
    return g;
  }

  private tone(
    freq: number, type: OscillatorType, peak: number,
    attack: number, decay: number, when: number, detune = 0, glideTo?: number,
  ): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    o.detune.value = detune;
    if (glideTo !== undefined) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), when + attack + decay);
    }
    const g = this.env(o, peak, attack, decay, when);
    g.connect(this.sfxBus);
    o.start(when);
    o.stop(when + attack + decay + 0.05);
  }

  private noiseHit(
    peak: number, decay: number, when: number,
    filter: BiquadFilterType, f0: number, f1: number, q = 1,
  ): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const src = this.noiseSource();
    if (!src) return;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, when);
    bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + decay);
    const g = this.env(bq, peak, 0.004, decay, when);
    src.connect(bq);
    g.connect(this.sfxBus);
    src.start(when);
    src.stop(when + decay + 0.08);
  }

  /** Duck music briefly so impacts read. */
  duck(amount = 0.55, ms = 180): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    const g = this.musicBus.gain;
    const target = this.settings.musicVolume;
    g.cancelScheduledValues(t);
    g.setValueAtTime(target * amount, t);
    g.linearRampToValueAtTime(target, t + ms / 1000);
  }

  play(name: string, variation = 0): void {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    const v = variation;

    switch (name) {
      case 'swing':
        if (!this.gate('swing', 60)) return;
        this.noiseHit(0.22 * this.jmul(0.14), 0.16 * this.jmul(0.12), t,
          'bandpass', (1800 + v * 260) * this.jmul(0.1), 420, 1.6);
        break;
      case 'hit':
        if (!this.gate('hit', 40)) return;
        this.duck(0.7, 120);
        this.noiseHit(0.42 * this.jmul(0.12), 0.13 * this.jmul(0.15), t,
          'lowpass', 2400 * this.jmul(0.12), 260, 0.9);
        this.tone((126 + v * 14) * this.jmul(0.06), 'triangle',
          0.34 * this.jmul(0.12), 0.004, 0.14, t, this.jit(20), 62);
        break;
      case 'crit':
        this.duck(0.55, 200);
        this.noiseHit(0.55 * this.jmul(0.1), 0.2, t, 'lowpass', 3600 * this.jmul(0.1), 220, 1.1);
        this.tone(196 * this.jmul(0.04), 'square', 0.26, 0.003, 0.2, t, this.jit(16), 88);
        this.tone(392 * this.jmul(0.04), 'triangle', 0.18, 0.003, 0.26, t + 0.02);
        break;
      case 'kill':
        this.duck(0.5, 260);
        this.noiseHit(0.5, 0.42, t, 'lowpass', 1700 * this.jmul(0.1), 130, 0.7);
        this.tone(92 * this.jmul(0.05), 'sine', 0.4, 0.005, 0.5, t, this.jit(14), 44);
        this.tone(147 * this.jmul(0.05), 'triangle', 0.16, 0.01, 0.34, t + 0.04);
        break;
      case 'hurt':
        this.duck(0.5, 240);
        this.tone(168 * this.jmul(0.07), 'sawtooth', 0.3 * this.jmul(0.1),
          0.004, 0.26, t, this.jit(22), 74);
        this.noiseHit(0.34, 0.24, t, 'bandpass', 620 * this.jmul(0.12), 180, 0.8);
        break;
      case 'dash':
        this.noiseHit(0.24, 0.24, t, 'highpass', 380, 2600, 0.7);
        break;
      case 'parry':
        this.duck(0.75, 140);
        this.tone(1568 * this.jmul(0.03), 'square', 0.2 * this.jmul(0.15),
          0.002, 0.1, t, this.jit(25));
        this.tone(2093 * this.jmul(0.03), 'sine', 0.16, 0.002, 0.22, t + 0.008);
        this.noiseHit(0.24, 0.1, t, 'highpass', 2600 * this.jmul(0.1), 5200, 2.2);
        break;
      case 'pickup': {
        const scale = [523.25, 587.33, 659.25, 783.99, 880];
        const f = scale[Math.min(scale.length - 1, v)] ?? 523.25;
        this.tone(f, 'triangle', 0.2, 0.006, 0.16, t);
        this.tone(f * 2, 'sine', 0.1, 0.006, 0.2, t + 0.03);
        break;
      }
      case 'loot-rare':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 'triangle', 0.17, 0.006, 0.34, t + i * 0.055));
        break;
      case 'levelup':
        this.duck(0.4, 700);
        [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) =>
          this.tone(f, 'triangle', 0.2, 0.01, 0.6, t + i * 0.09));
        break;
      case 'soul-take':
        this.tone(330, 'sine', 0.18, 0.02, 0.5, t, 0, 660);
        this.noiseHit(0.1, 0.5, t, 'bandpass', 900, 2200, 3);
        break;
      case 'soul-bank':
        this.duck(0.45, 500);
        [392, 523.25, 659.25].forEach((f, i) =>
          this.tone(f, 'sine', 0.2, 0.02, 0.7, t + i * 0.1));
        this.noiseHit(0.14, 0.9, t, 'lowpass', 700, 180, 0.6);
        break;
      case 'quest':
        [440, 554.37, 659.25].forEach((f, i) =>
          this.tone(f, 'triangle', 0.16, 0.01, 0.44, t + i * 0.1));
        break;
      case 'discover':
        this.tone(196, 'sine', 0.22, 0.06, 1.3, t, 0, 392);
        this.tone(293.66, 'triangle', 0.12, 0.1, 1.1, t + 0.12);
        break;
      case 'ui':
        this.tone(880, 'square', 0.07, 0.002, 0.05, t);
        break;
      case 'ui-back':
        this.tone(440, 'square', 0.07, 0.002, 0.06, t);
        break;
      case 'error':
        this.tone(147, 'square', 0.14, 0.003, 0.16, t, 0, 110);
        break;
      case 'embertide':
        this.duck(0.3, 1800);
        this.tone(58, 'sine', 0.42, 0.4, 3.2, t);
        this.tone(87, 'triangle', 0.2, 0.6, 3.0, t + 0.2);
        this.noiseHit(0.3, 2.6, t, 'lowpass', 420, 90, 0.5);
        break;
      case 'boss-roar':
        this.duck(0.25, 2200);
        this.tone(48, 'sawtooth', 0.5, 0.25, 2.4, t, 0, 30);
        this.tone(73, 'square', 0.22, 0.3, 2.0, t + 0.1, 12);
        this.noiseHit(0.38, 2.2, t, 'lowpass', 900, 110, 0.6);
        break;
      case 'footstep':
        if (!this.gate('footstep', 150)) return;
        this.noiseHit(0.075 * this.jmul(0.25), 0.09 * this.jmul(0.2), t,
          'bandpass', (420 + v * 90) * this.jmul(0.18), 180, 1.4);
        break;
      case 'death':
        this.duck(0.15, 3000);
        this.tone(110, 'sine', 0.4, 0.1, 2.4, t, 0, 41);
        this.tone(82.41, 'triangle', 0.24, 0.3, 2.8, t + 0.2);
        this.noiseHit(0.26, 2.4, t, 'lowpass', 900, 80, 0.5);
        break;
      case 'victory':
        [261.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 'triangle', 0.22, 0.02, 1.1, t + i * 0.14));
        break;
      default:
        break;
    }
  }

  // ---- New procedural one-shots (AGENT-C additions) ----

  /**
   * embertideSwell(level: 0..10) — a rising, ominous drone whose pitch and
   * lowpass cutoff climb with `level`, ramped over ~1.5s. Intended for the
   * Embertide warning/onset beat.
   *
   * CALL SITE FOR GAME.TS (do not modify other files now):
   *   In the Embertide system, when a tide swell begins, call:
   *     audio.embertideSwell(currentTideLevel)
   *   e.g. from the Embertide tick/onset handler in Embertide.ts. The existing
   *   `embertideRise(level)` alias already plays the ambient 'embertide' swell;
   *   this is a separate, more aggressive on-beat drone you can layer on top.
   */
  embertideSwell(level: number): void {
    if (!this.started || !this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const lvl = Math.max(0, Math.min(10, level)) / 10; // normalise to 0..1
    const dur = 1.5;

    // Fundamental + a fifth, both rising with level.
    const base = 55 + lvl * 16;                 // 55..71 Hz
    const end = base * (1.7 + lvl * 0.9);       // higher level => higher crest

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);

    // Resonant lowpass that opens up as the swell climbs.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 7;
    lp.frequency.setValueAtTime(170 + lvl * 120, t);
    lp.frequency.exponentialRampToValueAtTime(1400 + lvl * 1700, t + dur);

    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(base, t);
    o1.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);

    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(base * 1.5, t);
    o2.frequency.exponentialRampToValueAtTime(Math.max(30, end * 1.5), t + dur);
    o2.detune.value = 7;

    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(this.sfxBus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.5);
    o2.stop(t + dur + 0.5);
  }

  /**
   * soulBankChime() — a soft two/three-note bell (sine partials with quick
   * decay) played when a soul is banked at a cairn. Distinct from the existing
   * 'soul-bank' fanfare: this is the smaller "received" chime.
   */
  soulBankChime(): void {
    if (!this.started || !this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — soft ascending bell
    const partials = [1, 2.01, 2.99, 4.21]; // inharmonic bell partials
    notes.forEach((f, i) => {
      const nt = t + i * 0.11;
      partials.forEach((p, k) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * p;
        const peak = 0.15 / (k + 1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, nt);
        g.gain.exponentialRampToValueAtTime(peak, nt + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, nt + 0.9 - k * 0.15);
        o.connect(g).connect(this.sfxBus as GainNode);
        o.start(nt);
        o.stop(nt + 1.0);
      });
    });
  }

  /**
   * parryClang() — short metallic clang for a successful parry: a bandpassed
   * noise transient plus a few inharmonic sine partials (the "ring" of struck
   * metal) with a fast decay. Complements the existing `parrySuccess()` sparkle
   * — call this for the harder, more percussive clang.
   */
  parryClang(): void {
    if (!this.started || !this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.001;
    // Metallic noise transient through a resonant bandpass.
    this.noiseHit(0.3, 0.12, t, 'bandpass', 3200, 900, 3.2);
    // Inharmonic partials give the metallic ring.
    const partials = [2400, 3170, 4300, 5600];
    partials.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (1 + i * 0.001);
      const g = ctx.createGain();
      const peak = 0.14 / (i + 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 - i * 0.02);
      o.connect(g).connect(this.sfxBus as GainNode);
      o.start(t);
      o.stop(t + 0.22);
    });
  }

  /** Wind + distant ash. Runs forever once started. */
  startAmbient(): void {
    if (!this.ctx || !this.ambBus || this.ambientSrc) return;
    const ctx = this.ctx;
    const src = this.noiseSource();
    if (!src) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.4;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;
    const g = ctx.createGain();
    g.gain.value = 0.5;

    // Slow LFO on cutoff so the wind breathes instead of hissing flat.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();

    src.connect(hp).connect(lp).connect(g).connect(this.ambBus);
    src.start();
    this.ambientSrc = src;
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
    this.refreshTension();
  }

  /** Called by Embertide system: true while a tide is active. */
  setEmbertide(active: boolean): void {
    this.embertideActive = active;
    this.refreshTension();
  }

  /** Number of enemies near the player; feeds the tension layer. */
  setNearbyEnemies(n: number): void {
    this.nearbyEnemies = Math.max(0, n);
    this.refreshTension();
  }

  /** Blend calm bed vs tension layer with a slow crossfade. */
  private refreshTension(): void {
    const crowd = Math.min(1, this.nearbyEnemies / 6);
    const target = Math.max(
      this.embertideActive ? 0.85 : 0,
      Math.max(crowd, this.intensity),
    );
    this.setTension(target);
  }

  /** Explicit crossfade control (0 = calm only, 1 = full tension). */
  setTension(v: number): void {
    const target = Math.max(0, Math.min(1, v));
    this.tension = target;
    if (!this.ctx || !this.calmLayer || !this.tensionLayer) return;
    const t = this.ctx.currentTime;
    const ramp = 2.2; // slow, restrained crossfade
    const cg = this.calmLayer.gain;
    const tg = this.tensionLayer.gain;
    cg.cancelScheduledValues(t);
    cg.setValueAtTime(cg.value, t);
    cg.linearRampToValueAtTime(1 - 0.55 * target, t + ramp);
    tg.cancelScheduledValues(t);
    tg.setValueAtTime(tg.value, t);
    tg.linearRampToValueAtTime(target, t + ramp);
  }

  /** Build the two music sub-buses under musicBus (idempotent). */
  private buildLayers(): void {
    if (this.layersBuilt || !this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    this.calmLayer = ctx.createGain();
    this.calmLayer.gain.value = 1;
    this.calmLayer.connect(this.musicBus);
    this.tensionLayer = ctx.createGain();
    this.tensionLayer.gain.value = 0;
    this.tensionLayer.connect(this.musicBus);
    this.layersBuilt = true;
  }

  /**
   * Adaptive score: a slow drone bed plus a modal melody whose density
   * follows combat intensity. Aeolian on D, which reads as folk-mythic
   * rather than fantasy-orchestral pastiche.
   *
   * Two layers under musicBus:
   *   calmLayer    — low drone/pad, always audible
   *   tensionLayer — detuned minor-second drone + heartbeat, fades in on
   *                  Embertide / crowding / high intensity
   */
  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicTimer !== null) return;
    const ctx = this.ctx;
    this.buildLayers();

    const drone = (freq: number, gain: number, dest: GainNode, detune = 0): void => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lg = ctx.createGain();
      lg.gain.value = gain * 0.45;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      o.connect(g).connect(dest);
      o.start();
    };

    const calm = this.calmLayer as GainNode;
    const tense = this.tensionLayer as GainNode;
    // Calm bed: D drone + fifth + octave.
    drone(73.42, 0.05, calm);
    drone(110, 0.032, calm);
    drone(146.83, 0.02, calm);
    // Tension bed: flat-second rub and a low growl, unsettled but quiet.
    drone(77.78, 0.038, tense, -8);
    drone(155.56, 0.022, tense, 11);
    drone(58.27, 0.03, tense);

    const dAeolian = [146.83, 164.81, 174.61, 196, 220, 233.08, 261.63, 293.66];
    const tick = (): void => {
      if (!this.ctx || !this.musicBus) return;
      const t = this.ctx.currentTime + 0.02;
      this.step++;
      const heat = Math.max(this.intensity, this.tension);
      const density = 0.18 + heat * 0.55;
      if (Math.random() < density) {
        const idx = Math.floor(Math.random() * dAeolian.length);
        const f = (dAeolian[idx] ?? 146.83) * (Math.random() < 0.25 ? 2 : 1);
        const o = ctx.createOscillator();
        o.type = heat > 0.5 ? 'triangle' : 'sine';
        o.frequency.value = f;
        o.detune.value = this.jit(6);
        const g = ctx.createGain();
        const peak = 0.05 + heat * 0.05;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        const dly = ctx.createDelay(1.0);
        dly.delayTime.value = 0.36;
        const fb = ctx.createGain();
        fb.gain.value = 0.28;
        const dest = this.tension > 0.5 ? tense : calm;
        o.connect(g);
        g.connect(dest);
        g.connect(dly);
        dly.connect(fb).connect(dly);
        dly.connect(dest);
        o.start(t);
        o.stop(t + 1.6);
      }
      // Heartbeat percussion only when combat is hot.
      if (heat > 0.45 && this.step % 2 === 0) {
        this.noiseHit(0.08 * heat, 0.12, t, 'lowpass', 220, 70, 0.7);
      }
    };
    this.musicTimer = window.setInterval(tick, 480);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ---- Convenience aliases used by Game.ts (so call sites read as verbs) ----
  swing(v = 0): void { this.play('swing', v); }
  hit(v = 0): void { this.play('hit', v); }
  impact(heavy: boolean, combo: number): void { this.play(heavy ? 'crit' : 'hit', Math.min(4, Math.floor(combo / 8))); }
  whiff(): void { this.play('swing', 0); }
  parryReady(): void { /* armed; nothing to play yet */ }
  parrySuccess(): void { this.play('parry'); }
  enemyAttack(boss: boolean): void { this.play(boss ? 'boss-roar' : 'swing'); }
  telegraph(boss: boolean): void { this.play(boss ? 'boss-roar' : 'ui'); }
  enemyDeath(boss: boolean): void { this.play(boss ? 'boss-roar' : 'kill'); }
  playerHurt(): void { this.play('hurt'); }
  dodge(): void { this.play('parry'); }
  playerDeath(): void { this.play('death'); }
  dash(): void { this.play('dash'); }
  soulPickup(n: number): void { this.play('soul-take', Math.min(4, n % 5)); }
  pickup(r: string): void { this.play(r === 'mythic' ? 'loot-rare' : r === 'relic' ? 'loot-rare' : r === 'rare' ? 'loot-rare' : 'pickup'); }
  lootRare(): void { this.play('loot-rare'); }
  equip(): void { this.play('ui'); }
  drink(): void { this.play('soul-bank'); }
  levelUp(): void { this.play('levelup'); }
  cairnLight(): void { this.play('soul-bank'); }
  bankSouls(_n: number): void { this.play('soul-bank'); }
  discover(): void { this.play('discover'); }
  questComplete(): void { this.play('quest'); }
  secondWind(): void { this.play('levelup'); }
  embertideRise(level: number): void { this.play('embertide', Math.min(4, level)); }
  bossStart(): void { this.play('boss-roar'); }
  bossPhase(p: number): void { this.play('boss-roar', p); }
  victory(): void { this.play('victory'); }
  ui(): void { this.play('ui'); }
  uiBack(): void { this.play('ui-back'); }
  error(): void { this.play('error'); }
  footstep(v = 0): void { this.play('footstep', v); }
  uiClick(): void { this.play('ui'); }
  parry(): void { this.play('parry'); }
  hurt(): void { this.play('hurt'); }
  death(): void { this.play('death'); }
  levelup(): void { this.play('levelup'); }
  setMood(m: 'calm' | 'combat' | 'boss'): void {
    this.setTension(m === 'boss' ? 1 : m === 'combat' ? 0.6 : 0);
  }

  /**
   * Narrate a line of lore/objective via the browser SpeechSynthesis API.
   * Free, no assets, no network. Respects the user's voiceover setting and is a
   * no-op when speech synthesis is unavailable (older browsers, headless).
   */
  narrate(text: string): void {
    if (!this.settings.voiceover) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92; u.pitch = 0.85; u.volume = 0.9;
      const prefer = synth.getVoices().find((v) => /en[-_]GB/i.test(v.lang) && /male|daniel|george|arthur|ralph/i.test(v.name))
        ?? synth.getVoices().find((v) => /en/i.test(v.lang));
      if (prefer) u.voice = prefer;
      synth.cancel(); synth.speak(u);
    } catch { /* speech unavailable - skip */ }
  }
}
