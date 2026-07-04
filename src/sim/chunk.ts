import { BlockId } from "./blocks";

export const CHUNK_SIZE_X = 32;
export const CHUNK_SIZE_Y = 32;
export const CHUNK_SIZE_Z = 32;
export const CHUNK_VOXEL_COUNT = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

export interface ChunkCoord { x: number; y: number; z: number; }
export interface LocalVoxel  { x: number; y: number; z: number; }

export function voxelIndex(x: number, y: number, z: number): number {
  return (y * CHUNK_SIZE_Z + z) * CHUNK_SIZE_X + x;
}

export function indexToVoxel(i: number): LocalVoxel {
  const x = i % CHUNK_SIZE_X;
  const z = Math.floor(i / CHUNK_SIZE_X) % CHUNK_SIZE_Z;
  const y = Math.floor(i / (CHUNK_SIZE_X * CHUNK_SIZE_Z));
  return { x, y, z };
}

export function inChunkBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < CHUNK_SIZE_X && y >= 0 && y < CHUNK_SIZE_Y && z >= 0 && z < CHUNK_SIZE_Z;
}

export class Chunk {
  private voxels: Uint16Array = new Uint16Array(CHUNK_VOXEL_COUNT);
  private occupied = 0;

  clear(): void {
    this.voxels.fill(0);
    this.occupied = 0;
  }

  get(x: number, y: number, z: number): BlockId {
    return this.voxels[voxelIndex(x, y, z)] as BlockId;
  }

  getSafe(x: number, y: number, z: number, fallback: BlockId = BlockId.Air): BlockId {
    if (!inChunkBounds(x, y, z)) return fallback;
    return this.get(x, y, z);
  }

  set(x: number, y: number, z: number, id: BlockId): void {
    const i = voxelIndex(x, y, z);
    const wasAir = this.voxels[i] === 0;
    const nowAir = id === BlockId.Air;
    this.voxels[i] = id;
    if (wasAir && !nowAir) this.occupied++;
    else if (!wasAir && nowAir) this.occupied--;
  }

  get isEmpty(): boolean { return this.occupied === 0; }
  get occupiedCount(): number { return this.occupied; }
}
