// Simple crafting: a 3x3 grid of Slots, recipes matched by shape, output a single item id+count.
import { BlockId } from "./blocks";
import type { Slot } from "./inventory";

export type CraftGrid = (Slot | null)[];

export interface Recipe {
  // shape keys: space = empty, otherwise the letter used in `keys`.
  shape: string[];
  keys: Record<string, BlockId>;
  output: { id: BlockId; count: number };
}

export const RECIPES: Recipe[] = [
  // Planks: 1 wood in any slot -> 4 planks. Represented as a generic "any-single-slot" rule below.
  // Stone bricks: 4 cobblestone in a 2x2 -> 1 stone (reskinned as cobblestone result for the demo).
  {
    shape: ["cc", "cc"],
    keys: { c: BlockId.Cobblestone },
    output: { id: BlockId.Stone, count: 1 },
  },
  // Dirt -> grass (vanilla-ish: not real Minecraft, just a demo recipe).
  {
    shape: ["g"],
    keys: { g: BlockId.Dirt },
    output: { id: BlockId.Grass, count: 1 },
  },
  // Glass pack from glass (no-op craft to demo multi-slot).
  {
    shape: ["gg", "gg"],
    keys: { g: BlockId.Glass },
    output: { id: BlockId.Glass, count: 4 },
  },
];

// Match the grid against recipes. Returns the matching recipe's output, or null.
export function matchCraft(grid: CraftGrid): { id: BlockId; count: number } | null {
  for (const r of RECIPES) {
    if (shapeMatches(grid, r)) return { id: r.output.id, count: r.output.count };
  }
  return null;
}

// Special recipe: any single wood in the grid -> 4 planks (shapeless-style).
export function matchShapelessWood(grid: CraftGrid): { id: BlockId; count: number } | null {
  let woodCount = 0;
  for (const s of grid) if (s && s.id === BlockId.Wood) woodCount++;
  if (woodCount === 1) return { id: BlockId.Planks, count: 4 };
  return null;
}

function shapeMatches(grid: CraftGrid, r: Recipe): boolean {
  // Grid is a flat 9-array (3x3). Trim recipe to top-left bounds.
  const shapeH = r.shape.length;
  const shapeW = r.shape[0]?.length ?? 0;
  // Find bounding box of non-null cells in the grid.
  let minR = 9, minC = 9, maxR = -1, maxC = -1;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) {
      const row = Math.floor(i / 3), col = i % 3;
      minR = Math.min(minR, row); maxR = Math.max(maxR, row);
      minC = Math.min(minC, col); maxC = Math.max(maxC, col);
    }
  }
  if (maxR === -1) return r.shape.every(line => line.trim() === "");
  const gridH = maxR - minR + 1;
  const gridW = maxC - minC + 1;
  if (gridH !== shapeH || gridW !== shapeW) return false;
  for (let y = 0; y < shapeH; y++) {
    for (let x = 0; x < shapeW; x++) {
      const slot = grid[(minR + y) * 3 + (minC + x)];
      const ch = r.shape[y][x];
      if (ch === " ") {
        if (slot) return false;
      } else {
        const want = r.keys[ch];
        if (!slot || slot.id !== want || slot.count < 1) return false;
      }
    }
  }
  return true;
}

// Consume ingredients matching `r` from the grid. Each shape cell consumes 1.
export function consumeIngredients(grid: CraftGrid, r: Recipe): void {
  for (const line of r.shape) {
    for (const ch of line) {
      if (ch === " ") continue;
      // Match by id: find first slot with that id and decrement.
      const want = r.keys[ch];
      const i = grid.findIndex(s => s && s.id === want);
      if (i < 0) continue;
      s_decr(grid, i);
    }
  }
}

function s_decr(grid: CraftGrid, i: number): void {
  const s = grid[i];
  if (!s) return;
  s.count--;
  if (s.count <= 0) grid[i] = null;
}
