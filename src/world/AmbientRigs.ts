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

  update(dt: number, _playerPos?: THREE.Vector3): void {
    for (const r of this.rigs) r.mixer?.update(dt);
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
  }
}
