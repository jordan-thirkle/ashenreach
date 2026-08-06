import * as THREE from 'three';
import { PALETTE } from '../core/Palette';
import { mergeGeometries } from '../world/Meshes';
import { makeRNG } from '../core/RNG';

export interface CharacterRig {
  root: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legT: THREE.Group;
  weapon: THREE.Group;
  cloak?: THREE.Mesh;
  /** Boss-only handles (populated by buildColossus) used for phase escalation cues. */
  crown?: THREE.Group;
  core?: THREE.Mesh;
  ember?: THREE.MeshStandardMaterial;
  coreLight?: THREE.PointLight;
}

const m = (c: number, r = 0.92, met = 0): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: met, flatShading: true });

/**
 * Hand-built low-poly humanoid rig. No glTF, no skinning cost - limbs are
 * Groups rotated procedurally, which is far cheaper than a SkinnedMesh and
 * cannot hit the T-pose/clone bugs that plague rigged browser characters.
 */
export function buildHumanoid(opts: {
  skin: number; cloth: number; accent: number;
  scale?: number; bulk?: number; cloak?: boolean; emissiveEyes?: number;
}): CharacterRig {
  const s = opts.scale ?? 1;
  const bulk = opts.bulk ?? 1;
  const root = new THREE.Group();

  const skinMat = m(opts.skin, 0.94);
  const clothMat = m(opts.cloth, 0.97);
  const accentMat = m(opts.accent, 0.7, 0.2);

  // Torso: tapered box, wider at shoulders.
  const torsoGeo = new THREE.CylinderGeometry(0.3 * bulk, 0.24 * bulk, 0.72, 6);
  const torso = new THREE.Mesh(torsoGeo, clothMat);
  torso.position.y = 1.16 * s;
  torso.castShadow = true;
  root.add(torso);

  const hipGeo = new THREE.CylinderGeometry(0.24 * bulk, 0.26 * bulk, 0.26, 6);
  const hips = new THREE.Mesh(hipGeo, clothMat);
  hips.position.y = 0.74 * s;
  root.add(hips);

  // Head + hood.
  const headGroup = new THREE.Group();
  const headGeo = new THREE.IcosahedronGeometry(0.19, 1);
  headGeo.scale(1, 1.15, 0.92);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const hoodGeo = new THREE.ConeGeometry(0.27, 0.42, 7, 1, true);
  hoodGeo.translate(0, 0.06, -0.02);
  const hood = new THREE.Mesh(hoodGeo, clothMat);
  hood.material.side = THREE.DoubleSide;
  headGroup.add(hood);

  if (opts.emissiveEyes !== undefined) {
    const eyeMat = new THREE.MeshStandardMaterial({
      color: opts.emissiveEyes, emissive: opts.emissiveEyes,
      emissiveIntensity: 3.2, roughness: 0.3,
    });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), eyeMat);
      eye.position.set(sx * 0.072, 0.02, 0.163);
      headGroup.add(eye);
    }
  }
  headGroup.position.y = 1.62 * s;
  root.add(headGroup);

  const limb = (len: number, rTop: number, rBot: number, matx: THREE.Material): THREE.Group => {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(rTop, rBot, len, 5);
    geo.translate(0, -len / 2, 0);
    const mesh = new THREE.Mesh(geo, matx);
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

  // Shoulder plate reads the silhouette at distance.
  const pauldron = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 * bulk, 0), accentMat);
  pauldron.position.set(0.33 * bulk * s, 1.47 * s, 0);
  pauldron.scale.set(1, 0.7, 1);
  root.add(pauldron);

  const weapon = new THREE.Group();
  weapon.position.set(0, -0.6 * s, 0);
  armR.add(weapon);

  let cloak: THREE.Mesh | undefined;
  if (opts.cloak) {
    const cg = new THREE.ConeGeometry(0.42 * bulk, 1.05, 7, 2, true);
    cg.translate(0, -0.35, -0.06);
    cloak = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({
      color: opts.cloth, roughness: 0.98, side: THREE.DoubleSide, flatShading: true,
    }));
    cloak.position.y = 1.5 * s;
    cloak.castShadow = true;
    root.add(cloak);
  }

  const rig: CharacterRig = { root, torso, head, armL, armR, legL, legT, weapon };
  if (cloak) rig.cloak = cloak;
  return rig;
}

/** Quadruped hound. Different silhouette so it reads instantly as a threat class. */
export function buildHound(color: number, eyeColor: number): CharacterRig {
  const root = new THREE.Group();
  const body = m(color, 0.95);
  const bodyGeo = new THREE.CylinderGeometry(0.19, 0.15, 0.86, 6);
  bodyGeo.rotateZ(Math.PI / 2);
  const torso = new THREE.Mesh(bodyGeo, body);
  torso.position.y = 0.52;
  torso.castShadow = true;
  root.add(torso);

  const headGeo = new THREE.ConeGeometry(0.16, 0.4, 6);
  headGeo.rotateX(Math.PI / 2);
  const head = new THREE.Mesh(headGeo, body);
  head.position.set(0, 0.56, 0.5);
  root.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor, emissive: eyeColor, emissiveIntensity: 3.4, roughness: 0.3,
  });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), eyeMat);
    eye.position.set(sx * 0.07, 0.6, 0.62);
    root.add(eye);
  }

  const mkLeg = (x: number, z: number): THREE.Group => {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.05, 0.038, 0.5, 4);
    geo.translate(0, -0.25, 0);
    g.add(new THREE.Mesh(geo, body));
    g.position.set(x, 0.5, z);
    root.add(g);
    return g;
  };
  const legL = mkLeg(-0.13, 0.3);
  const legT = mkLeg(0.13, 0.3);
  const armL = mkLeg(-0.13, -0.3);
  const armR = mkLeg(0.13, -0.3);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.44, 4), body);
  tail.position.set(0, 0.6, -0.52);
  tail.rotation.x = -0.7;
  root.add(tail);

  const weapon = new THREE.Group();
  return { root, torso, head, armL, armR, legL, legT, weapon };
}

/** The Colossus. Deliberately not a scaled humanoid - it must read as architecture. */
export function buildColossus(): CharacterRig {
  const root = new THREE.Group();
  const slate = m(PALETTE.slateDark, 0.94);
  const emberMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rust, emissive: PALETTE.rustBright,
    emissiveIntensity: 2.4, roughness: 0.6, flatShading: true,
  });

  const parts: THREE.BufferGeometry[] = [];
  const rng = makeRNG('colossus');
  for (let i = 0; i < 14; i++) {
    const g = new THREE.BoxGeometry(rng.range(0.7, 2.1), rng.range(0.6, 1.8), rng.range(0.7, 1.9));
    g.rotateY(rng.range(0, Math.PI));
    g.rotateZ(rng.range(-0.25, 0.25));
    g.translate(rng.range(-0.8, 0.8), 3.4 + rng.range(-1.3, 1.6), rng.range(-0.6, 0.6));
    parts.push(g);
  }
  const torsoGeo = mergeGeometries(parts);
  const torso = new THREE.Mesh(torsoGeo, slate);
  torso.castShadow = true;
  root.add(torso);

  const crown = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.15, 4), emberMat);
    spike.position.set(Math.cos(a) * 0.72, 5.9, Math.sin(a) * 0.72);
    spike.rotation.z = Math.cos(a) * 0.32;
    spike.rotation.x = -Math.sin(a) * 0.32;
    crown.add(spike);
  }
  root.add(crown);

  const headGeo = new THREE.IcosahedronGeometry(0.78, 0);
  const head = new THREE.Mesh(headGeo, slate);
  head.position.y = 5.35;
  head.castShadow = true;
  root.add(head);

  const coreLight = new THREE.PointLight(PALETTE.rustBright, 14, 26, 2);
  coreLight.position.set(0, 3.5, 0.6);
  root.add(coreLight);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), emberMat);
  core.position.set(0, 3.4, 0.55);
  root.add(core);

  const mkArm = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.1, 0.66), slate);
    upper.position.y = -1.05;
    g.add(upper);
    const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), slate);
    fist.position.y = -2.3;
    g.add(fist);
    g.position.set(sx * 1.85, 4.5, 0);
    g.castShadow = true;
    root.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  const mkLeg = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.5, 0.82), slate);
    leg.position.y = -1.25;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 1.35), slate);
    foot.position.set(0, -2.6, 0.24);
    g.add(foot);
    g.position.set(sx * 0.82, 2.7, 0);
    root.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legT = mkLeg(1);

  const weapon = new THREE.Group();
  return { root, torso, head, armL, armR, legL, legT, weapon, crown, core, ember: emberMat, coreLight };
}

/**
 * Phase escalation dressing for the Colossus rig. Phase 1 is the base look;
 * each further phase burns hotter, spins its crown faster and swells slightly
 * so the escalation reads at a glance instead of only in the HP bar.
 */
export function setColossusPhaseVisual(rig: CharacterRig, phase: number, time: number, flash = 0): void {
  const p = Math.max(1, Math.min(3, phase));
  if (rig.ember) {
    const base = p === 3 ? 5.6 : p === 2 ? 3.8 : 2.4;
    const pulse = 1 + Math.sin(time * (2 + p * 2.2)) * (0.08 + p * 0.05);
    rig.ember.emissiveIntensity = base * pulse + flash * 6;
    rig.ember.color.setHex(p === 3 ? PALETTE.rustBright : PALETTE.rust);
  }
  if (rig.coreLight) rig.coreLight.intensity = (p === 3 ? 30 : p === 2 ? 21 : 14) + flash * 40;
  if (rig.crown) {
    rig.crown.rotation.y = time * (0.12 + (p - 1) * 0.45);
    rig.crown.position.y = Math.sin(time * (1 + p)) * 0.06 * p;
  }
  const swell = 1 + (p - 1) * 0.06 + flash * 0.08;
  rig.root.scale.setScalar(swell);
}

/** Weapon meshes, built to the archetype so the silhouette matches the profile. */
export function buildWeapon(archetype: string, tint: number): THREE.Group {
  const g = new THREE.Group();
  const steel = m(0x8d9299, 0.42, 0.75);
  const wood = m(PALETTE.peatDark, 0.96);
  const accent = m(tint, 0.55, 0.4);

  switch (archetype) {
    case 'maul': {
      const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 1.25, 6), wood);
      haft.position.y = 0.42;
      g.add(haft);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.5), steel);
      head.position.y = 1.02;
      g.add(head);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.07, 0.53), accent);
      band.position.y = 1.02;
      g.add(band);
      break;
    }
    case 'spear': {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 2.35, 6), wood);
      shaft.position.y = 0.8;
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.46, 4), steel);
      tip.position.y = 2.14;
      g.add(tip);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), accent);
      collar.position.y = 1.88;
      g.add(collar);
      break;
    }
    case 'censer': {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.0, 4), steel);
      chain.position.y = 0.5;
      g.add(chain);
      const bowl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), accent);
      bowl.position.y = 1.08;
      g.add(bowl);
      const emberGlow = new THREE.PointLight(tint, 4.5, 8, 2);
      emberGlow.position.y = 1.08;
      g.add(emberGlow);
      break;
    }
    case 'glaive': {
      // Long polearm: slim shaft with a broad, canted cleaver head.
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 1.95, 6), wood);
      shaft.position.y = 0.62;
      g.add(shaft);
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.16, 6), accent);
      socket.position.y = 1.58;
      g.add(socket);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.86, 0.19), steel);
      blade.position.set(0.05, 2.02, 0);
      blade.rotation.z = -0.24;
      g.add(blade);
      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.3), steel);
      belly.position.set(0.14, 1.86, 0);
      belly.rotation.z = -0.55;
      g.add(belly);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 4), steel);
      tip.position.set(0.16, 2.52, 0);
      tip.rotation.z = -0.24;
      g.add(tip);
      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.05), accent);
      hook.position.set(-0.11, 1.76, 0);
      hook.rotation.z = 0.7;
      g.add(hook);
      break;
    }
    default: {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.3, 6), wood);
      grip.position.y = 0.15;
      g.add(grip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.07), accent);
      guard.position.y = 0.32;
      g.add(guard);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.15, 0.026), steel);
      blade.position.y = 0.94;
      g.add(blade);
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), steel);
      point.position.y = 1.6;
      g.add(point);
      break;
    }
  }
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return g;
}
