import * as THREE from 'three';
import { PALETTE } from '../core/Palette';
import { makeRNG } from '../core/RNG';

const mat = (color: number, rough = 0.9, metal = 0.0, flat = true): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat });

const matEmissive = (color: number, emissive: number, intensity = 1.4): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity, roughness: 0.5, metalness: 0.1, flatShading: true,
  });

/** Deform a geometry's vertices with seeded noise so nothing looks machine-made. */
function roughen(geo: THREE.BufferGeometry, amount: number, seed: string): THREE.BufferGeometry {
  const rng = makeRNG(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + rng.range(-amount, amount),
      pos.getY(i) + rng.range(-amount, amount),
      pos.getZ(i) + rng.range(-amount, amount),
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export interface MeshLibrary {
  pine: THREE.BufferGeometry[];
  deadtree: THREE.BufferGeometry[];
  rock: THREE.BufferGeometry[];
  boulder: THREE.BufferGeometry[];
  grass: THREE.BufferGeometry;
  stump: THREE.BufferGeometry;
  materials: Record<string, THREE.MeshStandardMaterial>;
}

export function buildMeshLibrary(): MeshLibrary {
  const pine: THREE.BufferGeometry[] = [];
  for (let v = 0; v < 3; v++) {
    const parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.14, 0.24, 3.2 + v * 0.5, 5);
    trunk.translate(0, (3.2 + v * 0.5) / 2, 0);
    parts.push(trunk);
    const tiers = 3 + v;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const r = 1.5 * (1 - t * 0.62);
      const h = 1.7 * (1 - t * 0.3);
      const cone = new THREE.ConeGeometry(r, h, 6);
      cone.translate(0, 2.2 + i * 0.95 + v * 0.3, 0);
      parts.push(cone);
    }
    pine.push(roughen(mergeGeometries(parts), 0.045, `pine${v}`));
  }

  const deadtree: THREE.BufferGeometry[] = [];
  for (let v = 0; v < 3; v++) {
    const rng = makeRNG(`dead${v}`);
    const parts: THREE.BufferGeometry[] = [];
    const h = 3.4 + v * 0.8;
    const trunk = new THREE.CylinderGeometry(0.1, 0.3, h, 5);
    trunk.translate(0, h / 2, 0);
    parts.push(trunk);
    const branches = 3 + v;
    for (let i = 0; i < branches; i++) {
      const bl = rng.range(0.9, 1.9);
      const b = new THREE.CylinderGeometry(0.04, 0.09, bl, 4);
      const ang = rng.range(0, Math.PI * 2);
      const tilt = rng.range(0.5, 1.15);
      b.rotateZ(tilt);
      b.rotateY(ang);
      b.translate(
        Math.cos(ang) * bl * 0.42,
        h * rng.range(0.45, 0.92),
        Math.sin(ang) * bl * 0.42,
      );
      parts.push(b);
    }
    deadtree.push(roughen(mergeGeometries(parts), 0.035, `deadtree${v}`));
  }

  const rock: THREE.BufferGeometry[] = [];
  for (let v = 0; v < 4; v++) {
    const g = new THREE.IcosahedronGeometry(0.6 + v * 0.12, 0);
    g.scale(1, 0.62 + v * 0.08, 1);
    g.translate(0, 0.3, 0);
    rock.push(roughen(g, 0.16, `rock${v}`));
  }

  const boulder: THREE.BufferGeometry[] = [];
  for (let v = 0; v < 3; v++) {
    const g = new THREE.DodecahedronGeometry(1.5 + v * 0.5, 0);
    g.scale(1.15, 0.85, 1);
    g.translate(0, (1.5 + v * 0.5) * 0.6, 0);
    boulder.push(roughen(g, 0.3, `boulder${v}`));
  }

  // Grass: three crossed quads, cheap and reads as a tuft under fog.
  const grassParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.PlaneGeometry(0.55, 0.7);
    p.translate(0, 0.35, 0);
    p.rotateY((i / 3) * Math.PI);
    grassParts.push(p);
  }
  const grass = mergeGeometries(grassParts);

  const stumpParts: THREE.BufferGeometry[] = [];
  const st = new THREE.CylinderGeometry(0.36, 0.44, 0.6, 7);
  st.translate(0, 0.3, 0);
  stumpParts.push(st);
  const stump = roughen(mergeGeometries(stumpParts), 0.04, 'stump');

  const materials: Record<string, THREE.MeshStandardMaterial> = {
    bark: mat(PALETTE.peatDark, 0.95),
    needle: mat(PALETTE.mossDark, 0.95),
    deadwood: mat(0x6a6055, 0.96),
    stone: mat(PALETTE.slate, 0.92),
    stoneLight: mat(0x565e68, 0.9),
    grass: new THREE.MeshStandardMaterial({
      color: PALETTE.moss, roughness: 1, metalness: 0,
      side: THREE.DoubleSide, transparent: true, alphaTest: 0.35, flatShading: true,
    }),
    bone: mat(PALETTE.bone, 0.85),
    rust: mat(PALETTE.rust, 0.7, 0.25),
    oxblood: mat(PALETTE.oxblood, 0.8),
    gold: mat(PALETTE.palegold, 0.4, 0.6),
    ember: matEmissive(PALETTE.rust, PALETTE.rustBright, 2.2),
    soul: matEmissive(PALETTE.bone, PALETTE.palegold, 2.6),
    cloth: mat(0x5c5245, 0.98),
    flesh: mat(0x8a7f6d, 0.94),
  };

  return { pine, deadtree, rock, boulder, grass, stump, materials };
}

/** Minimal geometry merge - avoids pulling in the addons bundle. */
export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  let vCount = 0;
  let iCount = 0;
  for (const g of list) {
    const p = g.attributes.position as THREE.BufferAttribute;
    vCount += p.count;
    iCount += g.index ? g.index.count : p.count;
  }
  const positions = new Float32Array(vCount * 3);
  const normals = new Float32Array(vCount * 3);
  const uvs = new Float32Array(vCount * 2);
  const indices = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

  let vo = 0;
  let io = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
    for (let i = 0; i < p.count; i++) {
      positions[(vo + i) * 3] = p.getX(i);
      positions[(vo + i) * 3 + 1] = p.getY(i);
      positions[(vo + i) * 3 + 2] = p.getZ(i);
      normals[(vo + i) * 3] = n.getX(i);
      normals[(vo + i) * 3 + 1] = n.getY(i);
      normals[(vo + i) * 3 + 2] = n.getZ(i);
      uvs[(vo + i) * 2] = uv ? uv.getX(i) : 0;
      uvs[(vo + i) * 2 + 1] = uv ? uv.getY(i) : 0;
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) indices[io + i] = g.index.getX(i) + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) indices[io + i] = i + vo;
      io += p.count;
    }
    vo += p.count;
  }
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  return out;
}
