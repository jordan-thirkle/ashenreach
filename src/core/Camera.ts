import * as THREE from 'three';
import { damp } from '../world/Noise';
import type { Terrain } from '../world/Terrain';

/**
 * Third-person orbit camera with collision, deadzone, and combat framing.
 * Follows camera-systems practice: the camera owns framing, Juice owns shake.
 */
export class GameCamera {
  readonly cam: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = -0.28;
  distance = 7.2;
  private targetDistance = 7.2;
  private smoothTarget = new THREE.Vector3();
  private shakeBase = new THREE.Vector3();
  private fovBase = 62;
  private fovTarget = 62;
  private terrain: Terrain;
  private lookAhead = new THREE.Vector3();
  /** Collision pull-in fraction along target->desired (1 = fully out). */
  private collideT = 1;
  private readonly CLEARANCE = 0.85;
  private readonly MIN_T = 0.28;

  constructor(aspect: number, terrain: Terrain) {
    this.cam = new THREE.PerspectiveCamera(this.fovBase, aspect, 0.1, 1800);
    this.terrain = terrain;
  }

  resize(aspect: number): void {
    this.cam.aspect = aspect;
    this.cam.updateProjectionMatrix();
  }

  rotate(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    // Third-person follow cameras stay BEHIND and ABOVE the player. Clamp pitch
    // to strictly negative so the camera can never swing above the horizon and
    // render the world upside-down (a known failure when input sign or combat
    // framing pushed pitch positive).
    this.pitch = Math.max(-1.15, Math.min(-0.05, this.pitch + dPitch));
  }

  zoom(delta: number): void {
    this.targetDistance = Math.max(3.4, Math.min(13, this.targetDistance + delta));
  }

  /** Pull FOV wide on sprint/dash - the cheapest speed cue there is. */
  setSpeedFov(speed01: number): void {
    this.fovTarget = this.fovBase + speed01 * 9;
  }

  setCombatFraming(inCombat: boolean): void {
    this.targetDistance = inCombat ? 8.1 : 7.2;
  }

  update(target: THREE.Vector3, velocity: THREE.Vector3, dt: number): void {
    // Deadzone: the camera target lags the player slightly and leads their velocity.
    this.lookAhead.set(velocity.x, 0, velocity.z).multiplyScalar(0.22);
    const want = new THREE.Vector3(
      target.x + this.lookAhead.x,
      target.y + 1.62,
      target.z + this.lookAhead.z,
    );
    this.smoothTarget.x = damp(this.smoothTarget.x, want.x, 11, dt);
    this.smoothTarget.y = damp(this.smoothTarget.y, want.y, 7.5, dt);
    this.smoothTarget.z = damp(this.smoothTarget.z, want.z, 11, dt);

    this.distance = damp(this.distance, this.targetDistance, 6, dt);
    this.cam.fov = damp(this.cam.fov, this.fovTarget, 5, dt);
    this.cam.updateProjectionMatrix();

    const cp = Math.cos(this.pitch);
    // Camera sits BEHIND and ABOVE the target. pitch<0 (down-look) => camera high.
    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * cp,
      -Math.sin(this.pitch),
      -Math.cos(this.yaw) * cp,
    ).multiplyScalar(this.distance);

    let desired = this.smoothTarget.clone().add(offset);

    // --- Terrain collision -------------------------------------------------
    // March from the target toward the desired position and find the first
    // fraction where terrain (plus clearance) occludes the camera.
    const steps = 12;
    let hitT = 1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = this.smoothTarget.x + (desired.x - this.smoothTarget.x) * t;
      const py = this.smoothTarget.y + (desired.y - this.smoothTarget.y) * t;
      const pz = this.smoothTarget.z + (desired.z - this.smoothTarget.z) * t;
      if (py < this.terrain.height(px, pz) + this.CLEARANCE) {
        hitT = Math.max(this.MIN_T, (i - 1) / steps);
        break;
      }
    }

    // Snap in immediately when blocked (never clip), ease back out when clear.
    // Asymmetric damping is what keeps this from jittering on broken ground.
    if (hitT < this.collideT) this.collideT = hitT;
    else this.collideT = damp(this.collideT, hitT, 3.2, dt);
    this.collideT = Math.max(this.MIN_T, Math.min(1, this.collideT));

    desired = this.smoothTarget.clone().lerp(desired, this.collideT);

    // Final floor guard: never sit below the ground under the camera.
    const minY = this.terrain.height(desired.x, desired.z) + this.CLEARANCE;
    if (desired.y < minY) desired.y = minY;

    this.cam.position.copy(desired);
    this.shakeBase.copy(desired);
    this.cam.lookAt(this.smoothTarget);
  }

  /** Restore the pre-shake transform so shake never accumulates. */
  resetShake(): void {
    this.cam.position.copy(this.shakeBase);
    this.cam.rotation.z = 0;
  }

  worldToScreen(v: THREE.Vector3, w: number, h: number): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.cam);
    return {
      x: (p.x * 0.5 + 0.5) * w,
      y: (-p.y * 0.5 + 0.5) * h,
      visible: p.z < 1 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1,
    };
  }
}
