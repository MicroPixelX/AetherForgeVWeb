import { FreeCamera, Vector3 } from "@babylonjs/core";
import type { World } from "../sim/world";
import { BlockId, blockProperties } from "../sim/blocks";

export interface InputState {
  forward: boolean; back: boolean; left: boolean; right: boolean; jump: boolean;
}

// Player AABB half-extents (player is 1.6 blocks tall, 0.6 wide).
const HALF_W = 0.3;
const HEIGHT = 1.6;
const EYE = 1.45;

const GRAVITY = -28.0;
const JUMP_V = 9.2;
const WALK_SPEED = 5.5;
const SPRINT_MULT = 1.6;

export class PlayerController {
  enabled = false;
  private vel = new Vector3(0, 0, 0);
  private onGround = false;
  private yaw = 0;
  private pitch = 0;

  constructor(private camera: FreeCamera, private world: World, private input: InputState) {
    canvasPointerLockHook();
    this.installLookListeners();
  }

  private listenersInstalled = false;
  private installLookListeners(): void {
    if (this.listenersInstalled) return;
    this.listenersInstalled = true;
    document.addEventListener("mousemove", this.onMouse);
    document.addEventListener("pointerlockchange", this.onLockChange);
  }

  setLook(yaw: number, pitch: number): void {
    this.yaw = yaw; this.pitch = pitch;
    this.applyLook();
  }

  // Apply an external look delta (used by touch dragging since pointer lock
  // is unavailable on mobile). Same sensitivity as mouse for consistency.
  applyLookDelta(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const sens = 0.0024;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const lim = Math.PI / 2 - 0.02;
    if (this.pitch > lim) this.pitch = lim;
    if (this.pitch < -lim) this.pitch = -lim;
    this.applyLook();
  }

  private applyLook(): void {
    const dir = new Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.camera.setTarget(this.camera.position.add(dir));
  }

  update(dt: number): void {
    if (!this.enabled) return;

    // Horizontal movement direction in world space from yaw + input.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let fx = 0, fz = 0;
    if (this.input.forward) { fx += sin; fz += cos; }
    if (this.input.back)    { fx -= sin; fz -= cos; }
    if (this.input.right)   { fx += cos; fz -= sin; }
    if (this.input.left)    { fx -= cos; fz += sin; }
    const len = Math.hypot(fx, fz);
    if (len > 0) { fx /= len; fz /= len; }

    const sprint = (window as any).__aetherSprint ? SPRINT_MULT : 1;
    this.vel.x = fx * WALK_SPEED * sprint;
    this.vel.z = fz * WALK_SPEED * sprint;

    // Jump.
    if (this.input.jump && this.onGround) { this.vel.y = JUMP_V; this.onGround = false; }

    // Gravity.
    this.vel.y += GRAVITY * dt;
    if (this.vel.y < -60) this.vel.y = -60;

    // Integrate position with per-axis AABB collision against solid voxels.
    const p = this.camera.position;
    this.moveAxis(p, this.vel.x * dt, 0, 0);
    const groundedBefore = this.onGround;
    this.moveAxis(p, 0, this.vel.y * dt, 0);
    if (!groundedBefore && this.onGround) {
      // landed this frame
    }
    this.moveAxis(p, 0, 0, this.vel.z * dt);

    // Eye height = player center + eye offset.
    // Camera.position already represents the eye; we store player center implicitly at eye - EYE.
    // (Collision treats the AABB from eye - EYE .. eye + (HEIGHT-EYE).)
    this.applyLook();
  }

  private moveAxis(p: Vector3, dx: number, dy: number, dz: number): void {
    p.x += dx; p.y += dy; p.z += dz;
    if (this.collides(p)) {
      p.x -= dx; p.y -= dy; p.z -= dz;
      if (dy < 0) this.onGround = true;
      if (dy !== 0) this.vel.y = 0;
      if (dx !== 0) this.vel.x = 0;
      if (dz !== 0) this.vel.z = 0;
    } else if (dy < 0) {
      const probe = p.clone(); probe.y -= 0.05;
      if (this.collides(probe)) { this.onGround = true; }
      else this.onGround = false;
    } else if (dy > 0) {
      this.onGround = false;
    }
  }

  // AABB collision: returns true if any solid voxel intersects the player's box.
  private collides(eye: Vector3): boolean {
    const cx = eye.x, cy = eye.y - EYE, cz = eye.z;
    const minx = Math.floor(cx - HALF_W), maxx = Math.floor(cx + HALF_W);
    const miny = Math.floor(cy),        maxy = Math.floor(cy + HEIGHT);
    const minz = Math.floor(cz - HALF_W), maxz = Math.floor(cz + HALF_W);
    for (let y = miny; y <= maxy; y++)
      for (let z = minz; z <= maxz; z++)
        for (let x = minx; x <= maxx; x++) {
          if (y < 0) return true; // under-world = solid wall, stops falling forever
          const id = this.world.getBlock(x, y, z);
          if (id === BlockId.Air) continue;
          if (!blockProperties(id).solid) continue;
          return true;
        }
    return false;
  }

  private onMouse = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvasEl) return;
    const sens = 0.0024;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;
    const lim = Math.PI / 2 - 0.02;
    if (this.pitch > lim) this.pitch = lim;
    if (this.pitch < -lim) this.pitch = -lim;
    this.applyLook();
  };

  private onLockChange = () => {};
}

const canvasEl = (typeof document !== "undefined")
  ? (document.getElementById("renderCanvas") as HTMLCanvasElement | null)
  : null;

let hookInstalled = false;
function canvasPointerLockHook(): void {
  if (hookInstalled || !canvasEl) return;
  hookInstalled = true;
  canvasEl.addEventListener("click", () => canvasEl.requestPointerLock?.());
}
