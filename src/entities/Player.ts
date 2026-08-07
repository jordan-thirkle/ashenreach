import * as THREE from 'three';
import type { Stats } from '../core/Types';
import type { InputFrame } from '../core/Input';
import type { Terrain } from '../world/Terrain';
import { buildHumanoid, buildWeapon, type CharacterRig } from './Rigs';
import { PALETTE } from '../core/Palette';
import { damp } from '../world/Noise';

export type PlayerState = 'idle' | 'move' | 'attack' | 'dash' | 'parry' | 'hurt' | 'dead';

const WALK = 5.4;
const SPRINT = 8.6;
const DASH_SPEED = 21;
const DASH_TIME = 0.19;
const DASH_COST = 22;
const PARRY_WINDOW = 0.22;
const COYOTE = 0.12;

export class Player {
  readonly rig: CharacterRig;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  facing = 0;
  state: PlayerState = 'idle';
  stateT = 0;

  hp = 100;
  maxHp = 100;
  stamina = 100;
  maxStamina = 100;

  combo = 0;
  comboTimer = 0;
  chain = 0;
  attackT = 0;
  attackWindow = false;
  attackQueued = false;
  swingTime = 0.42;

  dashT = 0;
  dashDir = new THREE.Vector3();
  dashCooldown = 0;
  iframes = 0;
  parryT = 0;
  parrySuccess = 0;
  hurtT = 0;
  animT = 0;

  souls = 0;
  carrySpeedMult = 1;
  secondWindUsed = false;
  lastGroundY = 0;
  private airT = 0;
  private stepT = 0;

  private weaponGroup: THREE.Group | null = null;
  private stats: Stats;

  constructor(stats: Stats) {
    this.stats = stats;
    this.rig = buildHumanoid({
      skin: 0xb8a892,
      cloth: PALETTE.peat,
      accent: PALETTE.rust,
      cloak: true,
      bulk: 1.0,
    });
    this.setWeapon('blade', PALETTE.rust);
  }

  setStats(s: Stats): void {
    this.stats = s;
  }

  setWeapon(archetype: string, tint: number, swingTime = 0.42): void {
    if (this.weaponGroup) this.rig.weapon.remove(this.weaponGroup);
    this.weaponGroup = buildWeapon(archetype, tint);
    this.rig.weapon.add(this.weaponGroup);
    this.swingTime = swingTime;
  }

  /** Combo chain: 3 hits, each faster, third has the biggest arc. */
  private startAttack(): void {
    this.chain = (this.chain % 3) + 1;
    this.state = 'attack';
    this.stateT = 0;
    this.attackT = 0;
    this.attackWindow = true;
    this.attackQueued = false;
  }

  get chainSwingTime(): number {
    return this.swingTime * (this.chain === 3 ? 1.25 : this.chain === 2 ? 0.85 : 1.0);
  }

  get chainDamageMult(): number {
    return this.chain === 3 ? 1.55 : this.chain === 2 ? 1.1 : 1.0;
  }

  update(
    input: InputFrame, dt: number, terrain: Terrain, camYaw: number,
    onSwing: (chain: number) => void,
    onDash: () => void,
    onParry: () => void,
    onFootstep: (speed: number) => void,
  ): void {
    if (this.state === 'dead') {
      this.animT += dt;
      this.animateDeath();
      return;
    }

    this.animT += dt;
    this.stateT += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.parrySuccess = Math.max(0, this.parrySuccess - dt);

    // Stamina regen stalls briefly after spending.
    const regen = this.stats.staminaRegen * 26;
    if (this.state !== 'dash' && this.stateT > 0.25) {
      this.stamina = Math.min(this.maxStamina, this.stamina + regen * dt);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.chain = 0;
      }
    }

    // --- Dash: iframes + burst, gated by stamina and cooldown ---
    if (this.state === 'dash') {
      this.dashT -= dt;
      this.vel.copy(this.dashDir).multiplyScalar(DASH_SPEED * (this.dashT / DASH_TIME + 0.35));
      if (this.dashT <= 0) {
        this.state = 'idle';
        this.stateT = 0;
      }
    } else if (
      input.dash && this.dashCooldown <= 0 && this.stamina >= DASH_COST &&
      this.state !== 'attack'
    ) {
      const dir = this.moveDir(input, camYaw);
      if (dir.lengthSq() < 0.01) dir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      this.dashDir.copy(dir).normalize();
      this.state = 'dash';
      this.stateT = 0;
      this.dashT = DASH_TIME;
      this.dashCooldown = 0.42;
      this.iframes = DASH_TIME + 0.09;
      this.stamina -= DASH_COST;
      this.facing = Math.atan2(this.dashDir.x, this.dashDir.z);
      onDash();
    }

    // --- Parry: short active window, huge reward on success ---
    if (input.parry && this.state !== 'dash' && this.state !== 'attack' && this.parryT <= 0) {
      this.parryT = PARRY_WINDOW + 0.28;
      this.state = 'parry';
      this.stateT = 0;
      onParry();
    }
    if (this.parryT > 0) this.parryT -= dt;

    // --- Attack: input buffering so the chain never feels dropped ---
    if (this.state === 'attack') {
      this.attackT += dt;
      const total = this.chainSwingTime;
      if (this.attackWindow && this.attackT >= total * 0.42) {
        this.attackWindow = false;
        onSwing(this.chain);
      }
      if (input.attack && this.attackT > total * 0.35) this.attackQueued = true;
      if (this.attackT >= total) {
        if (this.attackQueued) this.startAttack();
        else {
          this.state = 'idle';
          this.stateT = 0;
        }
      }
      this.vel.multiplyScalar(Math.pow(0.06, dt));
    } else if (input.attack && this.state !== 'dash') {
      this.startAttack();
    }

    // --- Locomotion ---
    if (this.state !== 'dash' && this.state !== 'attack') {
      const dir = this.moveDir(input, camYaw);
      const sprinting = input.sprint && this.stamina > 6 && dir.lengthSq() > 0.05;
      if (sprinting) this.stamina = Math.max(0, this.stamina - 13 * dt);
      const base = sprinting ? SPRINT : WALK;
      const speed = base * (1 + this.stats.moveSpeed) * this.carrySpeedMult *
        (this.state === 'parry' ? 0.35 : 1);

      if (dir.lengthSq() > 0.001) {
        this.vel.x = damp(this.vel.x, dir.x * speed, 16, dt);
        this.vel.z = damp(this.vel.z, dir.z * speed, 16, dt);
        this.facing = angleDamp(this.facing, Math.atan2(dir.x, dir.z), 16, dt);
        if (this.state === 'idle') this.state = 'move';
        // Footstep cadence scales with ground speed - immersion hook.
        const sp = Math.hypot(this.vel.x, this.vel.z);
        this.stepT -= dt;
        if (this.stepT <= 0 && sp > 1.2) {
          this.stepT = sp > 7 ? 0.26 : 0.40;
          onFootstep(sp);
        }
      } else {
        this.vel.x = damp(this.vel.x, 0, 19, dt);
        this.vel.z = damp(this.vel.z, 0, 19, dt);
        if (this.state === 'move') this.state = 'idle';
      }
    }

    // --- Integrate with slope-aware collision ---
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    if (terrain.walkable(nx, this.pos.z)) this.pos.x = nx;
    else this.vel.x *= -0.1;
    if (terrain.walkable(this.pos.x, nz)) this.pos.z = nz;
    else this.vel.z *= -0.1;

    const ground = terrain.height(this.pos.x, this.pos.z);
    // Smooth the vertical so slopes don't jitter the camera.
    this.pos.y = damp(this.pos.y, ground, 18, dt);
    if (Math.abs(this.pos.y - ground) < 0.15) this.airT = 0;
    else this.airT += dt;
    this.lastGroundY = ground;
    if (this.state === 'move') this.stepT = Math.max(this.stepT, 0);

    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.facing;
    this.animate(dt);
  }

  private moveDir(input: InputFrame, camYaw: number): THREE.Vector3 {
    const v = new THREE.Vector3(input.moveX, 0, input.moveZ);
    if (v.lengthSq() > 1) v.normalize();
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);
    return v;
  }

  private animate(dt: number): void {
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const gait = this.animT * (5.2 + speed * 0.9);
    const amp = Math.min(1.05, speed * 0.16);

    if (this.state === 'attack') {
      const t = Math.min(1, this.attackT / this.chainSwingTime);
      // Anticipation -> strike -> recovery, eased, per chain step.
      const wind = t < 0.42 ? -(t / 0.42) * 1.9 : 0;
      const strike = t >= 0.42 ? 1.9 - ((t - 0.42) / 0.58) * 2.3 : 0;
      const swing = wind + strike;
      if (this.chain === 3) {
        this.rig.armR.rotation.z = swing * 0.5;
        this.rig.armR.rotation.x = swing * 0.75;
        this.rig.torso.rotation.y = swing * 0.55;
        this.rig.root.rotation.y = this.facing + swing * 0.32;
      } else {
        this.rig.armR.rotation.x = swing;
        this.rig.armR.rotation.z = this.chain === 2 ? -swing * 0.35 : swing * 0.2;
        this.rig.torso.rotation.y = -swing * 0.32;
      }
      this.rig.armL.rotation.x = -swing * 0.28;
    } else if (this.state === 'dash') {
      const t = 1 - this.dashT / DASH_TIME;
      this.rig.torso.rotation.x = -0.5 * (1 - t);
      this.rig.armL.rotation.x = 1.4 * (1 - t);
      this.rig.armR.rotation.x = 1.4 * (1 - t);
      this.rig.legL.rotation.x = -1.0 * (1 - t);
      this.rig.legT.rotation.x = 0.7 * (1 - t);
    } else if (this.state === 'parry') {
      this.rig.armR.rotation.x = -1.15;
      this.rig.armR.rotation.z = -0.55;
      this.rig.armL.rotation.x = -0.5;
      this.rig.torso.rotation.y = 0.4;
    } else {
      this.rig.legL.rotation.x = Math.sin(gait) * amp;
      this.rig.legT.rotation.x = Math.sin(gait + Math.PI) * amp;
      this.rig.armL.rotation.x = Math.sin(gait + Math.PI) * amp * 0.8;
      this.rig.armR.rotation.x = Math.sin(gait) * amp * 0.8;
      this.rig.torso.rotation.y = damp(this.rig.torso.rotation.y, 0, 10, dt);
      this.rig.torso.rotation.x = damp(this.rig.torso.rotation.x, 0, 10, dt);
      this.rig.armR.rotation.z = damp(this.rig.armR.rotation.z, 0, 10, dt);
      // Breathing idle so a standing player is never fully static.
      if (speed < 0.4) {
        this.rig.torso.position.y = 1.16 + Math.sin(this.animT * 1.7) * 0.012;
      }
      this.rig.root.position.y = this.pos.y + Math.abs(Math.sin(gait)) * amp * 0.045;
    }

    if (this.hurtT > 0) {
      this.rig.root.position.x += Math.sin(this.hurtT * 60) * 0.03;
    }
    if (this.rig.cloak) {
      // Cloak lags behind movement - reads as weight.
      this.rig.cloak.rotation.x = -Math.min(0.5, speed * 0.05);
      this.rig.cloak.rotation.z = Math.sin(this.animT * 2.1) * 0.04;
    }
  }

  private animateDeath(): void {
    const t = Math.min(1, this.stateT / 1.1);
    const e = 1 - Math.pow(1 - t, 3);
    this.rig.root.rotation.x = e * (Math.PI / 2) * 0.86;
    this.rig.root.position.y = this.lastGroundY + 0.2 * (1 - e);
    this.rig.armL.rotation.x = e * 1.1;
    this.rig.armR.rotation.x = e * 0.7;
  }

  takeDamage(amount: number): { blocked: boolean; parried: boolean; died: boolean } {
    if (this.iframes > 0) return { blocked: true, parried: false, died: false };
    // Active parry window converts the hit into a counter opportunity.
    if (this.state === 'parry' && this.parryT > 0.28 - PARRY_WINDOW) {
      this.parrySuccess = 0.6;
      this.stamina = Math.min(this.maxStamina, this.stamina + 18);
      return { blocked: true, parried: true, died: false };
    }
    this.hp -= amount;
    this.hurtT = 0.28;
    this.iframes = 0.28;
    if (this.hp <= 0) {
      this.hp = 0;
      return { blocked: false, parried: false, died: true };
    }
    return { blocked: false, parried: false, died: false };
  }

  kill(): void {
    this.state = 'dead';
    this.stateT = 0;
    this.vel.set(0, 0, 0);
  }

  revive(pos: THREE.Vector3, hp: number): void {
    this.state = 'idle';
    this.stateT = 0;
    this.hp = hp;
    this.stamina = this.maxStamina;
    this.combo = 0;
    this.chain = 0;
    this.souls = 0;
    this.secondWindUsed = false;
    this.pos.copy(pos);
    this.rig.root.rotation.set(0, this.facing, 0);
    this.rig.armL.rotation.set(0, 0, 0);
    this.rig.armR.rotation.set(0, 0, 0);
  }

  get airborne(): boolean {
    return this.airT > COYOTE;
  }
}

function angleDamp(a: number, b: number, lambda: number, dt: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}
