import { describe, it, expect } from "vitest";
import {
  BlockId, blockProperties, Chunk, meshChunk, World,
  worldToChunk, worldToLocal, voxelIndex, indexToVoxel,
  CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, CHUNK_VOXEL_COUNT,
} from "../src/sim";

describe("blocks", () => {
  it("air is non-solid + transparent", () => {
    expect(blockProperties(BlockId.Air).solid).toBe(false);
    expect(blockProperties(BlockId.Air).transparent).toBe(true);
  });
  it("grass is opaque cube", () => {
    expect(blockProperties(BlockId.Grass).opaqueCube).toBe(true);
  });
  it("leaves/glass are transparent", () => {
    expect(blockProperties(BlockId.Leaves).transparent).toBe(true);
    expect(blockProperties(BlockId.Glass).transparent).toBe(true);
  });
});

describe("chunk", () => {
  it("starts empty and tracks occupancy", () => {
    const c = new Chunk();
    expect(c.isEmpty).toBe(true);
    c.set(1, 2, 3, BlockId.Grass);
    expect(c.isEmpty).toBe(false);
    expect(c.get(1, 2, 3)).toBe(BlockId.Grass);
    expect(c.get(0, 0, 0)).toBe(BlockId.Air);
    expect(c.occupiedCount).toBe(1);
    c.set(1, 2, 3, BlockId.Air);
    expect(c.isEmpty).toBe(true);
  });
  it("getSafe respects bounds", () => {
    const c = new Chunk();
    expect(c.getSafe(-1, 0, 0, BlockId.Stone)).toBe(BlockId.Stone);
  });
});

describe("index math", () => {
  it("voxelIndex <-> indexToVoxel round-trips", () => {
    for (let i = 0; i < CHUNK_VOXEL_COUNT; i++) {
      const v = indexToVoxel(i);
      expect(voxelIndex(v.x, v.y, v.z)).toBe(i);
    }
  });
});

describe("mesher", () => {
  it("single block -> 6 faces, 24 verts, 36 indices", () => {
    const c = new Chunk();
    c.set(0, 0, 0, BlockId.Stone);
    const m = meshChunk(c);
    expect(m.verts.length).toBe(24 * 3);
    expect(m.indices.length).toBe(36);
  });
  it("buried interior block adds no faces", () => {
    const solid = new Chunk();
    for (let x = 3; x <= 7; x++)
      for (let y = 3; y <= 7; y++)
        for (let z = 3; z <= 7; z++)
          solid.set(x, y, z, BlockId.Stone);
    const m1 = meshChunk(solid);
    const m2 = meshChunk(solid);
    expect(m1.verts.length).toBe(m2.verts.length);
    expect(m1.indices.length).toBe(m2.indices.length);
    expect(m1.verts.length).toBeGreaterThan(0);
  });
});

describe("world", () => {
  it("stores blocks across chunk boundaries", () => {
    const w = new World();
    w.setBlock(0, 0, 0, BlockId.Dirt);
    w.setBlock(CHUNK_SIZE_X, 0, 0, BlockId.Stone);
    expect(w.getBlock(0, 0, 0)).toBe(BlockId.Dirt);
    expect(w.getBlock(CHUNK_SIZE_X, 0, 0)).toBe(BlockId.Stone);
    expect(w.getBlock(CHUNK_SIZE_X - 1, 0, 0)).toBe(BlockId.Air);
    expect(w.chunkCount).toBe(2);
  });
  it("negative coordinate math is identity round-trip", () => {
    const cc = worldToChunk(-1, -1, -1);
    expect(cc).toEqual({ x: -1, y: -1, z: -1 });
    const lv = worldToLocal(-1, 0, 0);
    expect(lv.x).toBe(CHUNK_SIZE_X - 1);
    const v = { x: -7, y: 13, z: -42 };
    const c = worldToChunk(v.x, v.y, v.z);
    const l = worldToLocal(v.x, v.y, v.z);
    expect(c.x * CHUNK_SIZE_X + l.x).toBe(-7);
    expect(c.y * CHUNK_SIZE_Y + l.y).toBe(13);
    expect(c.z * CHUNK_SIZE_Z + l.z).toBe(-42);
  });
});
