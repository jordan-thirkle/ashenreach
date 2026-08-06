import * as THREE from 'three';
import type { EnemyDef, Vec3 } from '../core/Types';
import type { Terrain } from '../world/Terrain';
import type { CharacterRig } from '../entities/Rigs';
import { setColossusPhaseVisual } from '../entities/Rigs';
import { damp } from '../world/Noise';

export type AiState = 'idle' | 'patrol' | 'chase' | 'attack' | 'recover' | 'flee' | 'stagger' | 'dead';

export interface Enemy {
  id: string;
  def: EnemyDef;
  rig: CharacterRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  damage: number;
  state: AiState;
  stateT: number;
  facing: number;
  cooldown: number;
  target: THREE.Vector3;
  home: THREE.Vector3;
  patrolAngle: number;
  animT: number;
  flashT: number;
  staggerT: number;
  telegraphT: number;
  alive: boolean;
  soulValue: number;
  lastAttack: number;
  summonCount: number;
  phase: number;
  distToPlayer: number;
  /** Boss-only: last phase this AI reacted to, for one-shot transition cues. */
  seenPhase?: number;
  /** Boss-only: decaying flash used as the visible phase-transition punch. */
  phaseFlashT?: number;
  /** Boss-only: horizontal sweep progress for arc attacks (phase 2+). */
  sweepT?: number;
}

/** Per-phase Colossus tuning. Phase 1 is the shipped baseline. */
export interface BossPhaseTuning {
  /** Multiplier on attackCooldown - lower is a faster cadence. */
  cadence: number;
  /** Telegraph duration in seconds. */
  telegraph: number;
  /** Half-width of the arm sweep in radians. 0 = pure vertical slam. */
  arc: number;
  /** Movement speed multiplier while chasing. */
  speed: number;
  /** Reach multiplier applied to the def attackRange. */
  reach: number;
}

const BOSS_PHASES: Record<number, BossPhaseTuning> = {
  1: { cadence: 1.0, telegraph: 0.85, arc: 0.0, speed: 1.0, reach: 1.0 },
  2: { cadence: 0.68, telegraph: 0.62, arc: 1.15, speed: 1.18, reach: 1.12 },
  3: { cadence: 0.44, telegraph: 0.42, arc: 1.9, speed: 1.42, reach: 1.28 },
};

/** True only for the Colossus boss - every escalation below is gated on this. */
function isColossus(e: Enemy): boolean {
  return e.def.boss === true && e.def.kind === 'colossus';
}

/** Phase derived from HP thresholds (66% / 33%), clamped to a monotonic rise. */
export function colossusPhaseFor(e: Enemy): number {
  const hp01 = e.maxHp > 0 ? e.hp / e.maxHp : 1;
  const want = hp01 <= 0.33 ? 3 : hp01 <= 0.66 ? 2 : 1;
  return Math.max(want, e.phase || 1);
}

function tuning(e: Enemy): BossPhaseTuning {
  return BOSS_PHASES[Math.max(1, Math.min(3, e.phase || 1))] ?? BOSS_PHASES[1];
}

const V = new THREE.Vector3();

/**
 * Enemy AI: a finite state machine with a telegraph phase before every
 * attack. The telegraph is the whole reason the combat is readable - a
 * player must be able to see the wind-up and react, which is what
 * separates Death's Door-tier combat from a damage-sponge brawl.
 */
export function updateEnemy(
  e: Enemy,
  playerPos: THREE.Vector3,
  dt: number,
  terrain: Terrain,
  aggroMult: number,
  onAttack: (e: Enemy) => void,
  onTelegraph: (e: Enemy) => void,
): void {
  if (!e.alive) return;

  e.animT += dt;
  e.stateT += dt;
  e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt);

  const dist = e.pos.distanceTo(playerPos);
  e.distToPlayer = dist;
  const aggro = e.def.aggroRange * aggroMult;

  // --- Colossus 3-phase escalation (boss only; all other enemies untouched).
  const boss = isColossus(e);
  const tune = boss ? tuning(e) : null;
  if (boss) {
    // Game.ts owns the authoritative phase bump (it fires shake/adds/toast).
    // We only react to it here, and self-advance if nothing else did.
    const want = colossusPhaseFor(e);
    if (want > e.phase) e.phase = want;
    if (e.seenPhase === undefined) e.seenPhase = e.phase;
    if (e.phase > e.seenPhase) {
      e.seenPhase = e.phase;
      e.phaseFlashT = 0.9;      // brief visible punch
      e.cooldown = Math.max(e.cooldown, 0.5); // short pause on transition
      e.telegraphT = 0;
      setState(e, 'recover');
    }
    e.phaseFlashT = Math.max(0, (e.phaseFlashT ?? 0) - dt * 1.6);
    setColossusPhaseVisual(e.rig, e.phase, e.animT, e.phaseFlashT);
  }

  if (e.staggerT > 0) {
    e.staggerT -= dt;
    e.state = 'stagger';
    e.vel.multiplyScalar(Math.pow(0.0012, dt));
    applyMotion(e, dt, terrain);
    animateStagger(e);
    return;
  }

  switch (e.state) {
    case 'idle':
      if (e.stateT > 1.6) setState(e, 'patrol');
      if (dist < aggro) setState(e, 'chase');
      break;

    case 'patrol': {
      if (dist < aggro) {
        setState(e, 'chase');
        break;
      }
      e.patrolAngle += dt * 0.32;
      const px = e.home.x + Math.cos(e.patrolAngle) * 7;
      const pz = e.home.z + Math.sin(e.patrolAngle) * 7;
      steer(e, px, pz, e.def.speed * 0.42, dt);
      if (e.stateT > 7) setState(e, 'idle');
      break;
    }

    case 'chase': {
      if (dist > aggro * 1.85) {
        setState(e, 'patrol');
        break;
      }
      if (dist < e.def.attackRange * (tune?.reach ?? 1) && e.cooldown <= 0) {
        setState(e, 'attack');
        e.telegraphT = telegraphTimeFor(e);
        e.sweepT = 0;
        onTelegraph(e);
        break;
      }
      // Ranged enemies keep their spacing instead of walking into melee.
      if (e.def.ability === 'volley' && dist < e.def.attackRange * 0.45) {
        const away = V.copy(e.pos).sub(playerPos).normalize();
        steer(e, e.pos.x + away.x * 6, e.pos.z + away.z * 6, e.def.speed * 0.8, dt);
      } else {
        // Slight strafe offset so packs surround instead of conga-lining.
        const off = Math.sin(e.animT * 0.7 + e.pos.x) * 2.4;
        const dir = V.copy(playerPos).sub(e.pos).normalize();
        const px = playerPos.x - dir.x * e.def.attackRange * 0.7 + dir.z * off;
        const pz = playerPos.z - dir.z * e.def.attackRange * 0.7 - dir.x * off;
        steer(e, px, pz, e.def.speed * (tune?.speed ?? 1), dt);
      }
      break;
    }

    case 'attack': {
      e.vel.multiplyScalar(Math.pow(0.02, dt));
      // Phase 3 keeps tracking hard through the wind-up; phase 1 commits early.
      faceTowards(e, playerPos, dt, boss ? 3 + (e.phase - 1) * 3.5 : 9);
      if (e.telegraphT > 0) {
        e.telegraphT -= dt;
        if (e.telegraphT <= 0) {
          onAttack(e);
          e.cooldown = e.def.attackCooldown * (tune?.cadence ?? 1);
          e.sweepT = 0;
          setState(e, 'recover');
        }
      }
      break;
    }

    case 'recover':
      e.vel.multiplyScalar(Math.pow(0.05, dt));
      if (e.stateT > 0.34) setState(e, 'chase');
      break;

    case 'flee': {
      const away = V.copy(e.pos).sub(playerPos).normalize();
      steer(e, e.pos.x + away.x * 14, e.pos.z + away.z * 14, e.def.speed * 1.2, dt);
      if (e.stateT > 3) setState(e, 'chase');
      break;
    }

    default:
      break;
  }

  applyMotion(e, dt, terrain);
  if (boss) animateColossus(e, dt);
  else animateLimbs(e);
}

/** Telegraph length; the Colossus shortens its wind-up as phases escalate. */
function telegraphTimeFor(e: Enemy): number {
  if (isColossus(e)) return tuning(e).telegraph;
  return telegraphTime(e.def);
}

/**
 * Colossus animation. Phase 1 is a slow overhead slam. Phase 2 adds a
 * horizontal sweeping arc through the wind-up and release; phase 3 widens
 * that arc and drives it faster, with the whole body leaning into it.
 */
function animateColossus(e: Enemy, dt: number): void {
  const t = tuning(e);
  const speed = Math.hypot(e.vel.x, e.vel.z);
  const gait = e.animT * (2.2 + speed * 0.9);
  const amp = Math.min(0.6, speed * 0.16);

  e.rig.legL.rotation.x = Math.sin(gait) * amp;
  e.rig.legT.rotation.x = Math.sin(gait + Math.PI) * amp;

  if (e.state === 'attack' && e.telegraphT > 0) {
    const total = Math.max(0.01, t.telegraph);
    const k = 1 - e.telegraphT / total;               // 0 -> 1 through the wind-up
    e.sweepT = (e.sweepT ?? 0) + dt;
    const swing = Math.sin(k * Math.PI * 0.5);
    // Vertical rear-back, shared by all phases.
    e.rig.armR.rotation.x = -2.3 * (1 - swing) - 0.25;
    e.rig.armL.rotation.x = -1.4 * (1 - swing) * (t.arc > 0 ? 1 : 0.3);
    // Horizontal arc: zero in phase 1, wide and fast in phase 3.
    e.rig.armR.rotation.z = -t.arc * (1 - swing);
    e.rig.armL.rotation.z = t.arc * (1 - swing);
    e.rig.torso.rotation.y = -t.arc * 0.45 * (1 - swing) - 0.3 * (1 - swing);
    e.rig.root.position.y = e.pos.y - 0.12 * (1 - swing) * e.phase;
  } else if (e.state === 'recover') {
    const k = Math.min(1, e.stateT / 0.34);
    e.rig.armR.rotation.x = 1.6 * (1 - k);
    e.rig.armL.rotation.x = 0.9 * (1 - k) * (t.arc > 0 ? 1 : 0.3);
    e.rig.armR.rotation.z = t.arc * (1 - k);
    e.rig.armL.rotation.z = -t.arc * (1 - k);
    e.rig.torso.rotation.y = t.arc * 0.4 * (1 - k);
    e.rig.root.position.y = e.pos.y;
  } else {
    const idle = Math.sin(gait) * amp * 0.5;
    e.rig.armR.rotation.x = idle;
    e.rig.armL.rotation.x = -idle;
    e.rig.armR.rotation.z *= 0.88;
    e.rig.armL.rotation.z *= 0.88;
    e.rig.torso.rotation.y *= 0.9;
    e.rig.root.position.y = e.pos.y + Math.abs(Math.sin(gait)) * amp * 0.04;
  }
}

function telegraphTime(def: EnemyDef): number {
  if (def.boss) return 0.85;
  if (def.elite) return 0.5;
  if (def.ability === 'volley') return 0.62;
  if (def.ability === 'charge') return 0.38;
  return 0.45;
}

function setState(e: Enemy, s: AiState): void {
  e.state = s;
  e.stateT = 0;
}

function steer(e: Enemy, tx: number, tz: number, speed: number, dt: number): void {
  const dx = tx - e.pos.x;
  const dz = tz - e.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const ax = (dx / len) * speed;
  const az = (dz / len) * speed;
  e.vel.x = damp(e.vel.x, ax, 6, dt);
  e.vel.z = damp(e.vel.z, az, 6, dt);
  const want = Math.atan2(dx, dz);
  e.facing = angleDamp(e.facing, want, 7, dt);
}

function faceTowards(e: Enemy, p: THREE.Vector3, dt: number, rate: number): void {
  const want = Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
  e.facing = angleDamp(e.facing, want, rate, dt);
}

function angleDamp(a: number, b: number, lambda: number, dt: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}

function applyMotion(e: Enemy, dt: number, terrain: Terrain): void {
  const nx = e.pos.x + e.vel.x * dt;
  const nz = e.pos.z + e.vel.z * dt;
  if (terrain.walkable(nx, e.pos.z)) e.pos.x = nx;
  else e.vel.x *= -0.35;
  if (terrain.walkable(e.pos.x, nz)) e.pos.z = nz;
  else e.vel.z *= -0.35;
  e.pos.y = terrain.height(e.pos.x, e.pos.z);
  e.rig.root.position.copy(e.pos);
  e.rig.root.rotation.y = e.facing;
}

function animateLimbs(e: Enemy): void {
  const speed = Math.hypot(e.vel.x, e.vel.z);
  const gait = e.animT * (4 + speed * 1.5);
  const amp = Math.min(0.95, speed * 0.24);

  if (e.def.kind === 'hound') {
    e.rig.legL.rotation.x = Math.sin(gait) * amp * 1.5;
    e.rig.legT.rotation.x = Math.sin(gait + Math.PI) * amp * 1.5;
    e.rig.armL.rotation.x = Math.sin(gait + Math.PI) * amp * 1.5;
    e.rig.armR.rotation.x = Math.sin(gait) * amp * 1.5;
    e.rig.root.position.y = e.pos.y + Math.abs(Math.sin(gait * 2)) * amp * 0.09;
    return;
  }

  e.rig.legL.rotation.x = Math.sin(gait) * amp;
  e.rig.legT.rotation.x = Math.sin(gait + Math.PI) * amp;
  e.rig.armL.rotation.x = Math.sin(gait + Math.PI) * amp * 0.75;

  if (e.state === 'attack' && e.telegraphT > 0) {
    // Wind-up: arm rears back proportionally to remaining telegraph.
    const t = 1 - e.telegraphT / Math.max(0.01, telegraphTime(e.def));
    e.rig.armR.rotation.x = -2.0 * (1 - t) - 0.2;
    e.rig.torso.rotation.y = -0.35 * (1 - t);
  } else if (e.state === 'recover') {
    const t = Math.min(1, e.stateT / 0.34);
    e.rig.armR.rotation.x = 1.5 * (1 - t);
    e.rig.torso.rotation.y = 0.25 * (1 - t);
  } else {
    e.rig.armR.rotation.x = Math.sin(gait) * amp * 0.75;
    e.rig.torso.rotation.y *= 0.9;
  }
  e.rig.root.position.y = e.pos.y + Math.abs(Math.sin(gait)) * amp * 0.05;
}

function animateStagger(e: Enemy): void {
  const t = e.staggerT;
  e.rig.torso.rotation.x = -0.4 * t;
  e.rig.armL.rotation.x = 0.8 * t;
  e.rig.armR.rotation.x = 0.8 * t;
  e.rig.root.rotation.y = e.facing + Math.sin(t * 40) * 0.08 * t;
}

/** Group coordination: nearby enemies of the same pack wake together. */
export function alertNearby(list: Enemy[], origin: Vec3, radius: number): void {
  for (const e of list) {
    if (!e.alive || e.state === 'chase' || e.state === 'attack') continue;
    const d = Math.hypot(e.pos.x - origin.x, e.pos.z - origin.z);
    if (d < radius) {
      e.state = 'chase';
      e.stateT = 0;
    }
  }
}
