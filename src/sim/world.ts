import { BlockId } from "./blocks";
import { Chunk, ChunkCoord, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, LocalVoxel } from "./chunk";

function coordKey(c: ChunkCoord): string {
  return c.x + "," + c.y + "," + c.z;
}

export function worldToChunk(vx: number, vy: number, vz: number): ChunkCoord {
  const div = (v: number) => {
    const d = v % CHUNK_SIZE_X;
    return (v < 0 && d !== 0) ? Math.floor(v / CHUNK_SIZE_X) - 1 : Math.floor(v / CHUNK_SIZE_X);
  };
  return { x: div(vx), y: div(vy), z: div(vz) };
}

export function worldToLocal(vx: number, vy: number, vz: number): LocalVoxel {
  const mod = (v: number) => {
    const m = v % CHUNK_SIZE_X;
    return m < 0 ? m + CHUNK_SIZE_X : m;
  };
  return { x: mod(vx), y: mod(vy), z: mod(vz) };
}

export class World {
  private chunks = new Map<string, Chunk>();

  getBlock(x: number, y: number, z: number): BlockId {
    const c = this.getChunkOrNull(worldToChunk(x, y, z));
    if (!c) return BlockId.Air;
    const lv = worldToLocal(x, y, z);
    return c.get(lv.x, lv.y, lv.z);
  }

  setBlock(x: number, y: number, z: number, id: BlockId): void {
    const c = this.ensureChunk(worldToChunk(x, y, z));
    const lv = worldToLocal(x, y, z);
    c.set(lv.x, lv.y, lv.z, id);
  }

  getChunkOrNull(c: ChunkCoord): Chunk | null {
    return this.chunks.get(coordKey(c)) ?? null;
  }

  getChunk(c: ChunkCoord): Chunk | null { return this.getChunkOrNull(c); }

  ensureChunk(c: ChunkCoord): Chunk {
    const key = coordKey(c);
    let chunk = this.chunks.get(key);
    if (!chunk) { chunk = new Chunk(); this.chunks.set(key, chunk); }
    return chunk;
  }

  get chunkCount(): number { return this.chunks.size; }
}
