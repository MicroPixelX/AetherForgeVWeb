import { World } from "./world";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { meshChunk, type ChunkMesh, type NeighborLookup } from "./chunkMesher";
import { BlockId } from "./blocks";
import { fillChunk, isInit } from "./worldgen";

export class WorldStreamer {
  private generated = new Set<string>();
  private fillFn: (cx: number, cy: number, cz: number, world: World) => void;

  constructor(private world: World, fill?: (cx: number, cy: number, cz: number, world: World) => void) {
    this.fillFn = fill ?? fillChunk;
  }

  private key(cx: number, cy: number, cz: number): string { return cx + "," + cy + "," + cz; }

  // Idempotent: generate a chunk if its bedrock row is missing (signals ungen).
  ensureChunkGenerated(cx: number, cy: number, cz: number): void {
    if (!isInit) throw new Error("worldgen must be initialised before streaming");
    const k = this.key(cx, cy, cz);
    if (this.generated.has(k)) return;
    this.generated.add(k);
    this.fillFn(cx, cy, cz, this.world);
  }

  // Builds a NeighborLookup that uses the World (and ensures neighbour chunks exist).
  private neighborProvider(cx: number, cy: number, cz: number): NeighborLookup {
    return (lx, ly, lz) => {
      // lx/ly/lz are chunk-local but may be out-of-range; convert to world coords.
      const wx = cx * CHUNK_SIZE + lx;
      const wy = cy * CHUNK_SIZE + ly;
      const wz = cz * CHUNK_SIZE + lz;
      // Ensure neighbour chunk chunk lives (cheap Set check on missing path).
      const ncx = Math.floor(wx / CHUNK_SIZE);
      const ncy = Math.floor(wy / CHUNK_SIZE);
      const ncz = Math.floor(wz / CHUNK_SIZE);
      if (wx < 0 || wy < 0 || wz < 0) return BlockId.Air;
      this.ensureChunkGenerated(ncx, ncy, ncz);
      return this.world.getBlock(wx, wy, wz);
    };
  }

  meshChunkWithNeighbors(cx: number, cy: number, cz: number): ChunkMesh | null {
    const chunk = this.world.getChunkOrNull({ x: cx, y: cy, z: cz });
    if (!chunk || chunk.isEmpty) return null;
    const neighbor = this.neighborProvider(cx, cy, cz);
    return meshChunk(chunk, neighbor);
  }

  // Stream a cubic ring of chunks; returns the set of chunk coords modified or generated
  // since the last call so the caller can refresh their meshes.
  update(centerCx: number, centerCy: number, centerCz: number, radius: number): Set<string> {
    const dirty = new Set<string>();
    for (let dz = -radius; dz <= radius; dz++)
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = centerCx + dx, cy = centerCy + dy, cz = centerCz + dz;
          if (dy < -1) continue; // skip deep under for memory footprint
          const k = this.key(cx, cy, cz);
          if (!this.generated.has(k)) {
            this.ensureChunkGenerated(cx, cy, cz);
            dirty.add(k);
          }
        }
    return dirty;
  }

  unloadFar(centerCx: number, centerCy: number, centerCz: number, radius: number): void {
    void centerCx; void centerCy; void centerCz; void radius;
    // Placeholder: chunk eviction added later; first playable keeps it simple.
  }
}
