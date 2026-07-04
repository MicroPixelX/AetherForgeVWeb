import { Chunk } from "../sim/chunk";
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "../sim/chunk";
import { BlockId } from "../sim/blocks";
import { meshChunk, type NeighborLookup } from "../sim/chunkMesher";
import type { ChunkMesh as SimMesh } from "../sim/chunkMesher";

// Build a single demo chunk: rolling grassy terrain + a stone landmark pillar.
export function buildTestChunk(): Chunk {
  const c = new Chunk();
  for (let z = 0; z < CHUNK_SIZE_Z; z++) {
    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      const h = Math.max(1, Math.min(CHUNK_SIZE_Y - 4,
        4 + Math.round(Math.sin(x * 0.3) * 2 + Math.cos(z * 0.3) * 2)));
      for (let y = 0; y <= h; y++) {
        let id = BlockId.Grass;
        if (y === 0) id = BlockId.Bedrock;
        else if (y < h) id = BlockId.Dirt;
        c.set(x, y, z, id);
      }
    }
  }
  // Landmark tower so the camera has something to orient on.
  for (let y = 6; y < 12; y++)
    for (let x = 15; x < 17; x++)
      for (let z = 15; z < 17; z++)
        c.set(x, y, z, BlockId.Stone);
  // A pane of glass next to the tower, to demo transparent block faces.
  for (let y = 6; y < 12; y++) c.set(14, y, 16, BlockId.Glass);
  return c;
}

export function meshTestChunk(chunk: Chunk, neighbor: NeighborLookup | null = null): SimMesh {
  return meshChunk(chunk, neighbor);
}
