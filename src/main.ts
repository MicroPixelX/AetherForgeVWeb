import {
  Engine, Scene, FreeCamera, Vector3, Color3, Color4,
  DirectionalLight, HemisphericLight, Mesh,
} from "@babylonjs/core";

import { World } from "./sim/world";
import { CHUNK_SIZE } from "./sim/chunk";
import { worldToChunk } from "./sim/world";
import { WorldStreamer } from "./sim/worldStreamer";
import { initWorldgen } from "./sim/worldgen";
import { Inventory } from "./sim/inventory";
import { BlockId } from "./sim/blocks";
import { drawInventoryToDom } from "./render/inventoryUi";
import { PlayerController } from "./render/playerController";
import { BlockPicker } from "./render/blockPicker";
import { buildChunkBabylonMesh } from "./render/chunkMeshBuilder";
import { loadSave, savePlayer, getPlayerSave } from "./sim/save";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
// adaptToDeviceRatio keeps the framebuffer at devicePixelRatio so mobile screens
// aren't pixelated. antialias smooths chunk edges a touch.
const engine = new Engine(canvas, true, {
  stencil: true,
  adaptToDeviceRatio: true,
  antialias: true,
  powerPreference: "high-performance",
});
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
const scene = new Scene(engine);
scene.clearColor = new Color4(0.45, 0.62, 0.85, 1);

// Player walk camera + controller.
const camera = new FreeCamera("player", new Vector3(8, 40, 8), scene);
camera.minZ = 0.05;
camera.fov = 1.05;
const keys = { forward: false, back: false, left: false, right: false, jump: false };

const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.35), scene); sun.intensity = 1.4;
const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.4), scene);
hemi.intensity = 0.9;
hemi.diffuse = new Color3(1, 1, 1);
hemi.groundColor = new Color3(0.45, 0.42, 0.4);

// World + seed + streamer around spawn. (Save state restored async below.)
const world = new World();
const seed = Math.floor(Math.random() * 1e9);
initWorldgen(seed);
const streamer = new WorldStreamer(world);

// Inventory + starter pack.
const inventory = new Inventory(9, 27);
inventory.add(BlockId.Grass, 64);
inventory.add(BlockId.Dirt, 64);
inventory.add(BlockId.Stone, 64);
inventory.add(BlockId.Wood, 32);
inventory.add(BlockId.Planks, 32);
inventory.add(BlockId.Glass, 32);
drawInventoryToDom(inventory);

// Player controller (pointer-lock look handled inside it).
const player = new PlayerController(camera, world, keys);
player.enabled = true;

const picker = new BlockPicker(camera, world, inventory);

// Restore saved player position.
(async () => {
  const s = await loadSave();
  if (s?.player?.pos) camera.position.set(s.player.pos.x, s.player.pos.y, s.player.pos.z);
})();

// Chunk meshes: keyed by "cx,cy,cz"; refreshed after edits / on stream updates.
const meshes = new Map<string, Mesh | null>();
const RADIUS = 3;

function chunkKey(cx: number, cy: number, cz: number) { return cx + "," + cy + "," + cz; }

function rebuildChunk(cx: number, cy: number, cz: number): void {
  const key = chunkKey(cx, cy, cz);
  const old = meshes.get(key);
  if (old) { old.dispose(); meshes.delete(key); }
  const chunk = world.getChunkOrNull({ x: cx, y: cy, z: cz });
  if (!chunk || chunk.isEmpty) return;
  const sim = streamer.meshChunkWithNeighbors(cx, cy, cz);
  if (!sim || sim.indices.length === 0) return;
  meshes.set(key, buildChunkBabylonMesh(scene, "chunk_" + key, sim,
    cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE));
}

// Refresh a chunk's mesh AND any chunk that shares an edited voxel on its border.
function refreshAfterEdit(vx: number, vy: number, vz: number): void {
  // The chunk containing the voxel.
  const c = worldToChunk(vx, vy, vz);
  // Also re-mesh neighbours if the voxel sits on a chunk boundary.
  const locals = (() => {
    const mod = (v: number) => {
      const m = v % CHUNK_SIZE;
      return m < 0 ? m + CHUNK_SIZE : m;
    };
    return { x: mod(vx), y: mod(vy), z: mod(vz) };
  })();
  const rebuilds: [number, number, number][] = [[c.x, c.y, c.z]];
  if (locals.x === 0)            rebuilds.push([c.x - 1, c.y, c.z]);
  if (locals.x === CHUNK_SIZE-1) rebuilds.push([c.x + 1, c.y, c.z]);
  if (locals.y === 0)            rebuilds.push([c.x, c.y - 1, c.z]);
  if (locals.y === CHUNK_SIZE-1) rebuilds.push([c.x, c.y + 1, c.z]);
  if (locals.z === 0)            rebuilds.push([c.x, c.y, c.z - 1]);
  if (locals.z === CHUNK_SIZE-1) rebuilds.push([c.x, c.y, c.z + 1]);
  for (const [cx, cy, cz] of rebuilds) rebuildChunk(cx, cy, cz);
}

// Generate + mesh an initial spawn ring so the player starts on solid ground.
for (let dz = -RADIUS; dz <= RADIUS; dz++)
  for (let dx = -RADIUS; dx <= RADIUS; dx++)
    for (let dy = 0; dy <= 0; dy++) {
      streamer.ensureChunkGenerated(dx, dy, dz);
      rebuildChunk(dx, dy, dz);
    }

// Input — keyboard + mouse + pointer lock + scroll hotbar.
window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW": case "ArrowUp":    keys.forward = true; break;
    case "KeyS": case "ArrowDown":  keys.back = true;    break;
    case "KeyA": case "ArrowLeft":  keys.left = true;     break;
    case "KeyD": case "ArrowRight": keys.right = true;    break;
    case "Space": keys.jump = true; break;
    case "ShiftLeft": case "ShiftRight": (window as any).__aetherSprint = true; break;
  }
});
window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW": case "ArrowUp":    keys.forward = false; break;
    case "KeyS": case "ArrowDown":  keys.back = false;    break;
    case "KeyA": case "ArrowLeft":  keys.left = false;    break;
    case "KeyD": case "ArrowRight": keys.right = false;   break;
    case "Space": keys.jump = false; break;
    case "ShiftLeft": case "ShiftRight": (window as any).__aetherSprint = false; break;
  }
});
canvas.addEventListener("click", () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); });
document.addEventListener("mousedown", (e) => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) {
    const hit = picker.tryBreak();
    if (hit) refreshAfterEdit(hit.x, hit.y, hit.z);
  } else if (e.button === 2) {
    const placed = picker.tryPlace();
    if (placed) refreshAfterEdit(placed.x, placed.y, placed.z);
  }
});
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("wheel", (e) => inventory.scrollHotbar(e.deltaY > 0 ? 1 : -1), { passive: true });

let hud = document.getElementById("hud")!;
let frames = 0, lastStreamAt = performance.now();
engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  player.update(dt);

  // Stream chunks following the player ~4 times per second.
  const now = performance.now();
  if (now - lastStreamAt > 250) {
    lastStreamAt = now;
    const cc = worldToChunk(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
    const dirty = streamer.update(cc.x, 0, cc.z, RADIUS);
    for (const k of dirty) {
      const [cx, cy, cz] = k.split(",").map(Number);
      rebuildChunk(cx, cy, cz);
      // Naively re-mesh neighbours touching the new chunk so seams update.
      rebuildChunk(cx - 1, cy, cz); rebuildChunk(cx + 1, cy, cz);
      rebuildChunk(cx, cy, cz - 1); rebuildChunk(cx, cy, cz + 1);
    }
  }
  scene.render();
  frames++;
  if (hud && frames % 10 === 0) {
    const p = camera.position;
    hud.textContent = `AetherForgeV alpha · WASD move · Space jump · Shift run · LMB break · RMB place · wheel hotbar · pos ${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)}`;
  }
});
window.addEventListener("unload", () => { savePlayer(getPlayerSave().pos); });
const resizeWithDelay = () => { engine.resize(); setTimeout(() => engine.resize(), 100); };
window.addEventListener("resize", resizeWithDelay);
window.addEventListener("orientationchange", resizeWithDelay);
document.addEventListener("visibilitychange", () => { if (!document.hidden) engine.resize(); });
// Force an initial resize on the next frame so the canvas matches real CSS size
// even on the very first paint (mobile browsers sometimes boot wrong).
requestAnimationFrame(() => engine.resize());
