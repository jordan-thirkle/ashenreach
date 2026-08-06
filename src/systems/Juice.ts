import * as THREE from 'three';
import { PALETTE } from '../core/Palette';

export type JuiceTier = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

interface Particle {
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
  gravity: number;
  drag: number;
  size0: number;
  size1: number;
}

/**
 * Trauma-based screen shake + hit-stop + GPU particles + floating numbers.
 * Trauma is quadratic so small hits barely move and big hits punch, and it
 * decays to rest so juice never becomes the new normal.
 */
export class JuiceSystem {
  private trauma = 0;
  private decay = 1.35;
  private t = 0;
  private shakeScale = 1;
  private reduceFlash = false;

  private hitStopUntil = 0;
  private timeScale = 1;

  private points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private col: Float32Array;
  private siz: Float32Array;
  private parts: Particle[] = [];
  private cursor = 0;
  private readonly MAX = 900;

  private flashEl: HTMLDivElement | null = null;
  private vignetteEl: HTMLDivElement | null = null;
  private numbersEl: HTMLDivElement | null = null;

  constructor(scene: THREE.Scene) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.MAX * 3);
    this.col = new Float32Array(this.MAX * 3);
    this.siz = new Float32Array(this.MAX);
    for (let i = 0; i < this.MAX; i++) {
      this.pos[i * 3 + 1] = -9999;
      this.parts.push({
        life: 0, maxLife: 1, vel: new THREE.Vector3(),
        gravity: 0, drag: 0, size0: 0, size1: 0,
      });
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.siz, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (320.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float r = dot(d, d);
          if (r > 0.25) discard;
          float a = smoothstep(0.25, 0.02, r);
          gl_FragColor = vec4(vColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    this.points = new THREE.Points(this.geo, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  attachDom(root: HTMLElement): void {
    const flash = document.createElement('div');
    flash.className = 'fx-flash';
    root.appendChild(flash);
    this.flashEl = flash;

    const vig = document.createElement('div');
    vig.className = 'fx-vignette';
    root.appendChild(vig);
    this.vignetteEl = vig;

    const nums = document.createElement('div');
    nums.className = 'fx-numbers';
    root.appendChild(nums);
    this.numbersEl = nums;
  }

  setShakeScale(v: number): void {
    this.shakeScale = Math.max(0, Math.min(2, v));
  }

  setReduceFlashing(v: boolean): void {
    this.reduceFlash = v;
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeScale);
  }

  hitStop(ms: number): void {
    // Real-time deadline: unaffected by the timescale it sets.
    this.hitStopUntil = Math.max(this.hitStopUntil, performance.now() + ms);
  }

  get scale(): number {
    return this.timeScale;
  }

  flash(color: string, alpha: number, ms: number): void {
    if (!this.flashEl || this.reduceFlash) return;
    const el = this.flashEl;
    el.style.transition = 'none';
    el.style.background = color;
    el.style.opacity = String(alpha);
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${ms}ms ease-out`;
      el.style.opacity = '0';
    });
  }

  /** Number-colour variant so callers can pass PALETTE hex directly. */
  flashNum(color: number, alpha: number, ms: number): void {
    this.flash(`#${color.toString(16).padStart(6, '0')}`, alpha, ms);
  }

  /** Number-colour variant of burst. */
  burstNum(origin: THREE.Vector3, count: number, color: number,
    speed: number, life: number, size: number, gravity = -9, spread = 1): void {
    this.burst(origin, count, color, speed, life, size, gravity, spread);
  }

  setVignette(intensity: number, color = '#6E2A28'): void {
    if (!this.vignetteEl) return;
    this.vignetteEl.style.boxShadow =
      `inset 0 0 ${120 + intensity * 220}px ${20 + intensity * 90}px ${color}`;
    this.vignetteEl.style.opacity = String(Math.min(0.92, intensity));
  }

  /** Floating combat text, pooled through the DOM (cheap at this volume). */
  number(text: string, screenX: number, screenY: number, cls: string): void {
    if (!this.numbersEl) return;
    const el = document.createElement('span');
    el.className = `dmgnum ${cls}`;
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    const drift = (Math.random() - 0.5) * 46;
    el.style.setProperty('--dx', `${drift}px`);
    this.numbersEl.appendChild(el);
    window.setTimeout(() => el.remove(), 1000);
  }

  burst(
    origin: THREE.Vector3, count: number, color: number = PALETTE.rust,
    speed: number, life: number, size: number, gravity = -9, spread = 1,
  ): void {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.MAX;
      const p = this.parts[idx];
      if (!p) continue;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * spread);
      const s = speed * (0.45 + Math.random() * 0.85);
      p.vel.set(
        Math.sin(phi) * Math.cos(theta) * s,
        Math.abs(Math.cos(phi)) * s * 0.95 + Math.random() * s * 0.35,
        Math.sin(phi) * Math.sin(theta) * s,
      );
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.gravity = gravity;
      p.drag = 1.6;
      p.size0 = size * (0.7 + Math.random() * 0.8);
      p.size1 = 0;
      this.pos[idx * 3] = origin.x;
      this.pos[idx * 3 + 1] = origin.y;
      this.pos[idx * 3 + 2] = origin.z;
      const jitter = 0.82 + Math.random() * 0.36;
      this.col[idx * 3] = c.r * jitter;
      this.col[idx * 3 + 1] = c.g * jitter;
      this.col[idx * 3 + 2] = c.b * jitter;
      this.siz[idx] = p.size0;
    }
  }

  /** Named feedback bundles. Tier controls how much of the stack fires. */
  feedback(tier: JuiceTier, pos: THREE.Vector3, color: number = PALETTE.rust): void {
    switch (tier) {
      case 'tiny':
        this.burst(pos, 3, color, 2.2, 0.32, 0.16);
        break;
      case 'small':
        this.addTrauma(0.13);
        this.burst(pos, 7, color, 3.4, 0.42, 0.2);
        break;
      case 'medium':
        this.addTrauma(0.3);
        this.hitStop(45);
        this.burst(pos, 16, color, 5.2, 0.5, 0.26);
        break;
      case 'large':
        this.addTrauma(0.55);
        this.hitStop(85);
        this.burst(pos, 34, color, 7.4, 0.68, 0.34);
        this.burst(pos, 12, PALETTE.bone, 4.2, 0.5, 0.2);
        this.flash('#EFE9DC', 0.16, 110);
        break;
      case 'huge':
        this.addTrauma(0.95);
        this.hitStop(140);
        this.burst(pos, 70, color, 11, 1.0, 0.46);
        this.burst(pos, 30, PALETTE.palegold, 6.5, 0.9, 0.3);
        this.flash('#D4763F', 0.3, 220);
        break;
      default:
        break;
    }
  }

  update(dt: number): void {
    const now = performance.now();
    this.timeScale = now < this.hitStopUntil ? 0.045 : 1;

    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - this.decay * dt);
    this.t += dt;

    const posAttr = this.geo.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geo.attributes.color as THREE.BufferAttribute;
    const sizAttr = this.geo.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < this.MAX; i++) {
      const p = this.parts[i];
      if (!p || p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.pos[i * 3 + 1] = -9999;
        this.siz[i] = 0;
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vel.multiplyScalar(k);
      p.vel.y += p.gravity * dt;
      this.pos[i * 3] += p.vel.x * dt;
      this.pos[i * 3 + 1] += p.vel.y * dt;
      this.pos[i * 3 + 2] += p.vel.z * dt;
      const life01 = p.life / p.maxLife;
      this.siz[i] = p.size1 + (p.size0 - p.size1) * life01;
      const fade = Math.min(1, life01 * 1.6);
      this.col[i * 3] *= 0.5 + 0.5 * fade;
      this.col[i * 3 + 1] *= 0.5 + 0.5 * fade;
      this.col[i * 3 + 2] *= 0.5 + 0.5 * fade;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizAttr.needsUpdate = true;
  }

  /** Camera shake offset. Applied to the camera, never to the player body. */
  applyShake(camera: THREE.Camera): void {
    if (this.trauma <= 0.001) return;
    const s = this.trauma * this.trauma;
    const t = this.t * 34;
    camera.position.x += Math.sin(t * 1.7) * 0.42 * s;
    camera.position.y += Math.sin(t * 2.31) * 0.32 * s;
    camera.position.z += Math.sin(t * 1.13) * 0.28 * s;
    camera.rotation.z += Math.sin(t * 1.07) * 0.035 * s;
  }
}
