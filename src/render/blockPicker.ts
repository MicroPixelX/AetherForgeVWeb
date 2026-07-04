import { FreeCamera, Vector3 } from "@babylonjs/core";
import type { World } from "../sim/world";
import { BlockId, blockProperties, isAir } from "../sim/blocks";
import type { Inventory } from "../sim/inventory";

// Voxel raycast via DDA (Amanatides & Woo). Returns the hit voxel + the face's
// adjacent voxel (for placement). Range ~6 blocks.

export interface RayHit { x: number; y: number; z: number; nx: number; ny: number; nz: number; }

export class BlockPicker {
  constructor(private camera: FreeCamera, private world: World, private inventory: Inventory) {}

  private castRay(maxDist = 6): RayHit | null {
    const origin = this.camera.position.clone();
    const dir = this.camera.getDirection(Vector3.Forward());
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
    const invX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const invY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const invZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;
    let tMaxX = stepX > 0 ? (x + 1 - origin.x) * invX : (origin.x - x) * invX;
    let tMaxY = stepY > 0 ? (y + 1 - origin.y) * invY : (origin.y - y) * invY;
    let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * invZ : (origin.z - z) * invZ;
    const tDeltaX = invX, tDeltaY = invY, tDeltaZ = invZ;
    let nx = 0, ny = 0, nz = 0;
    let dist = 0;
    while (dist <= maxDist) {
      const id = this.world.getBlock(x, y, z);
      if (id !== BlockId.Air && blockProperties(id).solid) {
        return { x, y, z, nx, ny, nz };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; dist = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY < tMaxZ) {
        y += stepY; dist = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    }
    return null;
  }

  tryBreak(): { x: number; y: number; z: number } | null {
    const hit = this.castRay();
    if (!hit) return null;
    const id = this.world.getBlock(hit.x, hit.y, hit.z);
    if (id === BlockId.Bedrock) return null; // unbreakable
    this.world.setBlock(hit.x, hit.y, hit.z, BlockId.Air);
    if (id !== BlockId.Air) this.inventory.add(id, 1);
    return { x: hit.x, y: hit.y, z: hit.z };
  }

  tryPlace(): { x: number; y: number; z: number } | null {
    const hit = this.castRay();
    if (!hit) return null;
    const slot = this.inventory.selectedSlot();
    if (!slot || slot.count <= 0) return null;
    const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (isAir(this.world.getBlock(px, py, pz))) {
      this.world.setBlock(px, py, pz, slot.id);
      this.inventory.consumeSelected();
      return { x: px, y: py, z: pz };
    }
    return null;
  }

  // Placeholder for future highlight highlight mesh.
  update(): void {}
}
