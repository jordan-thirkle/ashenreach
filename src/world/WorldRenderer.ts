import * as THREE from 'three';
import { paletteFor, type BiomeVariant, type Palette } from '../core/Palette';
import { Terrain, biomeTable, WORLD_HALF, SEA_LEVEL } from './Terrain';
import { buildMeshLibrary, type MeshLibrary } from './Meshes';
import { scatterChunk, type ScatterInstance } from './WorldGen';
import { AmbientRigs } from './AmbientRigs';

const CHUNK = 70;
const VIEW_CHUNKS = 5;

interface Chunk {
  key: string;
  mesh: THREE.Mesh;
  instanced: THREE.InstancedMesh[];
  cx: number;
  cz: number;
}

/** Vertex-coloured terrain: biome colour baked per vertex, no texture fetch. */
function buildChunkGeometry(
  terrain: Terrain, cx: number, cz: number, res: number,
  variant: BiomeVariant = 'highland',
): THREE.BufferGeometry {
  const pal = paletteFor(variant);
  const table = biomeTable(variant);
  const winter = variant === 'winter';
  const ashCol = new THREE.Color(pal.ash);
  const mireCol = new THREE.Color(pal.mire);
  const frostCol = new THREE.Color(pal.frost);
  const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, res, res);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const c2 = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i) + cx + CHUNK / 2;
    const wz = pos.getZ(i) + cz + CHUNK / 2;
    const h = terrain.height(wx, wz);
    pos.setY(i, h);

    const biome = terrain.biome(wx, wz);
    const prof = table[biome];
    const slope = terrain.slope(wx, wz);

    c.setHex(prof.ground);
    c2.setHex(prof.groundAlt);
    // Steep faces show the darker rock variant - free visual relief.
    const t = Math.min(1, slope * 2.2);
    c.lerp(c2, t);

    // Height tint: peaks catch ash, hollows go dark.
    if (h > 26) c.lerp(ashCol, Math.min(0.55, (h - 26) / 34));
    if (h < SEA_LEVEL + 1) c.lerp(mireCol, 0.4);

    if (winter) {
      // Snow settles on the flats and spares the steep faces; a thin frost wash
      // over everything else keeps the whole read cold without going blue-neon.
      const settle = Math.max(0, 1 - slope * 2.6) * (0.32 + Math.min(0.34, Math.max(0, h - 8) / 46));
      c.lerp(ashCol, Math.min(0.7, settle));
      c.lerp(frostCol, 0.14);
    }

    // Micro variation stops the flat-shaded plane reading as plastic.
    const v = 0.9 + ((Math.sin(wx * 3.1) + Math.cos(wz * 2.7)) * 0.5 + 0.5) * 0.2;
    colors[i * 3] = c.r * v;
    colors[i * 3 + 1] = c.g * v;
    colors[i * 3 + 2] = c.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export class WorldRenderer {
  readonly scene: THREE.Scene;
  readonly lib: MeshLibrary;
  private terrain: Terrain;
  private seed: string;
  private chunks = new Map<string, Chunk>();
  private terrainMat: THREE.MeshStandardMaterial;
  private waterMesh: THREE.Mesh;
  private sky: THREE.Mesh;
  private ashPoints: THREE.Points;
  private ashVel: Float32Array;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private quality: number;
  private chunkRes: number;
  private ambient: AmbientRigs;
  private t = 0;
  /** Active biome variant - drives terrain tint, fog, sky and light colour. */
  readonly variant: BiomeVariant;
  private pal: Palette;
  private baseFog: number;
  private baseSun: number;
  private baseFogDensity = 0.0068;
  private baseHemiI = 1.15;
  private baseSunI = 2.1;

  constructor(
    scene: THREE.Scene, terrain: Terrain, seed: string,
    quality: 'low' | 'medium' | 'high',
    variant?: BiomeVariant,
  ) {
    this.scene = scene;
    this.terrain = terrain;
    this.seed = seed;
    // Explicit param wins; otherwise inherit whatever the terrain was generated with.
    this.variant = variant ?? terrain.variant ?? 'highland';
    this.pal = paletteFor(this.variant);
    const winter = this.variant === 'winter';
    this.baseFog = winter ? 0xd3dade : 0xc4bcae;
    this.baseSun = winter ? 0xe6eef2 : 0xf0e3cc;
    this.quality = quality === 'high' ? 1 : quality === 'medium' ? 0.6 : 0.32;
    this.chunkRes = quality === 'high' ? 28 : quality === 'medium' ? 20 : 14;
    this.lib = buildMeshLibrary();
    this.ambient = new AmbientRigs(scene, terrain);

    this.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.97, metalness: 0.0, flatShading: true,
    });

    // Sky dome: gradient shader, no texture, correct for a burned overcast.
    const skyGeo = new THREE.SphereGeometry(1600, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(winter ? 0x9aa6b2 : 0x8f95a0) },
        mid: { value: new THREE.Color(this.baseFog) },
        bot: { value: new THREE.Color(this.pal.ash) },
        emberT: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vWorld = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float emberT;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld).y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.65)) : mix(mid, bot, pow(-h, 0.5));
          // Embertide pushes the horizon toward rust without ever going neon.
          c = mix(c, vec3(0.65, 0.33, 0.18), emberT * (1.0 - abs(h)) * 0.75);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    scene.fog = new THREE.FogExp2(this.baseFog, winter ? 0.0082 : 0.0068);
    this.baseFogDensity = winter ? 0.0082 : 0.0068;
    this.baseHemiI = winter ? 1.28 : 1.15;
    this.baseSunI = winter ? 1.85 : 2.1;

    this.hemi = new THREE.HemisphereLight(this.pal.ash, this.pal.peat, winter ? 1.28 : 1.15);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(this.baseSun, winter ? 1.85 : 2.1);
    this.sun.position.set(-90, 68, 52);
    this.sun.castShadow = quality !== 'low';
    if (this.sun.castShadow) {
      const sz = quality === 'high' ? 2048 : 1024;
      this.sun.shadow.mapSize.set(sz, sz);
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 260;
      this.sun.shadow.camera.left = -70;
      this.sun.shadow.camera.right = 70;
      this.sun.shadow.camera.top = 70;
      this.sun.shadow.camera.bottom = -70;
      this.sun.shadow.bias = -0.0012;
      this.sun.shadow.normalBias = 0.035;
    }
    scene.add(this.sun);
    scene.add(this.sun.target);

    const fill = new THREE.DirectionalLight(0x9aa4b0, 0.4);
    fill.position.set(70, 30, -60);
    scene.add(fill);

    // Standing water plane at sea level.
    const wGeo = new THREE.PlaneGeometry(WORLD_HALF * 2.4, WORLD_HALF * 2.4, 1, 1);
    wGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({
      color: winter ? this.pal.mire : 0x3a4038,
      roughness: winter ? 0.12 : 0.22, metalness: winter ? 0.45 : 0.35,
      transparent: true, opacity: winter ? 0.9 : 0.82,
    }));
    this.waterMesh.position.y = SEA_LEVEL;
    this.waterMesh.receiveShadow = false;
    scene.add(this.waterMesh);

    // Falling ash: the single strongest atmosphere cue in the whole game.
    const ashCount = Math.round(2600 * this.quality);
    const ashGeo = new THREE.BufferGeometry();
    const ap = new Float32Array(ashCount * 3);
    this.ashVel = new Float32Array(ashCount * 3);
    for (let i = 0; i < ashCount; i++) {
      ap[i * 3] = (Math.random() - 0.5) * 190;
      ap[i * 3 + 1] = Math.random() * 90;
      ap[i * 3 + 2] = (Math.random() - 0.5) * 190;
      this.ashVel[i * 3] = (Math.random() - 0.5) * 0.7;
      this.ashVel[i * 3 + 1] = -0.55 - Math.random() * 0.9;
      this.ashVel[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    this.ashPoints = new THREE.Points(ashGeo, new THREE.PointsMaterial({
      color: 0xefe9dc, size: 0.19, transparent: true, opacity: 0.5,
      depthWrite: false, sizeAttenuation: true,
    }));
    this.ashPoints.frustumCulled = false;
    scene.add(this.ashPoints);
  }

  setEmbertide(level: number): void {
    const t = Math.min(1, level / 6);
    const mat = this.sky.material as THREE.ShaderMaterial;
    mat.uniforms.emberT!.value = t;
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = this.baseFogDensity + t * 0.0042;
    fog.color.setHex(this.baseFog).lerp(new THREE.Color(this.pal.rust), t * 0.42);
    this.hemi.intensity = this.baseHemiI - t * 0.35;
    this.sun.intensity = this.baseSunI - t * 0.5;
    this.sun.color.setHex(this.baseSun).lerp(new THREE.Color(this.pal.rustBright), t * 0.55);
  }

  private makeChunk(cx: number, cz: number): Chunk {
    const key = `${cx},${cz}`;
    const geo = buildChunkGeometry(this.terrain, cx, cz, this.chunkRes, this.variant);
    const mesh = new THREE.Mesh(geo, this.terrainMat);
    mesh.position.set(cx + CHUNK / 2, 0, cz + CHUNK / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    this.scene.add(mesh);

    const insts = scatterChunk(this.terrain, cx, cz, CHUNK, this.seed, this.quality);
    const buckets = new Map<string, ScatterInstance[]>();
    for (const it of insts) {
      const arr = buckets.get(it.kind) ?? [];
      arr.push(it);
      buckets.set(it.kind, arr);
    }

    const instanced: THREE.InstancedMesh[] = [];
    const dummy = new THREE.Object3D();
    for (const [kind, arr] of buckets) {
      if (arr.length === 0) continue;
      const pick = (list: THREE.BufferGeometry[], i: number): THREE.BufferGeometry =>
        list[i % list.length] as THREE.BufferGeometry;

      let geoms: THREE.BufferGeometry[];
      let material: THREE.Material;
      switch (kind) {
        case 'pine': geoms = this.lib.pine; material = this.lib.materials.needle!; break;
        case 'deadtree': geoms = this.lib.deadtree; material = this.lib.materials.deadwood!; break;
        case 'rock': geoms = this.lib.rock; material = this.lib.materials.stone!; break;
        case 'boulder': geoms = this.lib.boulder; material = this.lib.materials.stoneLight!; break;
        case 'grass': geoms = [this.lib.grass]; material = this.lib.materials.grass!; break;
        default: geoms = [this.lib.stump]; material = this.lib.materials.bark!; break;
      }

      // One InstancedMesh per geometry variant keeps draw calls tiny.
      for (let v = 0; v < geoms.length; v++) {
        const subset = arr.filter((_, i) => i % geoms.length === v);
        if (subset.length === 0) continue;
        const im = new THREE.InstancedMesh(pick(geoms, v), material, subset.length);
        im.castShadow = kind !== 'grass' && this.quality > 0.5;
        im.receiveShadow = true;
        subset.forEach((it, i) => {
          dummy.position.set(it.x, it.y, it.z);
          dummy.rotation.set(0, it.rot, 0);
          dummy.scale.setScalar(it.scale);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = true;
        this.scene.add(im);
        instanced.push(im);
      }
    }
    return { key, mesh, instanced, cx, cz };
  }

  private disposeChunk(c: Chunk): void {
    this.scene.remove(c.mesh);
    c.mesh.geometry.dispose();
    for (const im of c.instanced) {
      this.scene.remove(im);
      im.dispose();
    }
  }

  /** Stream chunks around the player. Budgeted to one build per frame. */
  update(playerPos: THREE.Vector3, dt: number, camera: THREE.Camera): void {
    this.t += dt;
    const pcx = Math.floor(playerPos.x / CHUNK) * CHUNK;
    const pcz = Math.floor(playerPos.z / CHUNK) * CHUNK;

    const wanted = new Set<string>();
    let built = 0;
    for (let dz = -VIEW_CHUNKS; dz <= VIEW_CHUNKS; dz++) {
      for (let dx = -VIEW_CHUNKS; dx <= VIEW_CHUNKS; dx++) {
        if (dx * dx + dz * dz > VIEW_CHUNKS * VIEW_CHUNKS + 2) continue;
        const cx = pcx + dx * CHUNK;
        const cz = pcz + dz * CHUNK;
        const key = `${cx},${cz}`;
        wanted.add(key);
        if (!this.chunks.has(key) && built < 1) {
          this.chunks.set(key, this.makeChunk(cx, cz));
          built++;
        }
      }
    }
    for (const [key, c] of this.chunks) {
      if (!wanted.has(key)) {
        this.disposeChunk(c);
        this.chunks.delete(key);
      }
    }

    this.sky.position.copy(camera.position);
    this.waterMesh.position.x = playerPos.x;
    this.waterMesh.position.z = playerPos.z;

    this.sun.position.set(playerPos.x - 90, playerPos.y + 68, playerPos.z + 52);
    this.sun.target.position.copy(playerPos);
    this.sun.target.updateMatrixWorld();

    // Ash follows the camera so the volume is always populated.
    const ap = this.ashPoints.geometry.attributes.position as THREE.BufferAttribute;
    const arr = ap.array as Float32Array;
    const gust = Math.sin(this.t * 0.23) * 1.5 + Math.sin(this.t * 0.71) * 0.6;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] += (this.ashVel[i * 3]! + gust) * dt * 2.2;
      arr[i * 3 + 1] += this.ashVel[i * 3 + 1]! * dt * 2.2;
      arr[i * 3 + 2] += this.ashVel[i * 3 + 2]! * dt * 2.2;
      if (arr[i * 3 + 1]! < camera.position.y - 34) {
        arr[i * 3] = camera.position.x + (Math.random() - 0.5) * 170;
        arr[i * 3 + 1] = camera.position.y + 46 + Math.random() * 26;
        arr[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 170;
      }
    }
    ap.needsUpdate = true;
    this.ambient.update(dt, playerPos);
  }

  dispose(): void {
    this.ambient.dispose();
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
  }
}
