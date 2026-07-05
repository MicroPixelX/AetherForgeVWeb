// Procedural 16x16-block texture atlas drawn at runtime so we ship no images.
// One canvas, an horizontal strip of N textures, nearest-neighbour sampling.
// Each block has up to 3 faces: top, side, bottom (sides halved).

import { BlockId } from "../sim/blocks";

export interface BlockFaceTex {
  top: number;
  side: number;
  bottom: number;
}

type Pixel = string;

type Tex16 = Pixel[][];

function makeBlank16(): Tex16 {
  const grid: Tex16 = [];
  for (let y = 0; y < 16; y++) {
    const row: Pixel[] = [];
    for (let x = 0; x < 16; x++) row.push("transparent");
    grid.push(row);
  }
  return grid;
}

// Helper to write a small symmetrical noise pattern into a base colour so
// vanilla Minecraft-style speckling appears without authoring pixels by hand.
function speckle(base: string, speck: string, density = 0.18, seed = 0): Tex16 {
  const g = makeBlank16();
  let h = seed >>> 0;
  const rng = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 0x100000000; };
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      g[y][x] = rng() < density ? speck : base;
  return g;
}

// Mix two hex colors `#rrggbb` linearly by `t`.
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const bl = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
  return "#" + r + g + bl;
}

const TEX_GRASS_TOP = speckle("#569e34", "#3f7a26", 0.22, 1);
const TEX_GRASS_SIDE = (() => {
  const g = makeBlank16();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) g[y][x] = (Math.random() < 0.25 ? "#4d8a2c" : "#5fa83a");
  for (let y = 4; y < 16; y++) for (let x = 0; x < 16; x++) g[y][x] = (Math.random() < 0.25 ? "#5a4530" : "#705539");
  return g;
})();
const TEX_DIRT = speckle("#705539", "#5a4530", 0.25, 2);
const TEX_STONE = speckle("#8a8a8e", "#6e6e72", 0.3, 3);
const TEX_SAND = speckle("#e3d795", "#c9bb6e", 0.22, 4);
const TEX_WATER = speckle("#3e78e0", "#3068cf", 0.4, 5);
const TEX_WOOD_TOP = (() => {
  const g = speckle("#7a4f2c", "#603f23", 0.5, 6);
  // Tree rings
  for (let y = 0; y < 16; y++) {
    g[y][7] = "#3c2515"; g[y][8] = "#3c2515";
    g[7][y] = "#3c2515"; g[8][y] = "#3c2515";
  }
  return g;
})();
const TEX_WOOD_SIDE = (() => {
  const g = speckle("#6a4423", "#52321a", 0.3, 7);
  // Long vertical bark streaks.
  for (let x = 0; x < 16; x++) if (x % 4 === 0)
    for (let y = 0; y < 16; y++) g[y][x] = mix(g[y][x] ?? "#6a4423", "#3c2515", 0.4);
  return g;
})();
const TEX_LEAVES = speckle("#2c7b2c", "#1f5d1f", 0.5, 8);
const TEX_BEDROCK = speckle("#3f3f44", "#1a1a1f", 0.45, 9);
const TEX_PLANKS = (() => {
  const g = speckle("#b07a3a", "#9a6830", 0.18, 10);
  for (let y = 0; y < 16; y += 4)
    for (let x = 0; x < 16; x++) g[y][x] = "#7a5326";
  return g;
})();
const TEX_COBBLE = speckle("#6a6a6e", "#4f4f54", 0.4, 11);
const TEX_GLASS = (() => {
  const g = makeBlank16();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g[y][x] = "#a8d4f0";
  for (let y = 0; y < 16; y++) { g[y][0] = "#cfeaf8"; g[y][15] = "#cfeaf8"; }
  for (let x = 0; x < 16; x++) { g[0][x] = "#cfeaf8"; g[15][x] = "#cfeaf8"; }
  g[5][5] = "#ffffff"; g[6][6] = "#ffffff"; g[7][7] = "#ffffff";
  return g;
})();

// Atlas index per face.
const ORDER: Tex16[] = [];
function store(name: string, t: Tex16): number {
  void name;
  const i = ORDER.length; ORDER.push(t); return i;
}

const I_GRASS_TOP = store("grass_top", TEX_GRASS_TOP);
const I_GRASS_SIDE = store("grass_side", TEX_GRASS_SIDE);
const I_DIRT = store("dirt", TEX_DIRT);
const I_STONE = store("stone", TEX_STONE);
const I_SAND = store("sand", TEX_SAND);
const I_WATER = store("water", TEX_WATER);
const I_WOOD_TOP = store("wood_top", TEX_WOOD_TOP);
const I_WOOD_SIDE = store("wood_side", TEX_WOOD_SIDE);
const I_LEAVES = store("leaves", TEX_LEAVES);
const I_BEDROCK = store("bedrock", TEX_BEDROCK);
const I_PLANKS = store("planks", TEX_PLANKS);
const I_COBBLE = store("cobble", TEX_COBBLE);
const I_GLASS = store("glass", TEX_GLASS);

const FACE_TEX: Record<number, BlockFaceTex> = {
  [BlockId.Grass]:       { top: I_GRASS_TOP,   side: I_GRASS_SIDE, bottom: I_DIRT },
  [BlockId.Dirt]:        { top: I_DIRT,         side: I_DIRT,       bottom: I_DIRT },
  [BlockId.Stone]:      { top: I_STONE,       side: I_STONE,      bottom: I_STONE },
  [BlockId.Sand]:       { top: I_SAND,         side: I_SAND,       bottom: I_SAND },
  [BlockId.Water]:      { top: I_WATER,       side: I_WATER,      bottom: I_WATER },
  [BlockId.Wood]:       { top: I_WOOD_TOP,    side: I_WOOD_SIDE,  bottom: I_WOOD_TOP },
  [BlockId.Leaves]:     { top: I_LEAVES,       side: I_LEAVES,     bottom: I_LEAVES },
  [BlockId.Bedrock]:    { top: I_BEDROCK,      side: I_BEDROCK,    bottom: I_BEDROCK },
  [BlockId.Planks]:     { top: I_PLANKS,       side: I_PLANKS,     bottom: I_PLANKS },
  [BlockId.Cobblestone]:{ top: I_COBBLE,       side: I_COBBLE,     bottom: I_COBBLE },
  [BlockId.Glass]:      { top: I_GLASS,        side: I_GLASS,     bottom: I_GLASS },
};

// Face order matches the mesher (FACES array: +X,-X,+Y,-Y,+Z,-Z).
// We map the neighbor offset's dy to choose top/side/bottom.
export type FaceKind = "top" | "side" | "bottom";
export function faceKindForDir(dx: number, dy: number, _dz: number): FaceKind {
  if (dy > 0) return "top";
  if (dy < 0) return "bottom";
  return "side";
}

export function atlasIndexFor(blockId: BlockId, face: FaceKind): number {
  const f = FACE_TEX[blockId];
  if (!f) return 0;
  return f[face];
}

export const ATLAS_COLS = ORDER.length;
export const ATLAS_TILE = 16;

// Render the atlas into a single horizontal canvas and return its data URL.
// Each tile is 16 px wide, no padding. The sampler in Babylon uses NearestFilter,
// so the on-screen pixels stay crisp regardless of zoom.
export function buildAtlasCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = ATLAS_COLS * ATLAS_TILE;
  c.height = ATLAS_TILE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  ORDER.forEach((t, idx) => {
    for (let y = 0; y < ATLAS_TILE; y++)
      for (let x = 0; x < ATLAS_TILE; x++) {
        const px = t[y][x];
        if (px && px !== "transparent") {
          ctx.fillStyle = px;
          ctx.fillRect(idx * ATLAS_TILE + x, y, 1, 1);
        }
      }
  });
  return c;
}

// Convert a per-tile index into atlas UV coordinates. We inset by a small
// pad so bleeding between adjacent tiles doesn't smear when filtered.
export function tileUV(index: number): { u0: number; v0: number; u1: number; v1: number } {
  const pad = 0.5 / (ATLAS_COLS * ATLAS_TILE);
  const step = 1 / ATLAS_COLS;
  const u0 = index * step + pad;
  const u1 = (index + 1) * step - pad;
  return { u0, v0: pad, u1, v1: 1 - pad };
}
