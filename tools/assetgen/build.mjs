// Ashenreach asset generator. Run: node tools/assetgen/build.mjs
// Produces deterministic GLB models, PBR texture sets, and procedural icons,
// then writes public/assets/manifest.json. No third-party assets or licences.
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildGLB } from './glb.mjs';
import { writePNG } from './png.mjs';
import { MODELS } from './models.mjs';
import { TEXTURE_SPECS, generateTextureSet } from './textures.mjs';
import { ICON_IDS, generateIcon } from './icons.mjs';

const ROOT = join(process.cwd(), 'public', 'assets');
const DIR_GLB = join(ROOT, 'models');
const DIR_TEX = join(ROOT, 'textures');
const DIR_ICO = join(ROOT, 'icons');
for (const d of [DIR_GLB, DIR_TEX, DIR_ICO]) mkdirSync(d, { recursive: true });

const manifest = { version: 1, generated: new Date().toISOString(), entries: [] };

function bytes(p) { return statSync(p).size; }

// 1) Models
for (const m of MODELS) {
  const obj = m.build();
  const glb = buildGLB(obj);
  const path = join(DIR_GLB, m.id + '.glb');
  writeFileSync(path, glb);
  manifest.entries.push({
    id: m.id, kind: 'model', path: 'assets/models/' + m.id + '.glb',
    bytes: bytes(path), tris: m.tris, tags: m.tags,
    description: 'Procedural low-poly model: ' + m.id,
  });
}

// 2) Texture sets
for (const spec of TEXTURE_SPECS) {
  const { albedo, normal, rough } = generateTextureSet(spec);
  const a = join(DIR_TEX, spec.id + '_albedo.png');
  const n = join(DIR_TEX, spec.id + '_normal.png');
  const r = join(DIR_TEX, spec.id + '_rough.png');
  writePNG(a, 512, 512, albedo);
  writePNG(n, 512, 512, normal);
  writePNG(r, 512, 512, rough);
  manifest.entries.push({
    id: spec.id, kind: 'texture', path: 'assets/textures/' + spec.id,
    bytes: bytes(a) + bytes(n) + bytes(r), dims: [512, 512], tags: ['pbr', 'seamless'],
    description: 'Procedural PBR set (albedo/normal/roughness): ' + spec.id,
  });
}

// 3) Icons
for (const id of ICON_IDS) {
  const px = generateIcon(id);
  const p = join(DIR_ICO, id + '.png');
  writePNG(p, 128, 128, px);
  manifest.entries.push({
    id, kind: 'icon', path: 'assets/icons/' + id + '.png',
    bytes: bytes(p), dims: [128, 128], tags: ['ui'],
    description: 'Procedural UI icon: ' + id,
  });
}

writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));

const totalBytes = manifest.entries.reduce((s, e) => s + e.bytes, 0);
console.log(`Asset generation complete:
  models : ${MODELS.length}
  textures: ${TEXTURE_SPECS.length} sets (${TEXTURE_SPECS.length * 3} PNGs)
  icons  : ${ICON_IDS.length}
  manifest entries: ${manifest.entries.length}
  total bytes: ${totalBytes}`);
