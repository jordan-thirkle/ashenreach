import * as THREE from 'three';
import type { PoiDef, Item } from '../core/Types';
import type { Terrain } from '../world/Terrain';
import { PALETTE } from '../core/Palette';
import { RARITY_COLOR } from '../core/Palette';
import { makeRNG } from '../core/RNG';

export interface SoulOrb {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  value: number;
  bobT: number;
  collected: boolean;
  magnetT: number;
}

export interface LootDrop {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  item: Item;
  bobT: number;
  taken: boolean;
}

export interface CairnObject {
  def: PoiDef;
  group: THREE.Group;
  light: THREE.PointLight;
  lit: boolean;
  flame: THREE.Mesh;
}

const soulGeo = new THREE.IcosahedronGeometry(0.22, 1);
const soulMat = new THREE.MeshStandardMaterial({
  color: PALETTE.palegold, emissive: PALETTE.palegold,
  emissiveIntensity: 2.6, roughness: 0.35, transparent: true, opacity: 0.9,
});

export function makeSoulOrb(x: number, y: number, z: number, value: number): SoulOrb {
  const g = new THREE.Group();
  const core = new THREE.Mesh(soulGeo, soulMat);
  g.add(core);
  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.4, 1),
    new THREE.MeshBasicMaterial({
      color: PALETTE.palegold, transparent: true, opacity: 0.16,
      side: THREE.BackSide, depthWrite: false,
    }),
  );
  g.add(halo);
  const light = new THREE.PointLight(PALETTE.palegold, 2.6, 7, 2);
  g.add(light);
  g.position.set(x, y + 1.0, z);
  return {
    mesh: g,
    pos: new THREE.Vector3(x, y + 1.0, z),
    value,
    bobT: Math.random() * 6,
    collected: false,
    magnetT: 0,
  };
}

export function makeLootDrop(x: number, y: number, z: number, item: Item): LootDrop {
  const g = new THREE.Group();
  const color = RARITY_COLOR[item.rarity] ?? 0xa6a094;
  const shard = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.4,
      roughness: 0.4, metalness: 0.3, flatShading: true,
    }),
  );
  g.add(shard);
  // Beam of light so drops are findable in tall grass.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.14, 5, 6, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  beam.position.y = 2.4;
  g.add(beam);
  if (item.rarity === 'relic' || item.rarity === 'mythic') {
    g.add(new THREE.PointLight(color, 3.2, 9, 2));
  }
  g.position.set(x, y + 0.55, z);
  return { mesh: g, pos: new THREE.Vector3(x, y + 0.55, z), item, bobT: Math.random() * 6, taken: false };
}

export function makeCairn(def: PoiDef, terrain: Terrain): CairnObject {
  const g = new THREE.Group();
  const rng = makeRNG(def.id);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: PALETTE.slate, roughness: 0.96, flatShading: true,
  });
  // Stacked stones, wide to narrow - the universal cairn silhouette.
  let y = 0;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const r = 0.62 * (1 - t * 0.62);
    const h = rng.range(0.16, 0.3);
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stoneMat);
    stone.scale.y = h / r;
    stone.position.set(rng.range(-0.07, 0.07), y + h / 2, rng.range(-0.07, 0.07));
    stone.rotation.y = rng.range(0, Math.PI);
    stone.castShadow = true;
    stone.receiveShadow = true;
    g.add(stone);
    y += h;
  }

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.19, 0.5, 6),
    new THREE.MeshBasicMaterial({ color: PALETTE.palegold, transparent: true, opacity: 0 }),
  );
  flame.position.y = y + 0.28;
  g.add(flame);

  const light = new THREE.PointLight(PALETTE.palegold, 0, 22, 2);
  light.position.y = y + 0.4;
  g.add(light);

  const gy = terrain.height(def.pos.x, def.pos.z);
  g.position.set(def.pos.x, gy, def.pos.z);
  return { def, group: g, light, lit: false, flame };
}

export function lightCairn(c: CairnObject): void {
  c.lit = true;
  c.light.intensity = 9;
  (c.flame.material as THREE.MeshBasicMaterial).opacity = 0.92;
}

/** Bob, spin, and magnet-toward-player. Pickup feel lives here. */
export function updatePickups(
  souls: SoulOrb[], loot: LootDrop[], playerPos: THREE.Vector3, dt: number,
  magnetRange: number,
  onSoul: (s: SoulOrb) => void,
  onLoot: (l: LootDrop) => void,
): void {
  for (const s of souls) {
    if (s.collected) continue;
    s.bobT += dt;
    const d = s.pos.distanceTo(playerPos);
    if (d < magnetRange) {
      s.magnetT = Math.min(1, s.magnetT + dt * 3.2);
      const pull = new THREE.Vector3(
        playerPos.x - s.pos.x, playerPos.y + 1.1 - s.pos.y, playerPos.z - s.pos.z,
      ).normalize().multiplyScalar(dt * (7 + s.magnetT * 22));
      s.pos.add(pull);
    }
    s.mesh.position.copy(s.pos);
    s.mesh.position.y += Math.sin(s.bobT * 2.1) * 0.13;
    s.mesh.rotation.y += dt * 1.4;
    s.mesh.scale.setScalar(1 + Math.sin(s.bobT * 3.4) * 0.07);
    if (d < 1.5) {
      s.collected = true;
      onSoul(s);
    }
  }

  for (const l of loot) {
    if (l.taken) continue;
    l.bobT += dt;
    l.mesh.position.y = l.pos.y + Math.sin(l.bobT * 1.8) * 0.11;
    l.mesh.rotation.y += dt * 0.9;
    if (l.pos.distanceTo(playerPos) < 1.9) {
      l.taken = true;
      onLoot(l);
    }
  }
}

/** Build the visible structure for a non-cairn POI. */
export function makePoiStructure(def: PoiDef, terrain: Terrain): THREE.Group {
  const g = new THREE.Group();
  const rng = makeRNG(`${def.id}:struct`);
  const stone = new THREE.MeshStandardMaterial({
    color: PALETTE.slate, roughness: 0.95, flatShading: true,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: PALETTE.peatDark, roughness: 0.98, flatShading: true,
  });

  switch (def.kind) {
    case 'ruin': {
      for (let i = 0; i < rng.int(4, 8); i++) {
        const w = rng.range(0.7, 2.2);
        const h = rng.range(1.1, 4.2);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.42), stone);
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(2.2, 6.5);
        wall.position.set(Math.cos(a) * r, h / 2 - rng.range(0, 0.4), Math.sin(a) * r);
        wall.rotation.y = a + rng.range(-0.4, 0.4);
        wall.rotation.z = rng.range(-0.09, 0.09);
        wall.castShadow = true;
        wall.receiveShadow = true;
        g.add(wall);
      }
      break;
    }
    case 'watchtower': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 9, 8), stone);
      base.position.y = 4.5;
      base.castShadow = true;
      g.add(base);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.2, 1.1, 8), stone);
      top.position.y = 9.4;
      g.add(top);
      break;
    }
    case 'camp': {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const tent = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.7, 5), wood);
        tent.position.set(Math.cos(a) * 3.2, 0.85, Math.sin(a) * 3.2);
        tent.castShadow = true;
        g.add(tent);
      }
      const fire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({
        color: PALETTE.rustBright, emissive: PALETTE.rustBright, emissiveIntensity: 2.4,
      }));
      fire.position.y = 0.35;
      g.add(fire);
      g.add(new THREE.PointLight(PALETTE.rustBright, 7, 16, 2).translateY(0.9));
      break;
    }
    case 'shrine': {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.5), stone);
      plinth.position.y = 0.45;
      plinth.castShadow = true;
      g.add(plinth);
      const idol = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({
        color: PALETTE.palegold, emissive: PALETTE.palegold, emissiveIntensity: 1.1,
        roughness: 0.4, metalness: 0.5, flatShading: true,
      }));
      idol.position.y = 1.5;
      g.add(idol);
      g.add(new THREE.PointLight(PALETTE.palegold, 5, 14, 2).translateY(1.6));
      break;
    }
    case 'barrow': {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(4.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stone);
      mound.scale.y = 0.42;
      mound.receiveShadow = true;
      g.add(mound);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.4), new THREE.MeshStandardMaterial({
        color: 0x14171a, roughness: 1,
      }));
      door.position.set(0, 1, 4.0);
      g.add(door);
      break;
    }
    case 'grove': {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 5.5, 6), wood);
        trunk.position.set(Math.cos(a) * 5, 2.75, Math.sin(a) * 5);
        trunk.castShadow = true;
        g.add(trunk);
      }
      break;
    }
    default: {
      const pit = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.6, 1.4, 9), stone);
      pit.position.y = -0.5;
      g.add(pit);
      break;
    }
  }
  g.position.set(def.pos.x, terrain.height(def.pos.x, def.pos.z), def.pos.z);
  return g;
}
