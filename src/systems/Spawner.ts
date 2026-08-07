import * as THREE from 'three';
import type { EnemyDef, BiomeId } from '../core/Types';
import type { Terrain } from '../world/Terrain';
import type { Enemy } from './EnemyAI';
import { ENEMIES } from '../data/Enemies';
import { buildHumanoid, buildHound, buildColossus } from '../entities/Rigs';
import { scaleEnemy } from './Combat';
import { PALETTE } from '../core/Palette';
import { makeRNG, type RNG } from '../core/RNG';

const KIND_LOOK: Record<string, { skin: number; cloth: number; accent: number; eyes: number }> = {
  husk:     { skin: 0x9a8f7e, cloth: 0x5d5344, accent: 0x6e2a28, eyes: 0xd4763f },
  wight:    { skin: 0xbfb6a4, cloth: 0x3b4149, accent: 0xc9a227, eyes: 0xc9a227 },
  warden:   { skin: 0x8b8272, cloth: 0x4a3f35, accent: 0xa6552f, eyes: 0xd4763f },
  colossus: { skin: 0x6b6459, cloth: 0x3b4149, accent: 0xa6552f, eyes: 0xd4763f },
};

export function buildEnemyRig(def: EnemyDef): ReturnType<typeof buildHumanoid> {
  if (def.kind === 'colossus') return buildColossus();
  if (def.kind === 'hound') return buildHound(0x5a5145, PALETTE.rustBright);
  const look = KIND_LOOK[def.kind] ?? KIND_LOOK.husk!;
  return buildHumanoid({
    skin: look.skin,
    cloth: look.cloth,
    accent: look.accent,
    scale: def.scale,
    bulk: def.elite ? 1.25 : 1,
    cloak: def.kind === 'wight',
    emissiveEyes: look.eyes,
  });
}

export function makeEnemy(
  def: EnemyDef, x: number, z: number, terrain: Terrain,
  playerLevel: number, embertide: number, idSuffix: string,
): Enemy {
  const rig = buildEnemyRig(def);
  const scaled = scaleEnemy(def.hp, def.damage, playerLevel, embertide);
  const y = terrain.height(x, z);
  rig.root.position.set(x, y, z);
  return {
    id: `${def.id}:${idSuffix}`,
    def,
    rig,
    pos: new THREE.Vector3(x, y, z),
    vel: new THREE.Vector3(),
    hp: scaled.hp,
    maxHp: scaled.hp,
    damage: scaled.damage,
    state: 'idle',
    stateT: Math.random() * 2,
    facing: Math.random() * Math.PI * 2,
    cooldown: 0,
    target: new THREE.Vector3(),
    home: new THREE.Vector3(x, y, z),
    patrolAngle: Math.random() * Math.PI * 2,
    animT: Math.random() * 5,
    flashT: 0,
    staggerT: 0,
    telegraphT: 0,
    telegraphMax: 0,
    alive: true,
    soulValue: def.boss ? 12 : def.elite ? 3 : 1,
    lastAttack: 0,
    summonCount: 0,
    phase: 1,
    distToPlayer: 999,
  };
}

/**
 * Streaming spawner. Keeps a live population around the player, culls the
 * far ones, and honours biome tier so difficulty follows geography.
 */
export class Spawner {
  private scene: THREE.Scene;
  private terrain: Terrain;
  private rng: RNG;
  private counter = 0;
  readonly enemies: Enemy[] = [];
  maxAlive = 26;
  private spawnTimer = 0;

  constructor(scene: THREE.Scene, terrain: Terrain, seed: string) {
    this.scene = scene;
    this.terrain = terrain;
    this.rng = makeRNG(`${seed}:spawn`);
  }

  private candidatesFor(biome: BiomeId, tier: number): EnemyDef[] {
    const pool = ENEMIES.filter(
      (e) => !e.boss && e.biomes.includes(biome) && e.tier <= tier + 1,
    );
    return pool.length > 0 ? pool : ENEMIES.filter((e) => !e.boss && e.tier === 1);
  }

  spawnAround(
    px: number, pz: number, playerLevel: number, embertide: number, count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.enemies.filter((e) => e.alive).length >= this.maxAlive) return;
      const ang = this.rng.range(0, Math.PI * 2);
      const dist = this.rng.range(34, 68);
      const x = px + Math.cos(ang) * dist;
      const z = pz + Math.sin(ang) * dist;
      if (!this.terrain.walkable(x, z)) continue;
      const biome = this.terrain.biome(x, z);
      const tier = Math.min(4, 1 + Math.floor(playerLevel / 6) + Math.floor(embertide / 2));
      const pool = this.candidatesFor(biome, tier);
      const def = this.rng.pick(pool);
      // Elites get rarer scaling but are worth the risk.
      const e = makeEnemy(def, x, z, this.terrain, playerLevel, embertide, String(this.counter++));
      this.scene.add(e.rig.root);
      this.enemies.push(e);
    }
  }

  spawnPack(
    x: number, z: number, size: number, playerLevel: number, embertide: number,
  ): void {
    const biome = this.terrain.biome(x, z);
    const pool = this.candidatesFor(biome, Math.min(4, 1 + Math.floor(playerLevel / 6)));
    for (let i = 0; i < size; i++) {
      const ang = (i / size) * Math.PI * 2;
      const ox = x + Math.cos(ang) * this.rng.range(2, 7);
      const oz = z + Math.sin(ang) * this.rng.range(2, 7);
      if (!this.terrain.walkable(ox, oz)) continue;
      const def = this.rng.pick(pool);
      const e = makeEnemy(def, ox, oz, this.terrain, playerLevel, embertide, String(this.counter++));
      this.scene.add(e.rig.root);
      this.enemies.push(e);
    }
  }

  spawnBoss(x: number, z: number, playerLevel: number, embertide: number): Enemy | null {
    const def = ENEMIES.find((e) => e.boss);
    if (!def) return null;
    const e = makeEnemy(def, x, z, this.terrain, playerLevel, embertide, 'boss');
    e.hp = Math.round(e.hp * 1.35);
    e.maxHp = e.hp;
    this.scene.add(e.rig.root);
    this.enemies.push(e);
    return e;
  }

  /** Cull dead/far enemies and top up population. Called every frame. */
  update(
    dt: number, px: number, pz: number, playerLevel: number,
    embertide: number, inBossFight: boolean,
  ): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e) continue;
      const d = Math.hypot(e.pos.x - px, e.pos.z - pz);
      const stale = !e.alive && e.stateT > 4;
      if (stale || (d > 190 && !e.def.boss)) {
        this.scene.remove(e.rig.root);
        disposeRig(e.rig.root);
        this.enemies.splice(i, 1);
      }
    }
    if (inBossFight) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(1.2, 4.5 - embertide * 0.45);
      const alive = this.enemies.filter((e) => e.alive).length;
      const want = Math.min(this.maxAlive, 10 + embertide * 3);
      if (alive < want) this.spawnAround(px, pz, playerLevel, embertide, 2);
    }
  }

  clear(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.root);
      disposeRig(e.rig.root);
    }
    this.enemies.length = 0;
  }
}

export function disposeRig(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
    }
  });
}
