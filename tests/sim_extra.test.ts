import { describe, it, expect } from "vitest";
import { initWorldgen, fillChunk, heightAt } from "../src/sim/worldgen";
import { World } from "../src/sim/world";
import { BlockId } from "../src/sim/blocks";
import { WorldStreamer } from "../src/sim/worldStreamer";
import { Inventory } from "../src/sim/inventory";
import { matchCraft, matchShapelessWood, RECIPES } from "../src/sim/crafting";
import type { Slot } from "../src/sim/inventory";

function emptyGrid(): (Slot | null)[] {
  return [null, null, null, null, null, null, null, null, null];
}

describe("worldgen", () => {
  it("heightAt is positive within reasonable bounds", () => {
    initWorldgen(1234);
    for (let i = 0; i < 50; i++) {
      const h = heightAt(i * 7, i * 11);
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(40);
    }
  });
  it("fillChunk populates a chunk with non-air voxels", () => {
    initWorldgen(42);
    const w = new World();
    fillChunk(0, 0, 0, w);
    let nonAir = 0;
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 4; z++)
        for (let x = 0; x < 4; x++)
          if (w.getBlock(x, y, z) !== BlockId.Air) nonAir++;
    expect(nonAir).toBeGreaterThan(0);
    // Bedrock floor at world y=0.
    for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++)
      expect(w.getBlock(x, 0, z)).toBe(BlockId.Bedrock);
  });
  it("is deterministic for the same seed", () => {
    initWorldgen(7);
    const a = new World(); fillChunk(1, 0, 0, a);
    initWorldgen(7);
    const b = new World(); fillChunk(1, 0, 0, b);
    let diff = 0;
    for (let i = 0; i < 200; i++)
      if (a.getBlock(i % 5, (i/5|0) % 5, 0) !== b.getBlock(i % 5, (i/5|0) % 5, 0)) diff++;
    expect(diff).toBe(0);
  });
});

describe("worldStreamer", () => {
  it("ensureChunkGenerated is idempotent and meshes use neighbours", () => {
    initWorldgen(99);
    const w = new World();
    const s = new WorldStreamer(w);
    s.ensureChunkGenerated(0, 0, 0);
    s.ensureChunkGenerated(0, 0, 0);
    const m = s.meshChunkWithNeighbors(0, 0, 0);
    expect(m).not.toBeNull();
  });
});

describe("inventory", () => {
  it("add fills existing stacks first, then empty slots", () => {
    const inv = new Inventory(9, 27);
    const left = inv.add(BlockId.Dirt, 100);
    expect(left).toBe(100 - 64 - 27 - 9);  // 64 in first stack, then 27+9
    expect(inv.hotbar[0]?.count).toBeGreaterThanOrEqual(27);
  });
  it("consumeSelected and scroll mutate hotbar", () => {
    const inv = new Inventory(9, 27);
    inv.add(BlockId.Stone, 3);
    expect(inv.consumeSelected()).toBe(true);
    expect(inv.selectedSlot()?.count).toBe(2);
    inv.scrollHotbar(1);
    expect(inv.selected).toBe(1);
  });
});

describe("crafting", () => {
  it("shapeless wood -> 4 planks", () => {
    const grid = emptyGrid();
    grid[0] = { id: BlockId.Wood, count: 1 };
    expect(matchShapelessWood(grid)).toEqual({ id: BlockId.Planks, count: 4 });
  });
  it("2x2 cobblestone -> stone", () => {
    const grid = emptyGrid();
    grid[0] = { id: BlockId.Cobblestone, count: 1 };
    grid[1] = { id: BlockId.Cobblestone, count: 1 };
    grid[3] = { id: BlockId.Cobblestone, count: 1 };
    grid[4] = { id: BlockId.Cobblestone, count: 1 };
    const out = matchCraft(grid);
    expect(out).toEqual({ id: BlockId.Stone, count: 1 });
  });
  it("no match when wrong shape", () => {
    const grid = emptyGrid();
    grid[0] = { id: BlockId.Dirt, count: 1 };
    expect(matchCraft(grid)).toBeNull();
  });
  it("recipes list non-empty", () => {
    expect(RECIPES.length).toBeGreaterThan(0);
  });
});
