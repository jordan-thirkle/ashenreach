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

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  r0: number;
  r1: number;
  alpha0: number;
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
  private dirPool: HTMLDivElement[] = [];

  // Pooled impact rings (expanding + fading discs). Cheap, hard-capped.
  private readonly RING_MAX = 12;
  private rings: Ring[] = [];
  private ringCursor = 0;
  private ringGeo: THREE.RingGeometry | null = null;

  constructor(scene: THREE.Scene) {
    this.initRings(scene);
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

  /** Directional damage indicator: a brief edge arrow showing where a hit came from. */
  dirMark(ang: number): void {
    if (!this.numbersEl || this.reduceFlash) return;
    let el = this.dirPool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'hurt-dir';
      this.numbersEl.appendChild(el);
    }
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const R = Math.min(cx, cy) * 0.72;
    const x = cx + R * Math.sin(ang);
    const y = cy - R * Math.cos(ang);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = `translate(-50%, -50%) rotate(${ang}rad)`;
    el.style.opacity = '0.9';
    el.style.display = 'block';
    const start = performance.now();
    const dur = 520;
    const tick = (): void => {
      const k = (performance.now() - start) / dur;
      if (k >= 1) { el.style.display = 'none'; this.dirPool.push(el); return; }
      el.style.opacity = String(0.9 * (1 - k));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
        this.addTrauma(0.6);
        this.hitStop(95);
        this.burst(pos, 34, color, 7.4, 0.68, 0.34);
        this.burst(pos, 14, PALETTE.bone, 4.6, 0.5, 0.22);
        // Ember ground ring + strong ember screen pulse so the damage flash reads.
        this.pop(pos.x, pos.y, pos.z, PALETTE.ember, 2.8, 0.5, 0.85);
        this.flashNum(PALETTE.ember, 0.42, 200);
        break;
      case 'huge':
        this.addTrauma(1.0);
        this.hitStop(150);
        this.burst(pos, 70, color, 11, 1.0, 0.46);
        this.burst(pos, 30, PALETTE.palegold, 6.5, 0.9, 0.3);
        this.pop(pos.x, pos.y, pos.z, PALETTE.ember, 3.6, 0.6, 0.95);
        this.flashNum(PALETTE.ember, 0.6, 320);
        break;
      default:
        break;
    }
  }

  private initRings(scene: THREE.Scene): void {
    // One shared unit-radius ring geometry; per-instance scale drives growth.
    this.ringGeo = new THREE.RingGeometry(0.72, 1.0, 28);
    for (let i = 0; i < this.RING_MAX; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: PALETTE.ember,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      scene.add(mesh);
      this.rings.push({ mesh, mat, life: 0, maxLife: 1, r0: 0.3, r1: 2, alpha0: 0.5 });
    }
  }

  /**
   * Short-lived expanding ground ring at a world position.
   * Used for enemy death / soul bank / heavy landings. Pooled, max 12 live.
   */
  pop(
    x: number, y: number, z: number,
    color: number = PALETTE.ember,
    radius = 2.6, life = 0.5, alpha = 0.8,
  ): void {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.RING_MAX;
    if (!r) return;
    r.mesh.position.set(x, y + 0.06, z);
    r.mesh.rotation.x = -Math.PI / 2;
    r.mesh.rotation.z = Math.random() * Math.PI;
    const rad = Math.max(2.0, radius);
    r.mat.color.setHex(color);
    r.r0 = rad * 0.22;
    r.r1 = rad;
    r.maxLife = life;
    r.life = life;
    r.alpha0 = this.reduceFlash ? alpha * 0.5 : alpha;
    r.mesh.scale.setScalar(r.r0);
    r.mat.opacity = r.alpha0;
    r.mesh.visible = true;
  }

  /** Vector convenience wrapper for pop(). */
  impactBurst(origin: THREE.Vector3, color: number = PALETTE.ember, radius = 2.6): void {
    this.pop(origin.x, origin.y, origin.z, color, radius);
  }

  /**
   * Parry feedback: a tight bone-white screen kiss plus an ember ring.
   * Deliberately shorter and cooler than the damage flash so the two read apart.
   */
  parryFlash(origin?: THREE.Vector3): void {
    // Bone-white screen kiss — bright and held a beat longer so the parry reads instantly.
    this.flashNum(PALETTE.bone, 0.5, 170);
    // Ember-tinted punch: harder shake + slightly longer, embered hit-stop.
    this.addTrauma(0.34);
    this.hitStop(95);
    if (origin) {
      // Big ember ground ring.
      this.pop(origin.x, origin.y, origin.z, PALETTE.ember, 3.0, 0.45, 0.9);
      // Bone-white "kiss" ring just inside it.
      this.pop(origin.x, origin.y, origin.z, PALETTE.bone, 2.2, 0.4, 0.85);
      this.burst(origin, 22, PALETTE.palegold, 6.5, 0.4, 0.22, -3, 1.5);
      this.burst(origin, 14, PALETTE.ember, 8.5, 0.45, 0.28, -5, 1.2);
    }
  }

  /** Strong ember (0xd9763a) screen pulse for heavy hits / big damage. */
  damageFlash(): void {
    this.flashNum(PALETTE.ember, 0.5, 260);
  }

  private updateRings(dt: number): void {
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r || r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
        r.mat.opacity = 0;
        continue;
      }
      const k = 1 - r.life / r.maxLife;      // 0 -> 1 over lifetime
      const ease = 1 - (1 - k) * (1 - k);     // ease-out expansion
      r.mesh.scale.setScalar(r.r0 + (r.r1 - r.r0) * ease);
      r.mat.opacity = r.alpha0 * (1 - k) * (1 - k);
    }
  }

  update(dt: number): void {
    const now = performance.now();
    this.timeScale = now < this.hitStopUntil ? 0.045 : 1;

    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - this.decay * dt);
    this.t += dt;
    this.updateRings(dt);

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
