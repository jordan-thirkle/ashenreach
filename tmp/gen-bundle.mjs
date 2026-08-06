// tools/assetgen/build.mjs
import { mkdirSync, writeFileSync as writeFileSync2, statSync } from "node:fs";
import { join } from "node:path";

// tools/assetgen/glb.mjs
import * as THREE from "three";
function collectGeometries(root) {
  const out = [];
  root.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      out.push({ geometry: g, material: o.material });
    }
  });
  return out;
}
function pad4(n) {
  return n + 3 & ~3;
}
function buildGLB(root) {
  const meshes = collectGeometries(root);
  const json = {
    asset: { version: "2.0", generator: "ashenreach-assetgen" },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: []
  };
  const bin = [];
  function pushBufferView(typed, target) {
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const offset = pad4(bin.length);
    const padded = Buffer.alloc(pad4(buf.length));
    buf.copy(padded);
    bin.push(padded);
    const bv = { buffer: 0, byteOffset: offset, byteLength: buf.length };
    if (target) bv.target = target;
    json.bufferViews.push(bv);
    return json.bufferViews.length - 1;
  }
  function pushAccessor(typed, componentType, count, type, bvIndex, minmax) {
    const a = { bufferView: bvIndex, componentType, count, type };
    if (minmax) {
      a.min = minmax.min;
      a.max = minmax.max;
    }
    json.accessors.push(a);
    return json.accessors.length - 1;
  }
  let nodeIndex = 0;
  for (const { geometry, material } of meshes) {
    const pos = geometry.getAttribute("position");
    const nor = geometry.getAttribute("normal") || null;
    const idx = geometry.getIndex();
    const posArr = new Float32Array(pos.array);
    const norArr = nor ? new Float32Array(nor.array) : new Float32Array(pos.count * 3);
    if (!nor) for (let i = 0; i < pos.count; i++) {
      norArr[i * 3] = 0;
      norArr[i * 3 + 1] = 1;
      norArr[i * 3 + 2] = 0;
    }
    let matIndex = -1;
    if (material && material.color) {
      const c = material.color;
      json.materials.push({
        pbrMetallicRoughness: {
          baseColorFactor: [c.r, c.g, c.b, 1],
          metallicFactor: material.metalness ?? 0,
          roughnessFactor: material.roughness ?? 1
        },
        doubleSided: material.side === THREE.DoubleSide
      });
      matIndex = json.materials.length - 1;
    }
    const posBV = pushBufferView(posArr, 34962);
    const norBV = pushBufferView(norArr, 34962);
    let idxBV = -1, idxAcc = -1;
    if (idx) {
      const idxArr = idx.array instanceof Uint32Array ? idx.array : new Uint32Array(idx.array);
      idxBV = pushBufferView(idxArr, 34963);
    }
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < posArr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], posArr[i + k]);
        max[k] = Math.max(max[k], posArr[i + k]);
      }
    }
    const posAcc = pushAccessor(posArr, 5126, pos.count, "VEC3", posBV, { min, max });
    const norAcc = pushAccessor(norArr, 5126, pos.count, "VEC3", norBV);
    if (idx) idxAcc = pushAccessor(idx.array instanceof Uint32Array ? idx.array : new Uint32Array(idx.array), 5125, idx.count, "SCALAR", idxBV);
    json.meshes.push({ primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: idxAcc, material: matIndex >= 0 ? matIndex : void 0 }] });
    json.nodes.push({ mesh: json.meshes.length - 1, name: material?.name || `mesh_${nodeIndex}` });
    json.scenes[0].nodes.push(json.nodes.length - 1);
    nodeIndex++;
  }
  const binBuffer = Buffer.concat(bin);
  json.buffers.push({ byteLength: binBuffer.length });
  const jsonStr = JSON.stringify(json);
  const jsonBuf = Buffer.from(jsonStr, "utf8");
  const jsonPadded = Buffer.alloc(pad4(jsonBuf.length));
  jsonBuf.copy(jsonPadded);
  const total = 12 + 8 + jsonPadded.length + 8 + binBuffer.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(1179937895, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonPadded.length, 12);
  out.writeUInt32LE(1313821514, 16);
  jsonPadded.copy(out, 20);
  const binOffset = 20 + jsonPadded.length;
  out.writeUInt32LE(binBuffer.length, binOffset);
  out.writeUInt32LE(5130562, binOffset + 4);
  binBuffer.copy(out, binOffset + 8);
  return out;
}

// tools/assetgen/png.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c >>> 1 ^ 3988292384 & -(c & 1);
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
function writePNG(path, w, h, rgba) {
  writeFileSync(path, encodePNG(w, h, rgba));
}

// tools/assetgen/models.mjs
import * as THREE4 from "three";

// src/entities/Rigs.ts
import * as THREE3 from "three";

// src/core/Palette.ts
var PALETTE = {
  ash: 14275269,
  bone: 15722972,
  slate: 3883337,
  slateDark: 2237995,
  peat: 4865845,
  peatDark: 3024928,
  moss: 7240276,
  mossDark: 5002297,
  rust: 10900783,
  rustBright: 13923903,
  oxblood: 7219752,
  blood: 7219752,
  palegold: 13214247,
  mire: 4147772,
  frost: 9414312,
  rot: 8029257
};

// src/world/Meshes.ts
import * as THREE2 from "three";

// src/core/RNG.ts
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
var Rng = class _Rng {
  seedNum;
  gen;
  constructor(seed) {
    this.seedNum = typeof seed === "number" ? seed >>> 0 : hashString(seed);
    this.gen = mulberry32(this.seedNum);
  }
  next() {
    return this.gen();
  }
  int(min, max) {
    return Math.floor(this.gen() * (max - min + 1)) + min;
  }
  range(min, max) {
    return this.gen() * (max - min) + min;
  }
  pick(arr) {
    if (arr.length === 0) throw new Error("RNG.pick on empty array");
    return arr[Math.floor(this.gen() * arr.length)];
  }
  bool(p = 0.5) {
    return this.gen() < p;
  }
  /** Gaussian via Box-Muller, clamped to +/-3 sigma. */
  gauss(mean = 0, sd = 1) {
    const u = Math.max(1e-9, this.gen());
    const v = this.gen();
    const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + sd * Math.max(-3, Math.min(3, n));
  }
  /** Weighted pick. weights must align with items and be non-negative. */
  weighted(items, weights) {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.gen() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i] ?? 0;
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.gen() * (i + 1));
      const a = arr[i];
      arr[i] = arr[j];
      arr[j] = a;
    }
    return arr;
  }
  fork(salt) {
    return new _Rng((this.seedNum ^ hashString(salt)) >>> 0);
  }
  get seed() {
    return this.seedNum;
  }
};
function makeRNG(seed) {
  return new Rng(seed);
}

// src/world/Meshes.ts
function mergeGeometries(list) {
  const out = new THREE2.BufferGeometry();
  let vCount = 0;
  let iCount = 0;
  for (const g of list) {
    const p = g.attributes.position;
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
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const uv = g.attributes.uv;
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
  out.setAttribute("position", new THREE2.BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE2.BufferAttribute(normals, 3));
  out.setAttribute("uv", new THREE2.BufferAttribute(uvs, 2));
  out.setIndex(new THREE2.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  return out;
}

// src/entities/Rigs.ts
var m = (c, r = 0.92, met = 0) => new THREE3.MeshStandardMaterial({ color: c, roughness: r, metalness: met, flatShading: true });
function buildHumanoid(opts) {
  const s = opts.scale ?? 1;
  const bulk = opts.bulk ?? 1;
  const root = new THREE3.Group();
  const skinMat = m(opts.skin, 0.94);
  const clothMat = m(opts.cloth, 0.97);
  const accentMat = m(opts.accent, 0.7, 0.2);
  const torsoGeo = new THREE3.CylinderGeometry(0.3 * bulk, 0.24 * bulk, 0.72, 6);
  const torso = new THREE3.Mesh(torsoGeo, clothMat);
  torso.position.y = 1.16 * s;
  torso.castShadow = true;
  root.add(torso);
  const hipGeo = new THREE3.CylinderGeometry(0.24 * bulk, 0.26 * bulk, 0.26, 6);
  const hips = new THREE3.Mesh(hipGeo, clothMat);
  hips.position.y = 0.74 * s;
  root.add(hips);
  const headGroup = new THREE3.Group();
  const headGeo = new THREE3.IcosahedronGeometry(0.19, 1);
  headGeo.scale(1, 1.15, 0.92);
  const head = new THREE3.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);
  const hoodGeo = new THREE3.ConeGeometry(0.27, 0.42, 7, 1, true);
  hoodGeo.translate(0, 0.06, -0.02);
  const hood = new THREE3.Mesh(hoodGeo, clothMat);
  hood.material.side = THREE3.DoubleSide;
  headGroup.add(hood);
  if (opts.emissiveEyes !== void 0) {
    const eyeMat = new THREE3.MeshStandardMaterial({
      color: opts.emissiveEyes,
      emissive: opts.emissiveEyes,
      emissiveIntensity: 3.2,
      roughness: 0.3
    });
    for (const sx of [-1, 1]) {
      const eye = new THREE3.Mesh(new THREE3.SphereGeometry(0.032, 6, 5), eyeMat);
      eye.position.set(sx * 0.072, 0.02, 0.163);
      headGroup.add(eye);
    }
  }
  headGroup.position.y = 1.62 * s;
  root.add(headGroup);
  const limb = (len, rTop, rBot, matx) => {
    const g = new THREE3.Group();
    const geo = new THREE3.CylinderGeometry(rTop, rBot, len, 5);
    geo.translate(0, -len / 2, 0);
    const mesh = new THREE3.Mesh(geo, matx);
    mesh.castShadow = true;
    g.add(mesh);
    return g;
  };
  const armL = limb(0.62 * s, 0.085 * bulk, 0.07 * bulk, skinMat);
  armL.position.set(-0.32 * bulk * s, 1.45 * s, 0);
  root.add(armL);
  const armR = limb(0.62 * s, 0.085 * bulk, 0.07 * bulk, skinMat);
  armR.position.set(0.32 * bulk * s, 1.45 * s, 0);
  root.add(armR);
  const legL = limb(0.72 * s, 0.11 * bulk, 0.085 * bulk, clothMat);
  legL.position.set(-0.14 * bulk * s, 0.74 * s, 0);
  root.add(legL);
  const legT = limb(0.72 * s, 0.11 * bulk, 0.085 * bulk, clothMat);
  legT.position.set(0.14 * bulk * s, 0.74 * s, 0);
  root.add(legT);
  const pauldron = new THREE3.Mesh(new THREE3.IcosahedronGeometry(0.15 * bulk, 0), accentMat);
  pauldron.position.set(0.33 * bulk * s, 1.47 * s, 0);
  pauldron.scale.set(1, 0.7, 1);
  root.add(pauldron);
  const weapon = new THREE3.Group();
  weapon.position.set(0, -0.6 * s, 0);
  armR.add(weapon);
  let cloak;
  if (opts.cloak) {
    const cg = new THREE3.ConeGeometry(0.42 * bulk, 1.05, 7, 2, true);
    cg.translate(0, -0.35, -0.06);
    cloak = new THREE3.Mesh(cg, new THREE3.MeshStandardMaterial({
      color: opts.cloth,
      roughness: 0.98,
      side: THREE3.DoubleSide,
      flatShading: true
    }));
    cloak.position.y = 1.5 * s;
    cloak.castShadow = true;
    root.add(cloak);
  }
  const rig = { root, torso, head, armL, armR, legL, legT, weapon };
  if (cloak) rig.cloak = cloak;
  return rig;
}
function buildHound(color, eyeColor) {
  const root = new THREE3.Group();
  const body = m(color, 0.95);
  const bodyGeo = new THREE3.CylinderGeometry(0.19, 0.15, 0.86, 6);
  bodyGeo.rotateZ(Math.PI / 2);
  const torso = new THREE3.Mesh(bodyGeo, body);
  torso.position.y = 0.52;
  torso.castShadow = true;
  root.add(torso);
  const headGeo = new THREE3.ConeGeometry(0.16, 0.4, 6);
  headGeo.rotateX(Math.PI / 2);
  const head = new THREE3.Mesh(headGeo, body);
  head.position.set(0, 0.56, 0.5);
  root.add(head);
  const eyeMat = new THREE3.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 3.4,
    roughness: 0.3
  });
  for (const sx of [-1, 1]) {
    const eye = new THREE3.Mesh(new THREE3.SphereGeometry(0.03, 5, 4), eyeMat);
    eye.position.set(sx * 0.07, 0.6, 0.62);
    root.add(eye);
  }
  const mkLeg = (x, z) => {
    const g = new THREE3.Group();
    const geo = new THREE3.CylinderGeometry(0.05, 0.038, 0.5, 4);
    geo.translate(0, -0.25, 0);
    g.add(new THREE3.Mesh(geo, body));
    g.position.set(x, 0.5, z);
    root.add(g);
    return g;
  };
  const legL = mkLeg(-0.13, 0.3);
  const legT = mkLeg(0.13, 0.3);
  const armL = mkLeg(-0.13, -0.3);
  const armR = mkLeg(0.13, -0.3);
  const tail = new THREE3.Mesh(new THREE3.CylinderGeometry(0.03, 0.01, 0.44, 4), body);
  tail.position.set(0, 0.6, -0.52);
  tail.rotation.x = -0.7;
  root.add(tail);
  const weapon = new THREE3.Group();
  return { root, torso, head, armL, armR, legL, legT, weapon };
}
function buildColossus() {
  const root = new THREE3.Group();
  const slate = m(PALETTE.slateDark, 0.94);
  const emberMat = new THREE3.MeshStandardMaterial({
    color: PALETTE.rust,
    emissive: PALETTE.rustBright,
    emissiveIntensity: 2.4,
    roughness: 0.6,
    flatShading: true
  });
  const parts = [];
  const rng = makeRNG("colossus");
  for (let i = 0; i < 14; i++) {
    const g = new THREE3.BoxGeometry(rng.range(0.7, 2.1), rng.range(0.6, 1.8), rng.range(0.7, 1.9));
    g.rotateY(rng.range(0, Math.PI));
    g.rotateZ(rng.range(-0.25, 0.25));
    g.translate(rng.range(-0.8, 0.8), 3.4 + rng.range(-1.3, 1.6), rng.range(-0.6, 0.6));
    parts.push(g);
  }
  const torsoGeo = mergeGeometries(parts);
  const torso = new THREE3.Mesh(torsoGeo, slate);
  torso.castShadow = true;
  root.add(torso);
  const crown = new THREE3.Group();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const spike = new THREE3.Mesh(new THREE3.ConeGeometry(0.16, 1.15, 4), emberMat);
    spike.position.set(Math.cos(a) * 0.72, 5.9, Math.sin(a) * 0.72);
    spike.rotation.z = Math.cos(a) * 0.32;
    spike.rotation.x = -Math.sin(a) * 0.32;
    crown.add(spike);
  }
  root.add(crown);
  const headGeo = new THREE3.IcosahedronGeometry(0.78, 0);
  const head = new THREE3.Mesh(headGeo, slate);
  head.position.y = 5.35;
  head.castShadow = true;
  root.add(head);
  const coreLight = new THREE3.PointLight(PALETTE.rustBright, 14, 26, 2);
  coreLight.position.set(0, 3.5, 0.6);
  root.add(coreLight);
  const core = new THREE3.Mesh(new THREE3.IcosahedronGeometry(0.42, 1), emberMat);
  core.position.set(0, 3.4, 0.55);
  root.add(core);
  const mkArm = (sx) => {
    const g = new THREE3.Group();
    const upper = new THREE3.Mesh(new THREE3.BoxGeometry(0.66, 2.1, 0.66), slate);
    upper.position.y = -1.05;
    g.add(upper);
    const fist = new THREE3.Mesh(new THREE3.IcosahedronGeometry(0.62, 0), slate);
    fist.position.y = -2.3;
    g.add(fist);
    g.position.set(sx * 1.85, 4.5, 0);
    g.castShadow = true;
    root.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  const mkLeg = (sx) => {
    const g = new THREE3.Group();
    const leg = new THREE3.Mesh(new THREE3.BoxGeometry(0.82, 2.5, 0.82), slate);
    leg.position.y = -1.25;
    g.add(leg);
    const foot = new THREE3.Mesh(new THREE3.BoxGeometry(1.05, 0.42, 1.35), slate);
    foot.position.set(0, -2.6, 0.24);
    g.add(foot);
    g.position.set(sx * 0.82, 2.7, 0);
    root.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legT = mkLeg(1);
  const weapon = new THREE3.Group();
  return { root, torso, head, armL, armR, legL, legT, weapon };
}
function buildWeapon(archetype, tint) {
  const g = new THREE3.Group();
  const steel = m(9278105, 0.42, 0.75);
  const wood = m(PALETTE.peatDark, 0.96);
  const accent = m(tint, 0.55, 0.4);
  switch (archetype) {
    case "maul": {
      const haft = new THREE3.Mesh(new THREE3.CylinderGeometry(0.038, 0.045, 1.25, 6), wood);
      haft.position.y = 0.42;
      g.add(haft);
      const head = new THREE3.Mesh(new THREE3.BoxGeometry(0.34, 0.32, 0.5), steel);
      head.position.y = 1.02;
      g.add(head);
      const band = new THREE3.Mesh(new THREE3.BoxGeometry(0.37, 0.07, 0.53), accent);
      band.position.y = 1.02;
      g.add(band);
      break;
    }
    case "spear": {
      const shaft = new THREE3.Mesh(new THREE3.CylinderGeometry(0.028, 0.032, 2.35, 6), wood);
      shaft.position.y = 0.8;
      g.add(shaft);
      const tip = new THREE3.Mesh(new THREE3.ConeGeometry(0.075, 0.46, 4), steel);
      tip.position.y = 2.14;
      g.add(tip);
      const collar = new THREE3.Mesh(new THREE3.CylinderGeometry(0.05, 0.05, 0.1, 6), accent);
      collar.position.y = 1.88;
      g.add(collar);
      break;
    }
    case "censer": {
      const chain = new THREE3.Mesh(new THREE3.CylinderGeometry(0.014, 0.014, 1, 4), steel);
      chain.position.y = 0.5;
      g.add(chain);
      const bowl = new THREE3.Mesh(new THREE3.IcosahedronGeometry(0.2, 0), accent);
      bowl.position.y = 1.08;
      g.add(bowl);
      const emberGlow = new THREE3.PointLight(tint, 4.5, 8, 2);
      emberGlow.position.y = 1.08;
      g.add(emberGlow);
      break;
    }
    default: {
      const grip = new THREE3.Mesh(new THREE3.CylinderGeometry(0.03, 0.034, 0.3, 6), wood);
      grip.position.y = 0.15;
      g.add(grip);
      const guard = new THREE3.Mesh(new THREE3.BoxGeometry(0.3, 0.05, 0.07), accent);
      guard.position.y = 0.32;
      g.add(guard);
      const blade = new THREE3.Mesh(new THREE3.BoxGeometry(0.085, 1.15, 0.026), steel);
      blade.position.y = 0.94;
      g.add(blade);
      const point = new THREE3.Mesh(new THREE3.ConeGeometry(0.06, 0.22, 4), steel);
      point.position.y = 1.6;
      g.add(point);
      break;
    }
  }
  g.traverse((o) => {
    if (o instanceof THREE3.Mesh) o.castShadow = true;
  });
  return g;
}

// tools/assetgen/models.mjs
function ground(object, targetHeight = null) {
  const box = new THREE4.Box3().setFromObject(object);
  object.position.y -= box.min.y;
  if (targetHeight) {
    const h = box.max.y - box.min.y;
    const s = targetHeight / h;
    object.scale.setScalar(s);
    object.updateMatrixWorld(true);
    const b2 = new THREE4.Box3().setFromObject(object);
    object.position.y -= b2.min.y;
  }
  object.updateMatrixWorld(true);
  return object;
}
var MODELS = [
  { id: "warden_blade", tris: 600, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.rust, scale: 1, cloak: true }), 1.8), tags: ["character", "player"] },
  { id: "warden_maul", tris: 640, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.blood, scale: 1.04, bulk: 1.2, cloak: true }), 1.8), tags: ["character", "player"] },
  { id: "warden_spear", tris: 580, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.palegold, scale: 0.98, cloak: false }), 1.8), tags: ["character", "player"] },
  { id: "censer", tris: 300, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.ember, scale: 0.96, cloak: true }), 1.8), tags: ["character", "player"] },
  { id: "husk", tris: 420, build: () => ground(buildHumanoid({ skin: PALETTE.ash, cloth: PALETTE.slate, accent: PALETTE.ash, scale: 1, cloak: false }), 1.8), tags: ["enemy"] },
  { id: "wight", tris: 480, build: () => ground(buildHumanoid({ skin: PALETTE.palegold, cloth: PALETTE.slate, accent: PALETTE.ash, scale: 1.02, cloak: true }), 1.85), tags: ["enemy"] },
  { id: "hound", tris: 360, build: () => ground(buildHound(PALETTE.slate, PALETTE.ember), 1.1), tags: ["enemy"] },
  { id: "warden_elite", tris: 700, build: () => ground(buildHumanoid({ skin: PALETTE.bone, cloth: PALETTE.slate, accent: PALETTE.palegold, scale: 1.05, bulk: 1.15, cloak: true }), 1.85), tags: ["enemy", "elite"] },
  { id: "colossus_boss", tris: 1200, build: () => ground(buildColossus(), 3.2), tags: ["enemy", "boss"] },
  { id: "cairn_stone", tris: 240, build: () => ground(new THREE4.Mesh(new THREE4.CylinderGeometry(0.5, 0.8, 1.4, 6), new THREE4.MeshStandardMaterial({ color: PALETTE.slate })), 1.4), tags: ["prop"] },
  { id: "pine_tree", tris: 220, build: () => ground(new THREE4.Group().add(new THREE4.Mesh(new THREE4.ConeGeometry(0.8, 3, 7), new THREE4.MeshStandardMaterial({ color: PALETTE.pine }))), 3.2), tags: ["prop", "foliage"] },
  { id: "dead_tree", tris: 180, build: () => ground(new THREE4.Group().add(new THREE4.Mesh(new THREE4.CylinderGeometry(0.1, 0.25, 3, 5), new THREE4.MeshStandardMaterial({ color: PALETTE.bark }))), 3), tags: ["prop", "foliage"] },
  { id: "rock_cluster", tris: 160, build: () => ground(new THREE4.Group().add(new THREE4.Mesh(new THREE4.IcosahedronGeometry(0.6, 0), new THREE4.MeshStandardMaterial({ color: PALETTE.slate }))), 0.9), tags: ["prop"] },
  { id: "ruin_arch", tris: 320, build: () => ground(new THREE4.Group().add(new THREE4.Mesh(new THREE4.BoxGeometry(2, 2.4, 0.4), new THREE4.MeshStandardMaterial({ color: PALETTE.slate }))), 2.4), tags: ["prop", "ruin"] },
  { id: "shrine", tris: 280, build: () => ground(new THREE4.Group().add(new THREE4.Mesh(new THREE4.BoxGeometry(0.8, 1.2, 0.8), new THREE4.MeshStandardMaterial({ color: PALETTE.palegold }))), 1.2), tags: ["prop"] },
  { id: "barrel", tris: 140, build: () => ground(new THREE4.Mesh(new THREE4.CylinderGeometry(0.4, 0.4, 1, 10), new THREE4.MeshStandardMaterial({ color: PALETTE.bark })), 1), tags: ["prop"] },
  { id: "watchtower", tris: 520, build: () => ground(new THREE4.Group().add(new THREE4.Mesh(new THREE4.CylinderGeometry(1.4, 1.6, 6, 8), new THREE4.MeshStandardMaterial({ color: PALETTE.slate }))), 6), tags: ["prop", "ruin"] },
  { id: "soul_wisp", tris: 80, build: () => ground(new THREE4.Mesh(new THREE4.IcosahedronGeometry(0.3, 1), new THREE4.MeshStandardMaterial({ color: PALETTE.ember, emissive: PALETTE.ember, emissiveIntensity: 2 })), 0.6), tags: ["fx"] },
  { id: "weapon_blade", tris: 90, build: () => ground(buildWeapon("blade", PALETTE.rust), 1.4), tags: ["weapon"] },
  { id: "weapon_maul", tris: 140, build: () => ground(buildWeapon("maul", PALETTE.rust), 1.6), tags: ["weapon"] },
  { id: "weapon_spear", tris: 110, build: () => ground(buildWeapon("spear", PALETTE.palegold), 2.1), tags: ["weapon"] },
  { id: "weapon_censer", tris: 130, build: () => ground(buildWeapon("censer", PALETTE.ember), 1.5), tags: ["weapon"] }
];

// tools/assetgen/textures.mjs
var SIZE = 512;
function makeNoise(rng, w, h, octaves) {
  const base = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) base[y * w + x] = rng.next();
  const out = new Float32Array(w * h);
  let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const step = 1 << o;
    const freq = 1 / step;
    let s = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * freq) * step;
        const sy = Math.floor(y * freq) * step;
        const tx = x * freq - Math.floor(x * freq);
        const ty = y * freq - Math.floor(y * freq);
        const a = base[sy % h * w + sx % w];
        const b = base[sy % h * w + (sx + step) % w];
        const c = base[(sy + step) % h * w + sx % w];
        const d = base[(sy + step) % h * w + (sx + step) % w];
        const top = a + (b - a) * tx;
        const bot = c + (d - c) * tx;
        out[y * w + x] += (top + (bot - top) * ty) * amp;
        s++;
      }
    tot += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function hexToRgb(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function generateTextureSet(spec) {
  const rng = makeRNG("tex-" + spec.id);
  const noise = makeNoise(rng, SIZE, SIZE, spec.octaves ?? 4);
  const albedo = new Uint8Array(SIZE * SIZE * 4);
  const normal = new Uint8Array(SIZE * SIZE * 4);
  const rough = new Uint8Array(SIZE * SIZE * 4);
  const base = hexToRgb(spec.base);
  const accent = hexToRgb(spec.accent ?? spec.base);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const n = noise[i];
    const n2 = makeNoise(rng, SIZE, SIZE, 2)[i];
    const t = Math.min(1, Math.max(0, (n - spec.lo) / (spec.hi - spec.lo)));
    const r = base[0] + (accent[0] - base[0]) * t;
    const g = base[1] + (accent[1] - base[1]) * t;
    const b = base[2] + (accent[2] - base[2]) * t;
    const o = i * 4;
    albedo[o] = r;
    albedo[o + 1] = g;
    albedo[o + 2] = b;
    albedo[o + 3] = 255;
    const gx = noise[(i + 1) % (SIZE * SIZE)] - n;
    const gy = noise[(i + SIZE) % (SIZE * SIZE)] - n;
    const len = Math.hypot(gx, gy, 1) || 1;
    normal[o] = gx / len * 127 + 128;
    normal[o + 1] = gy / len * 127 + 128;
    normal[o + 2] = 1 / len * 127 + 128;
    normal[o + 3] = 255;
    const rv = Math.max(0, Math.min(255, (spec.rough + (n2 - 0.5) * spec.roughVar) * 255));
    rough[o] = rv;
    rough[o + 1] = rv;
    rough[o + 2] = rv;
    rough[o + 3] = 255;
  }
  return { albedo, normal, rough };
}
var TEXTURE_SPECS = [
  { id: "rock_slate", base: "#3c4046", accent: "#5a6068", lo: 0.25, hi: 0.85, rough: 0.85, roughVar: 0.2, octaves: 5 },
  { id: "soil_peat", base: "#2e271f", accent: "#463a2c", lo: 0.2, hi: 0.9, rough: 0.95, roughVar: 0.1, octaves: 4 },
  { id: "grass_moss", base: "#39402c", accent: "#5c6b3a", lo: 0.15, hi: 0.8, rough: 0.8, roughVar: 0.25, octaves: 5 },
  { id: "ash_drift", base: "#4a4641", accent: "#6b645c", lo: 0.3, hi: 0.95, rough: 0.7, roughVar: 0.2, octaves: 3 },
  { id: "bark_pine", base: "#2a241c", accent: "#43382a", lo: 0.2, hi: 0.85, rough: 0.9, roughVar: 0.15, octaves: 6 },
  { id: "stone_ruin", base: "#55504a", accent: "#7a736a", lo: 0.3, hi: 0.9, rough: 0.8, roughVar: 0.2, octaves: 5 },
  { id: "metal_rust", base: "#6b4a32", accent: "#8a6a45", lo: 0.3, hi: 0.95, rough: 0.75, roughVar: 0.3, octaves: 4 },
  { id: "cloth_worn", base: "#54493d", accent: "#736452", lo: 0.25, hi: 0.85, rough: 0.9, roughVar: 0.1, octaves: 4 },
  { id: "bone_pale", base: "#c9c2ad", accent: "#e8e2cf", lo: 0.35, hi: 0.95, rough: 0.6, roughVar: 0.2, octaves: 3 },
  { id: "mire_mud", base: "#26231c", accent: "#3a342a", lo: 0.2, hi: 0.85, rough: 0.98, roughVar: 0.05, octaves: 4 }
];

// tools/assetgen/icons.mjs
var S = 128;
function newCanvas() {
  return { px: new Uint8Array(S * S * 4), w: S, h: S };
}
function clear(c, hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    c.px[o] = r;
    c.px[o + 1] = g;
    c.px[o + 2] = b;
    c.px[o + 3] = 255;
  }
}
function px(c, x, y, hex) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const [r, g, b] = hex.match(/\w\w/g).map((v) => parseInt(v, 16));
  const o = (y * S + x) * 4;
  c.px[o] = r;
  c.px[o + 1] = g;
  c.px[o + 2] = b;
  c.px[o + 3] = 255;
}
function line(c, x0, y0, x1, y1, hex) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    px(c, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), hex);
  }
}
function rect(c, x, y, w, h, hex) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(c, xx, yy, hex);
}
function circle(c, cx, cy, rad, hex, fill = false) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++) {
      const d = x * x + y * y;
      if (fill ? d <= rad * rad : Math.abs(d - rad * rad) <= rad) px(c, cx + x, cy + y, hex);
    }
}
var DRAW = {
  blade: (c) => {
    rect(c, 60, 20, 8, 80, "cfd6dd");
    line(c, 64, 16, 64, 104, "e8eef4");
    rect(c, 58, 100, 12, 8, "7a5a32");
  },
  maul: (c) => {
    rect(c, 58, 30, 12, 70, "7a5a32");
    rect(c, 44, 24, 40, 22, "8a8f96");
    circle(c, 64, 35, 8, "b0b6bd");
  },
  spear: (c) => {
    line(c, 64, 18, 64, 104, "7a5a32");
    line(c, 64, 18, 74, 34, "cfd6dd");
    line(c, 64, 18, 54, 34, "cfd6dd");
  },
  censer: (c) => {
    circle(c, 64, 50, 22, "d98a3a", true);
    rect(c, 62, 70, 4, 32, "7a5a32");
    circle(c, 64, 50, 12, "f4b860", true);
  },
  cloak: (c) => {
    rect(c, 40, 30, 48, 64, "5a4a8a");
    line(c, 40, 30, 64, 22, "6e5ca8");
    line(c, 88, 30, 64, 22, "6e5ca8");
  },
  charm: (c) => {
    circle(c, 64, 64, 26, "d8c36a", true);
    circle(c, 64, 64, 14, "f0e0a0", true);
  },
  relic: (c) => {
    rect(c, 48, 44, 32, 40, "c9a23a");
    rect(c, 44, 60, 40, 8, "e8c860");
    circle(c, 64, 54, 8, "f4e0a0");
  },
  potion: (c) => {
    rect(c, 58, 30, 12, 16, "9aa0a6");
    circle(c, 64, 76, 26, "7ad0c0", true);
    rect(c, 54, 66, 20, 20, "aee0d4");
  },
  ember: (c) => {
    circle(c, 64, 64, 28, "d9492a", true);
    circle(c, 64, 64, 16, "f4a13a", true);
    circle(c, 64, 64, 6, "ffe08a", true);
  },
  soul: (c) => {
    circle(c, 64, 60, 24, "6ad0e8", true);
    circle(c, 64, 60, 12, "bff0f8", true);
    rect(c, 56, 80, 16, 6, "6ad0e8");
  },
  skill_strike: (c) => {
    line(c, 30, 98, 98, 30, "e8c860");
    line(c, 40, 90, 90, 40, "f4e0a0");
  },
  skill_dash: (c) => {
    line(c, 24, 64, 104, 64, "6ad0e8");
    circle(c, 100, 64, 10, "bff0f8", true);
  },
  skill_parry: (c) => {
    circle(c, 64, 64, 30, "cfd6dd");
    circle(c, 64, 64, 18, "8a8f96", true);
    circle(c, 64, 64, 8, "f4e0a0", true);
  },
  skill_ember: (c) => {
    circle(c, 64, 64, 28, "d9492a", true);
    line(c, 64, 36, 64, 92, "f4a13a");
    line(c, 36, 64, 92, 64, "f4a13a");
  },
  skill_bank: (c) => {
    rect(c, 44, 48, 40, 40, "d8c36a");
    rect(c, 52, 56, 24, 24, "f0e0a0");
    line(c, 64, 40, 64, 48, "f4e0a0");
  },
  skill_combo: (c) => {
    line(c, 34, 80, 64, 48, "e8c860");
    line(c, 64, 48, 94, 80, "f4e0a0");
    circle(c, 64, 48, 10, "fff0c0", true);
  }
};
var ICON_IDS = Object.keys(DRAW);
function generateIcon(id) {
  const c = newCanvas();
  clear(c, "1b1f24");
  rect(c, 8, 8, S - 16, S - 16, "262b31");
  (DRAW[id] || DRAW.relic)(c);
  return c.px;
}

// tools/assetgen/build.mjs
var ROOT = join(process.cwd(), "public", "assets");
var DIR_GLB = join(ROOT, "models");
var DIR_TEX = join(ROOT, "textures");
var DIR_ICO = join(ROOT, "icons");
for (const d of [DIR_GLB, DIR_TEX, DIR_ICO]) mkdirSync(d, { recursive: true });
var manifest = { version: 1, generated: (/* @__PURE__ */ new Date()).toISOString(), entries: [] };
function bytes(p) {
  return statSync(p).size;
}
for (const m2 of MODELS) {
  const obj = m2.build();
  const glb = buildGLB(obj);
  const path = join(DIR_GLB, m2.id + ".glb");
  writeFileSync2(path, glb);
  manifest.entries.push({
    id: m2.id,
    kind: "model",
    path: "assets/models/" + m2.id + ".glb",
    bytes: bytes(path),
    tris: m2.tris,
    tags: m2.tags,
    description: "Procedural low-poly model: " + m2.id
  });
}
for (const spec of TEXTURE_SPECS) {
  const { albedo, normal, rough } = generateTextureSet(spec);
  const a = join(DIR_TEX, spec.id + "_albedo.png");
  const n = join(DIR_TEX, spec.id + "_normal.png");
  const r = join(DIR_TEX, spec.id + "_rough.png");
  writePNG(a, 512, 512, albedo);
  writePNG(n, 512, 512, normal);
  writePNG(r, 512, 512, rough);
  manifest.entries.push({
    id: spec.id,
    kind: "texture",
    path: "assets/textures/" + spec.id,
    bytes: bytes(a) + bytes(n) + bytes(r),
    dims: [512, 512],
    tags: ["pbr", "seamless"],
    description: "Procedural PBR set (albedo/normal/roughness): " + spec.id
  });
}
for (const id of ICON_IDS) {
  const px2 = generateIcon(id);
  const p = join(DIR_ICO, id + ".png");
  writePNG(p, 128, 128, px2);
  manifest.entries.push({
    id,
    kind: "icon",
    path: "assets/icons/" + id + ".png",
    bytes: bytes(p),
    dims: [128, 128],
    tags: ["ui"],
    description: "Procedural UI icon: " + id
  });
}
writeFileSync2(join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
var totalBytes = manifest.entries.reduce((s, e) => s + e.bytes, 0);
console.log(`Asset generation complete:
  models : ${MODELS.length}
  textures: ${TEXTURE_SPECS.length} sets (${TEXTURE_SPECS.length * 3} PNGs)
  icons  : ${ICON_IDS.length}
  manifest entries: ${manifest.entries.length}
  total bytes: ${totalBytes}`);
