// Model factory list for the asset generator. Reuses in-game procedural builders.
import * as THREE from 'three';
import { buildHumanoid, buildHound, buildColossus, buildWeapon } from '../../src/entities/Rigs.js';
import { PALETTE } from '../../src/core/Palette.js';

// Helper: recenter so origin is at the model's base (y=0 at feet) and within ~1.8m tall.
function ground(object, targetHeight = null) {
  const obj = object && object.root ? object.root : object;
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box.min.y;
  if (targetHeight) {
    const h = box.max.y - box.min.y;
    const s = targetHeight / h;
    obj.scale.setScalar(s);
    obj.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(obj);
    obj.position.y -= b2.min.y;
  }
  obj.updateMatrixWorld(true);
  return obj;
}

export const MODELS = [
  { id: 'warden_blade', tris: 600, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.rust, scale: 1, cloak: true }), 1.8), tags: ['character', 'player'] },
  { id: 'warden_maul', tris: 640, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.blood, scale: 1.04, bulk: 1.2, cloak: true }), 1.8), tags: ['character', 'player'] },
  { id: 'warden_spear', tris: 580, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.palegold, scale: 0.98, cloak: false }), 1.8), tags: ['character', 'player'] },
  { id: 'censer', tris: 300, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.ember, scale: 0.96, cloak: true }), 1.8), tags: ['character', 'player'] },
  { id: 'husk', tris: 420, build: () => ground(buildHumanoid({ skin: PALETTE.ash, cloth: PALETTE.slate, accent: PALETTE.ash, scale: 1, cloak: false }), 1.8), tags: ['enemy'] },
  { id: 'wight', tris: 480, build: () => ground(buildHumanoid({ skin: PALETTE.palegold, cloth: PALETTE.slate, accent: PALETTE.ash, scale: 1.02, cloak: true }), 1.85), tags: ['enemy'] },
  { id: 'hound', tris: 360, build: () => ground(buildHound(PALETTE.slate, PALETTE.ember), 1.1), tags: ['enemy'] },
  { id: 'warden_elite', tris: 700, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.palegold, scale: 1.05, bulk: 1.15, cloak: true }), 1.85), tags: ['enemy', 'elite'] },
  { id: 'colossus_boss', tris: 1200, build: () => ground(buildColossus(), 3.2), tags: ['enemy', 'boss'] },
  { id: 'cairn_stone', tris: 240, build: () => ground(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 1.4, 6), new THREE.MeshStandardMaterial({ color: PALETTE.slate })), 1.4), tags: ['prop'] },
  { id: 'pine_tree', tris: 220, build: () => ground(new THREE.Group().add(new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 7), new THREE.MeshStandardMaterial({ color: PALETTE.moss }))), 3.2), tags: ['prop', 'foliage'] },
  { id: 'dead_tree', tris: 180, build: () => ground(new THREE.Group().add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 3, 5), new THREE.MeshStandardMaterial({ color: PALETTE.peat }))), 3), tags: ['prop', 'foliage'] },
  { id: 'rock_cluster', tris: 160, build: () => ground(new THREE.Group().add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: PALETTE.slate }))), 0.9), tags: ['prop'] },
  { id: 'ruin_arch', tris: 320, build: () => ground(new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 0.4), new THREE.MeshStandardMaterial({ color: PALETTE.slate }))), 2.4), tags: ['prop', 'ruin'] },
  { id: 'shrine', tris: 280, build: () => ground(new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: PALETTE.palegold }))), 1.2), tags: ['prop'] },
  { id: 'barrel', tris: 140, build: () => ground(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 10), new THREE.MeshStandardMaterial({ color: PALETTE.peat })), 1), tags: ['prop'] },
  { id: 'watchtower', tris: 520, build: () => ground(new THREE.Group().add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 6, 8), new THREE.MeshStandardMaterial({ color: PALETTE.slate }))), 6), tags: ['prop', 'ruin'] },
  { id: 'soul_wisp', tris: 80, build: () => ground(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: PALETTE.ember, emissive: PALETTE.ember, emissiveIntensity: 2 })), 0.6), tags: ['fx'] },
  { id: 'weapon_blade', tris: 90, build: () => ground(buildWeapon('blade', PALETTE.rust), 1.4), tags: ['weapon'] },
  { id: 'weapon_maul', tris: 140, build: () => ground(buildWeapon('maul', PALETTE.rust), 1.6), tags: ['weapon'] },
  { id: 'weapon_spear', tris: 110, build: () => ground(buildWeapon('spear', PALETTE.palegold), 2.1), tags: ['weapon'] },
  { id: 'weapon_censer', tris: 130, build: () => ground(buildWeapon('censer', PALETTE.ember), 1.5), tags: ['weapon'] },
];
