// Minimal GLB (binary glTF 2.0) writer. No external deps.
// Exports an array of THREE meshes/groups into one .glb with merged primitives.
import * as THREE from 'three';

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

function pad4(n) { return (n + 3) & ~3; }

export function buildGLB(root) {
  const meshes = collectGeometries(root);
  const json = {
    asset: { version: '2.0', generator: 'ashenreach-assetgen' },
    scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [],
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
    if (minmax) { a.min = minmax.min; a.max = minmax.max; }
    json.accessors.push(a);
    return json.accessors.length - 1;
  }

  let nodeIndex = 0;
  for (const { geometry, material } of meshes) {
    const pos = geometry.getAttribute('position');
    const nor = geometry.getAttribute('normal') || null;
    const idx = geometry.getIndex();
    const posArr = new Float32Array(pos.array);
    const norArr = nor ? new Float32Array(nor.array) : new Float32Array(pos.count * 3);
    if (!nor) for (let i = 0; i < pos.count; i++) { norArr[i*3]=0; norArr[i*3+1]=1; norArr[i*3+2]=0; }

    // material
    let matIndex = -1;
    if (material && material.color) {
      const c = material.color;
      json.materials.push({
        pbrMetallicRoughness: {
          baseColorFactor: [c.r, c.g, c.b, 1],
          metallicFactor: material.metalness ?? 0,
          roughnessFactor: material.roughness ?? 1,
        },
        doubleSided: material.side === THREE.DoubleSide,
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

    // min/max for position
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < posArr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], posArr[i+k]);
        max[k] = Math.max(max[k], posArr[i+k]);
      }
    }

    const posAcc = pushAccessor(posArr, 5126, pos.count, 'VEC3', posBV, { min, max });
    const norAcc = pushAccessor(norArr, 5126, pos.count, 'VEC3', norBV);
    if (idx) idxAcc = pushAccessor(idx.array instanceof Uint32Array ? idx.array : new Uint32Array(idx.array), 5125, idx.count, 'SCALAR', idxBV);

    json.meshes.push({ primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: idxAcc, material: matIndex >= 0 ? matIndex : undefined }] });
    json.nodes.push({ mesh: json.meshes.length - 1, name: material?.name || `mesh_${nodeIndex}` });
    json.scenes[0].nodes.push(json.nodes.length - 1);
    nodeIndex++;
  }

  const binBuffer = Buffer.concat(bin);
  json.buffers.push({ byteLength: binBuffer.length });

  const jsonStr = JSON.stringify(json);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const jsonPadded = Buffer.alloc(pad4(jsonBuf.length));
  jsonBuf.copy(jsonPadded);

  const total = 12 + 8 + jsonPadded.length + 8 + binBuffer.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546C67, 0); // glTF
  out.writeUInt32LE(2, 4); // version
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonPadded.length, 12);
  out.writeUInt32LE(0x4E4F534A, 16); // JSON
  jsonPadded.copy(out, 20);
  const binOffset = 20 + jsonPadded.length;
  out.writeUInt32LE(binBuffer.length, binOffset);
  out.writeUInt32LE(0x004E4942, binOffset + 4); // BIN\0
  binBuffer.copy(out, binOffset + 8);
  return out;
}
