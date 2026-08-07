import * as THREE from 'three';
import { PALETTE } from '../core/Palette';

// A pooled, texture-free slash arc that appears during a weapon swing and
// fades fast. Cheap (additive transparent ring segment) and per-weapon tinted.
// Reuses the proven CharacterRig weapon anchor + PALETTE; no new assets.

interface Swing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  max: number;
}

const ARCHETYPE_COLOR: Record<string, number> = {
  blade: PALETTE.palegold,
  maul: PALETTE.rustBright,
  spear: PALETTE.bone,
  censer: PALETTE.palegold,
  glaive: PALETTE.rustBright,
};

export class SwingFx {
  private scene: THREE.Scene;
  private pool: Swing[] = [];
  private active: Swing[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private acquire(): Swing {
    const s = this.pool.pop();
    if (s) return s;
    const geo = new THREE.RingGeometry(0.92, 1.5, 32, 1, Math.PI * 0.35, Math.PI * 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: PALETTE.palegold,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, mat, life: 0, max: 0.22 };
  }

  spawn(pos: THREE.Vector3, facing: number, arc: number, archetype: string | undefined, reach: number): void {
    const s = this.acquire();
    s.max = 0.22;
    s.life = s.max;
    const color = ARCHETYPE_COLOR[archetype ?? 'blade'] ?? PALETTE.palegold;
    s.mat.color.setHex(color);
    const scale = Math.max(1.4, reach * 0.72);
    const tall = 0.7 + Math.min(1.4, arc / Math.PI); // wider weapon arc => taller slash
    s.mesh.scale.set(scale, scale * tall, scale);
    s.mesh.position.set(pos.x, pos.y + 1.15, pos.z);
    // Ring geometry lies in the XY plane; rotate X by 90deg to lay it flat on
    // the ground, then yaw around world Y so the slash faces the swing bearing.
    s.mesh.rotation.set(Math.PI / 2, 0, 0);
    s.mesh.rotation.y = -facing;
    s.mesh.visible = true;
    s.mat.opacity = 0.5; // translucent slash, not a solid wedge
    this.active.push(s);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.life -= dt;
      const k = Math.max(0, s.life / s.max);
      s.mat.opacity = 0.5 * k * k;
      s.mesh.rotation.y += dt * 6; // slight sweep so the slash reads as motion
      if (s.life <= 0) {
        s.mesh.visible = false;
        s.mat.opacity = 0;
        this.active.splice(i, 1);
        this.pool.push(s);
      }
    }
  }

  dispose(): void {
    for (const s of [...this.active, ...this.pool]) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mat.dispose();
    }
    this.active.length = 0;
    this.pool.length = 0;
  }
}
