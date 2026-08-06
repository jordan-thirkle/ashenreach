import * as THREE from 'three';
import type { EnemyDef, Vec3 } from '../core/Types';
import type { Terrain } from '../world/Terrain';
import type { CharacterRig } from '../entities/Rigs';
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
      if (dist < e.def.attackRange && e.cooldown <= 0) {
        setState(e, 'attack');
        e.telegraphT = telegraphTime(e.def);
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
        steer(e, px, pz, e.def.speed, dt);
      }
      break;
    }

    case 'attack': {
      e.vel.multiplyScalar(Math.pow(0.02, dt));
      faceTowards(e, playerPos, dt, 9);
      if (e.telegraphT > 0) {
        e.telegraphT -= dt;
        if (e.telegraphT <= 0) {
          onAttack(e);
          e.cooldown = e.def.attackCooldown;
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
  animateLimbs(e);
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
