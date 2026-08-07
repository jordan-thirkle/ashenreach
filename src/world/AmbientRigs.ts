import * as THREE from 'three';
import { loadGltf } from './GltfModels';
import type { Terrain } from './Terrain';

/**
 * Ambient world creatures built from free (Apache-2.0 / CC0) Khronos rigs.
 * Foxes wander-idle with their baked animation clip; CesiumMan rigs stand as
 * static "fallen warden" markers. Purely cosmetic: if a load fails the
 * procedural world is unaffected.
 */

interface Rig {
  root: THREE.Group;
  mixer?: THREE.AnimationMixer;
}

const FOX_SPOTS: Array<[number, number]> = [
  [24, -18],
  [-42, 31],
  [11, 54],
  [63, -12],
  [-68, 44],
  [34, -62],
];

const WARDEN_SPOTS: Array<[number, number]> = [
  [-14, -26],
  [37, 22],
  [-55, -48],
  [58, -57],
];

export class AmbientRigs {
  private scene: THREE.Scene;
  private terrain: Terrain;
  private rigs: Rig[] = [];
  private movers: { root: THREE.Object3D; vx: number; vz: number; home: THREE.Vector3 }[] = [];
  private disposed = false;

  constructor(scene: THREE.Scene, terrain: Terrain) {
    this.scene = scene;
    this.terrain = terrain;
    void this.load();
  }

  private groundY(x: number, z: number): number {
    const t = this.terrain as unknown as { height?: (x: number, z: number) => number };
    return typeof t.height === 'function' ? t.height(x, z) : 0;
  }

  private async load(): Promise<void> {
    const [fox, man] = await Promise.all([
      loadGltf('fox').catch(() => null),
      loadGltf('cesiumman').catch(() => null),
    ]);
    if (this.disposed) return;

    if (fox) {
      for (const [x, z] of FOX_SPOTS) {
        const root = fox.object.clone(true);
        root.scale.setScalar(0.04);
        root.position.set(x, this.groundY(x, z), z);
        root.rotation.y = Math.atan2(-x, -z);
        let mixer: THREE.AnimationMixer | undefined;
        const clip = fox.anims[0];
        if (clip) {
          mixer = new THREE.AnimationMixer(root);
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        }
        this.scene.add(root);
        this.rigs.push({ root, mixer });
        this.movers.push({
          root, vx: (Math.random() - 0.5) * 1.4, vz: (Math.random() - 0.5) * 1.4,
          home: new THREE.Vector3(x, this.groundY(x, z), z),
        });
      }
    }

    if (man) {
      for (const [x, z] of WARDEN_SPOTS) {
        const root = man.object.clone(true);
        root.scale.setScalar(1.7);
        root.position.set(x, this.groundY(x, z), z);
        root.rotation.y = Math.atan2(x, z);
        this.scene.add(root);
        this.rigs.push({ root });
      }
    }
  }

  update(dt: number, playerPos?: THREE.Vector3): void {
    for (const r of this.rigs) r.mixer?.update(dt);
    const R = 240;
    for (const m of this.movers) {
      if (Math.random() < 0.01) {
        m.vx = (Math.random() - 0.5) * 1.6;
        m.vz = (Math.random() - 0.5) * 1.6;
      }
      const dx = m.home.x - m.root.position.x;
      const dz = m.home.z - m.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 26) { m.vx += (dx / dist) * 0.6 * dt; m.vz += (dz / dist) * 0.6 * dt; }
      if (playerPos) {
        const pdx = m.root.position.x - playerPos.x;
        const pdz = m.root.position.z - playerPos.z;
        const pd = Math.hypot(pdx, pdz);
        if (pd < 6) { m.vx += (pdx / (pd || 1)) * 2.2 * dt; m.vz += (pdz / (pd || 1)) * 2.2 * dt; }
      }
      m.vx = Math.max(-1.8, Math.min(1.8, m.vx));
      m.vz = Math.max(-1.8, Math.min(1.8, m.vz));
      const nx = m.root.position.x + m.vx * dt;
      const nz = m.root.position.z + m.vz * dt;
      if (Math.hypot(nx, nz) < R) { m.root.position.x = nx; m.root.position.z = nz; }
      m.root.position.y = this.groundY(m.root.position.x, m.root.position.z);
      if (Math.hypot(m.vx, m.vz) > 0.05) m.root.rotation.y = Math.atan2(m.vx, m.vz);
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const r of this.rigs) {
      r.mixer?.stopAllAction();
      this.scene.remove(r.root);
      r.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
    }
    this.rigs.length = 0;
    this.movers.length = 0;
  }
}
