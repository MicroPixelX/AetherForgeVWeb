// Procedural worldgen: terrain heightmap, simple biomes, tree scatter.
import { BlockId } from "./blocks";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { World } from "./world";
import { FastNoiseLite } from "../noise/fastNoiseLite";

export type FillChunkFn = (cx: number, cy: number, cz: number) => void;

let heightNoise: FastNoiseLite;
let biomeNoise: FastNoiseLite;
let treeNoise: FastNoiseLite;
export let isInit = false;

export enum Biome { Plains = 0, Desert = 1, Hills = 2 }

export function initWorldgen(seed: number): void {
  heightNoise = new FastNoiseLite(seed + 1); heightNoise.setFrequency(0.012);
  biomeNoise = new FastNoiseLite(seed + 2);  biomeNoise.setFrequency(0.004);
  treeNoise  = new FastNoiseLite(seed + 3);  treeNoise.setFrequency(0.04);
  isInit = true;
}

function biomeAt(wx: number, wz: number): Biome {
  const m = biomeNoise.noise2D(wx, wz);
  if (m > 0.35) return Biome.Hills;
  if (m < -0.35) return Biome.Desert;
  return Biome.Plains;
}

// Height in world voxels (>=1). Amplitude scales with biome ("hills" taller).
export function heightAt(wx: number, wz: number): number {
  const b = biomeAt(wx, wz);
  const amp = b === Biome.Hills ? 14 : b === Biome.Desert ? 6 : 9;
  return Math.max(1, Math.round(amp * (0.5 + 0.5 * heightNoise.fractal2D(wx, wz, 4))));
}

function surfaceBlock(b: Biome): BlockId {
  if (b === Biome.Desert) return BlockId.Sand;
  return BlockId.Grass;
}

function subsurfaceBlock(b: Biome): BlockId {
  if (b === Biome.Desert) return BlockId.Sand;
  return BlockId.Dirt;
}

// Fills one chunk in the world; assumes isInit is true and `initWorldgen` ran.
export function fillChunk(cx: number, cy: number, cz: number, world: World): void {
  if (!isInit) throw new Error("call initWorldgen(seed) before fillChunk");
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const b = biomeAt(wx, wz);
      const h = heightAt(wx, wz);
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = cy * CHUNK_SIZE + ly;
        let id = BlockId.Air;
        if (wy === 0) id = BlockId.Bedrock;
        else if (wy < h - 3) id = BlockId.Stone;
        else if (wy < h) id = subsurfaceBlock(b);
        else if (wy === h && wy > 0) id = surfaceBlock(b);
        if (id !== BlockId.Air) world.setBlock(wx, wy, wz, id);
      }
      // Tree scatter on grassy plains above ground.
      if (b === Biome.Plains && h > 1 && treeNoise.noise2D(wx, wz) > 0.92 && cy >= Math.floor(h / CHUNK_SIZE)) {
        maybePlantTree(world, wx, h + 1, wz, cy);
      }
    }
  }
}

function maybePlantTree(world: World, wx: number, wyRoot: number, wz: number, cy: number): void {
  const trunk = 4 + (Math.abs(treeNoise.noise2D(wx * 1.7, wz * 1.7)) > 0.4 ? 1 : 0);
  for (let i = 0; i < trunk; i++) world.setBlock(wx, wyRoot + i, wz, BlockId.Wood);
  const topY = wyRoot + trunk;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = -1; dy <= 1; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
        if (dx === 0 && dz === 0 && dy < 1) continue;
        world.setBlock(wx + dx, topY + dy, wz + dz, BlockId.Leaves);
      }
}
