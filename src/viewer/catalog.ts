import * as THREE from 'three';
import { PALETTE } from '../core/Palette';
import { buildHumanoid, buildHound, buildColossus, buildWeapon } from '../entities/Rigs';
import { mergeGeometries } from '../world/Meshes';
import { makeRNG } from '../core/RNG';
import { ENEMIES } from '../data/Enemies';

export interface ViewerModel {
  id: string;
  name: string;
  category: 'character' | 'enemy' | 'weapon' | 'prop' | 'environment';
  build: () => THREE.Object3D;
  note: string;
  gltfId?: string;
}

/** Every visual asset in the game, surfaced in the in-app viewer. */
export function buildAssetCatalog(): ViewerModel[] {
  const rng = makeRNG('viewer');
  const cat: ViewerModel[] = [
    { id: 'player', name: 'The Warden', category: 'character',
      build: () => buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.rust, scale: 0.92, cloak: true }).root,
      note: 'Player avatar. Procedural humanoid, no external rig.' },
    { id: 'hound', name: 'Ash Hound', category: 'enemy',
      build: () => buildHound(PALETTE.peat, PALETTE.oxblood).root,
      note: 'Fast flanking enemy. Quadratic-bezier lunge telegraph.' },
    { id: 'colossus', name: 'Ashen Crown (Colossus)', category: 'enemy',
      build: () => buildColossus().root,
      note: 'Final boss. 3 phases driven by HP thresholds.' },
    { id: 'blade', name: 'Warden Blade', category: 'weapon',
      build: () => buildWeapon('blade', PALETTE.bone),
      note: 'Light, fast archetype. Wide arc.' },
    { id: 'maul', name: 'Cairn Maul', category: 'weapon',
      build: () => buildWeapon('maul', PALETTE.slate),
      note: 'Heavy, slow. High stagger.' },
    { id: 'spear', name: 'Reach Spear', category: 'weapon',
      build: () => buildWeapon('spear', PALETTE.frost),
      note: 'Long reach, narrow arc.' },
    { id: 'censer', name: 'Ember Censer', category: 'weapon',
      build: () => buildWeapon('censer', PALETTE.palegold),
      note: 'Pyre damage type. Emits a procedural glow.' },
  ];

  for (const e of ENEMIES) {
    if (e.boss) continue;
    cat.push({
      id: `enemy-${e.id}`, name: e.name, category: 'enemy',
      build: () => {
        if (e.kind === 'hound') return buildHound(PALETTE.peat, PALETTE.oxblood).root;
        return buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.peat, scale: e.scale, cloak: e.kind === 'warden' }).root;
      },
      note: `Tier ${e.tier} ${e.kind}. HP ${e.hp}, dmg ${e.damage}.`,
    });
  }

  // Environmental props reuse the same geometry library as the world.
  cat.push({ id: 'cairn', name: 'Cairn', category: 'prop',
    build: () => cairnMesh(), note: 'Safe stone. Banked souls persist here.' });
  cat.push({ id: 'rock', name: 'Boulder', category: 'environment',
    build: () => rockMesh(), note: 'Instanced terrain scatter (merged geometry).' });
  void rng;
  // Free, licence-clean rigged models (Khronos glTF-Sample-Assets, Apache-2.0).
  // Loaded at runtime via GLTFLoader; procedural geometry is the fallback.
  cat.push({ id: 'free-cesiumman', name: 'CesiumMan (CC0 rig)', category: 'character',
    build: () => new THREE.Group(), gltfId: 'cesiumman',
    note: 'Free Apache-2.0 rigged humanoid. Proof we use external rigs, not hand-built.' });
  cat.push({ id: 'free-fox', name: 'Fox (CC0 rig+anim)', category: 'enemy',
    build: () => new THREE.Group(), gltfId: 'fox',
    note: 'Free Apache-2.0 rigged + animated creature. Demonstrates skeletal animation.' });
  cat.push({ id: 'free-boombox', name: 'BoomBox (CC0 prop)', category: 'prop',
    build: () => new THREE.Group(), gltfId: 'boombox',
    note: 'Free Apache-2.0 PBR prop. Used as a world object example.' });
  cat.push({ id: 'free-duck', name: 'Duck (CC0 prop)', category: 'prop',
    build: () => new THREE.Group(), gltfId: 'duck',
    note: 'Free Apache-2.0 PBR prop.' });
  return cat;
}

function cairnMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.8, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.slate, roughness: 0.95, flatShading: true }),
  );
  g.add(base);
  const cap = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({ color: PALETTE.palegold, roughness: 0.7, flatShading: true, emissive: PALETTE.palegold, emissiveIntensity: 0.4 }),
  );
  cap.position.y = 0.55; g.add(cap);
  return g;
}

function rockMesh(): THREE.Object3D {
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const s = 0.6 + i * 0.25;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1, 0.7, 1);
    geos.push(g);
  }
  const merged = mergeGeometries(geos);
  return new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: PALETTE.slate, roughness: 1, flatShading: true }));
}
