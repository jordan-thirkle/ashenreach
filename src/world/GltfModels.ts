import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Runtime loader for externally-sourced CC0 / Apache-2.0 glTF models.
 *
 * Why this exists: the studio rule is "never re-invent the wheel". Where a
 * free, licence-clean rigged model exists (Khronos glTF-Sample-Assets,
 * Apache-2.0), we use it instead of hand-building geometry. Procedural
 * builders remain as a fallback when a file is unavailable.
 *
 * Licences: CesiumMan, Fox, BoomBox, Duck are Apache-2.0 (KhronosGroup).
 * They live in /assets/models and are fetched at runtime.
 */

export interface LoadedModel {
  id: string;
  object: THREE.Group;
  anims: THREE.AnimationClip[];
  source: 'gltf' | 'procedural';
}

const SOURCES: Record<string, string> = {
  cesiumman: 'assets/models/cesiumman.glb',
  fox: 'assets/models/fox.glb',
};

const cache = new Map<string, { object: THREE.Group; anims: THREE.AnimationClip[] }>();
const loader = new GLTFLoader();

function urlFor(id: string): string | null {
  return SOURCES[id] ?? null;
}

/** Load (and cache) a model by id. Returns null if no free asset exists. */
export function loadGltf(id: string): Promise<LoadedModel | null> {
  const url = urlFor(id);
  if (!url) return Promise.resolve(null);
  const hit = cache.get(id);
  if (hit) return Promise.resolve({ id, object: hit.object.clone(true), anims: hit.anims, source: 'gltf' });
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const obj = gltf.scene;
        obj.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        const anims = gltf.animations ?? [];
        cache.set(id, { object: obj, anims });
        resolve({ id, object: obj.clone(true), anims, source: 'gltf' });
      },
      undefined,
      () => resolve(null),
    );
  });
}

/** Synchronous check: is a free asset mapped for this id? */
export function hasFreeAsset(id: string): boolean {
  return !!urlFor(id);
}

/** Warm the cache for all known free assets (call once at boot). */
export async function preloadFreeAssets(ids: string[] = Object.keys(SOURCES)): Promise<void> {
  await Promise.all(ids.map((id) => loadGltf(id).catch(() => null)));
}
