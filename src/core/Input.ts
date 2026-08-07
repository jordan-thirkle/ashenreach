import type { Settings } from './Types';

const DEFAULT_BINDS: Record<string, string> = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  dash: 'Space', attack: 'Mouse0', heavy: 'Mouse2', parry: 'ShiftLeft',
  interact: 'KeyE', ability1: 'KeyQ', ability2: 'KeyR',
  map: 'KeyM', inventory: 'KeyI', skills: 'KeyK', codex: 'KeyJ',
  pause: 'Escape', sprint: 'ControlLeft',
};

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8, musicVolume: 0.5, sfxVolume: 0.85,
  screenShake: 1.0, difficulty: 'warden',
  colorblindMarkers: true, subtitles: true, voiceover: true, reduceFlashing: false,
  invertY: false, sensitivity: 1.0, quality: 'high',
  keybinds: { ...DEFAULT_BINDS },
};

export interface InputFrame {
  moveX: number;
  moveZ: number;
  yaw: number;
  pitch: number;
  lookX: number;
  lookY: number;
  zoom: number;
  attack: boolean;
  attackHeld: boolean;
  heavy: boolean;
  dash: boolean;
  parry: boolean;
  parryHeld: boolean;
  interact: boolean;
  ability1: boolean;
  ability2: boolean;
  sprint: boolean;
}

const EMPTY: InputFrame = {
  moveX: 0, moveZ: 0, yaw: 0, pitch: 0, lookX: 0, lookY: 0, zoom: 0,
  attack: false, attackHeld: false, heavy: false, dash: false,
  parry: false, parryHeld: false, interact: false,
  ability1: false, ability2: false, sprint: false,
};

export class InputManager {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private mouse = new Set<number>();
  private mousePressed = new Set<number>();
  private dx = 0;
  private dy = 0;
  private binds: Record<string, string>;
  private el: HTMLElement;
  private uiHandlers: Array<(code: string) => void> = [];

  /** Mobile virtual stick state, driven by MobileControls. */
  stick = { x: 0, y: 0, active: false };
  look = { x: 0, y: 0, z: 0 };
  touchBtn = {
    attack: false, dash: false, parry: false,
    interact: false, ability1: false, ability2: false,
  };
  pointerLocked = false;
  sensitivity = 1;
  invertY = false;
  settings: Settings;

  constructor(el: HTMLElement, settings: Settings) {
    this.el = el;
    this.binds = { ...settings.keybinds };
    this.sensitivity = settings.sensitivity;
    this.invertY = settings.invertY;
    this.settings = settings;
    this.attach();
  }

  setBinds(b: Record<string, string>): void {
    this.binds = { ...b };
  }

  onUiKey(fn: (code: string) => void): void {
    this.uiHandlers.push(fn);
  }

  private attach(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // Don't swallow browser shortcuts / devtools.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      for (const fn of this.uiHandlers) fn(e.code);
      if (['Space', 'Tab', 'KeyM', 'KeyI', 'KeyK', 'KeyJ'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.clear();
    });

    this.el.addEventListener('mousedown', (e) => {
      this.mouse.add(e.button);
      this.mousePressed.add(e.button);
    });
    window.addEventListener('mouseup', (e) => this.mouse.delete(e.button));
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.el;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
  }

  requestLock(): void {
    if (!this.pointerLocked && this.el.requestPointerLock) {
      void this.el.requestPointerLock();
    }
  }

  exitLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  releasePointer(): void { this.exitLock(); }

  private interactPressed = false;
  consumeInteract(): boolean {
    if (this.interactPressed) { this.interactPressed = false; return true; }
    return false;
  }

  /** Consume one frame of input. Call once per tick. */
  poll(_dt: number, _enabled = true): InputFrame {
    const f = this.sample(_enabled);
    if (f.interact) this.interactPressed = true;
    return f;
  }

  private down(action: string): boolean {
    const code = this.binds[action];
    if (!code) return false;
    if (code.startsWith('Mouse')) return this.mouse.has(Number(code.slice(5)));
    return this.keys.has(code);
  }

  private hit(action: string): boolean {
    const code = this.binds[action];
    if (!code) return false;
    if (code.startsWith('Mouse')) return this.mousePressed.has(Number(code.slice(5)));
    return this.pressed.has(code);
  }

  /** Consume one frame of input. Call once per tick. */
  sample(enabled: boolean): InputFrame {
    if (!enabled) {
      this.pressed.clear();
      this.mousePressed.clear();
      this.dx = 0;
      this.dy = 0;
      return { ...EMPTY };
    }

    let mx = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    let mz = (this.down('back') ? 1 : 0) - (this.down('forward') ? 1 : 0);

    if (this.stick.active) {
      mx += this.stick.x;
      mz += this.stick.y;
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }

    const yaw = -this.dx * 0.0022 * this.sensitivity - this.look.x * 0.05;
    const pitchRaw = -this.dy * 0.0022 * this.sensitivity - this.look.y * 0.05;
    const pitch = this.invertY ? -pitchRaw : pitchRaw;

    const frame: InputFrame = {
      moveX: mx,
      moveZ: mz,
      yaw,
      pitch,
      lookX: this.look.x,
      lookY: this.look.y,
      zoom: this.look.z,
      attack: this.hit('attack') || this.touchBtn.attack,
      attackHeld: this.down('attack'),
      heavy: this.hit('heavy'),
      dash: this.hit('dash') || this.touchBtn.dash,
      parry: this.hit('parry') || this.touchBtn.parry,
      parryHeld: this.down('parry') || this.touchBtn.parry,
      interact: this.hit('interact') || this.touchBtn.interact,
      ability1: this.hit('ability1') || this.touchBtn.ability1,
      ability2: this.hit('ability2') || this.touchBtn.ability2,
      sprint: this.down('sprint'),
    };

    this.pressed.clear();
    this.mousePressed.clear();
    this.dx = 0;
    this.dy = 0;
    this.look.x = 0;
    this.look.y = 0;
    this.touchBtn.attack = false;
    this.touchBtn.dash = false;
    this.touchBtn.interact = false;
    this.touchBtn.ability1 = false;
    this.touchBtn.ability2 = false;
    return frame;
  }
}

export const isTouchDevice = (): boolean =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;
