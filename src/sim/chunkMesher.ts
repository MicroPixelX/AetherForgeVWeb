import { BlockId, blockProperties, isAir, isRenderable } from "./blocks";
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, inChunkBounds } from "./chunk";

export type NeighborLookup = (gx: number, gy: number, gz: number) => BlockId;

export interface ChunkMesh {
  verts: Float32Array;   // stride 3
  normals: Float32Array; // stride 3
  uvs: Float32Array;     // stride 2
  blocks: Uint16Array;   // per-vertex BlockId
  faceDirs: Int8Array;   // per-vertex face normal direction (dx,dy,dz) packed
  indices: Uint32Array;
}

interface Face { dx: number; dy: number; dz: number; n: [number, number, number]; corner: [number, number, number][]; }

const FACES: Face[] = [
  { dx:  1, dy: 0, dz: 0, n: [ 1, 0, 0], corner: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]] },
  { dx: -1, dy: 0, dz: 0, n: [-1, 0, 0], corner: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]] },
  { dx:  0, dy: 1, dz: 0, n: [ 0, 1, 0], corner: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dx:  0, dy:-1, dz: 0, n: [ 0,-1, 0], corner: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dx:  0, dy: 0, dz: 1, n: [ 0, 0, 1], corner: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { dx:  0, dy: 0, dz:-1, n: [ 0, 0,-1], corner: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
];

const FACE_UV: [number, number][][] = FACES.map(() => [[0,0],[1,0],[1,1],[0,1]]);

function shouldDrawFace(self: BlockId, neighbour: BlockId): boolean {
  if (isAir(neighbour)) return true;
  const n = blockProperties(neighbour);
  if (n.opaqueCube && neighbour !== self) return true;
  return false;
}

export function meshChunk(chunk: Chunk, neighbor: NeighborLookup | null = null): ChunkMesh {
  const verts: number[] = [];
  const norms: number[] = [];
  const uvs: number[] = [];
  const blocks: number[] = [];
  const faceDirs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y < CHUNK_SIZE_Y; y++) {
    for (let z = 0; z < CHUNK_SIZE_Z; z++) {
      for (let x = 0; x < CHUNK_SIZE_X; x++) {
        const self = chunk.get(x, y, z);
        if (!isRenderable(self)) continue;

        for (let f = 0; f < FACES.length; f++) {
          const face = FACES[f];
          const nx = x + face.dx, ny = y + face.dy, nz = z + face.dz;

          let neighbourId: BlockId;
          if (inChunkBounds(nx, ny, nz)) {
            neighbourId = chunk.get(nx, ny, nz);
          } else if (neighbor) {
            neighbourId = neighbor(nx, ny, nz);
          } else {
            neighbourId = BlockId.Air;
          }

          if (!shouldDrawFace(self, neighbourId)) continue;

          const base = verts.length / 3;
          for (let c = 0; c < 4; c++) {
            verts.push(x + face.corner[c][0], y + face.corner[c][1], z + face.corner[c][2]);
            norms.push(face.n[0], face.n[1], face.n[2]);
            uvs.push(FACE_UV[f][c][0], FACE_UV[f][c][1]);
            blocks.push(self);
            faceDirs.push(face.dx, face.dy, face.dz);
          }
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }

  return {
    verts: new Float32Array(verts),
    normals: new Float32Array(norms),
    uvs: new Float32Array(uvs),
    blocks: new Uint16Array(blocks),
    faceDirs: new Int8Array(faceDirs),
    indices: new Uint32Array(indices),
  };
}
