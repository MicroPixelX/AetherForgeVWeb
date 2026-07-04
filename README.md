# AetherForgeV (web)

Voxel sandbox in the browser, built with **Babylon.js + TypeScript**. Bundled by Vite, deployable to GitHub Pages or Vercel from CI — no Godot, no Emscripten, no native toolchain. Built because the Godot/Emscripten pipeline was too heavy for hosting a short public URL.

The voxel game logic (the SIM layer) is a TypeScript port of the C++ design in the sister repo [`AetherForgeV`](https://github.com/MicroPixelX/AetherForgeV). Same `blocks`/`chunk`/`chunkMesher`/`world` API, same chunk size (32³), same face-culling mesher, same coordinate math.

## Layout

```
src/
  sim/              Engine-agnostic game logic (no Babylon imports)
    blocks.ts        BlockId enum + property table (solid/transparent/opaque)
    chunk.ts         32^3 voxel grid, get/set with occupied counter, index math
    chunkMesher.ts   face-culling mesher -> Float32Array verts/normals/uvs + Uint32 indices
    world.ts         <ChunkCoord, Chunk> map, world<->chunk<->local coordinate math
  render/           Babylon glue (the only files that import @babylonjs)
    chunkMeshBuilder.ts  turns a SIM ChunkMesh into a Babylon Mesh
    testWorld.ts         builds the demo chunk (sine terrain + stone tower + glass pane)
  main.ts           Engine + scene + camera + light bootstrap
tests/
  sim.test.ts       vitest harness mirroring the C++ tests (blocks/chunk/mesher/world)
index.html          canvas + HUD overlay
vite.config.ts      bundler config (base "./" so Pages under any path works)
vitest.config.ts    test runner config
vercel.json         optional Vercel deploy target
.github/workflows/deploy-pages.yml  CI: build + deploy to Pages
```

## Run locally

```sh
npm install
npm run dev       # vite dev server, default http://localhost:5173
npm run test      # vitest, runs in Node — no DOM needed
npm run build     # tsc --noEmit + vite build -> dist/
npm run preview   # serve dist/ locally
```

## Deploy (GitHub Pages — no secret, no your-machine build)

1. Open https://github.com/MicroPixelX/AetherForgeVWeb/settings/pages
2. **Source** → **GitHub Actions** (not "Deploy from a branch")
3. Save. Push to `main` triggers `deploy-pages.yml` which builds in CI and serves at:

```
https://micropixelx.github.io/AetherForgeVWeb
```

No unzip, no API key, no Emscripten. The URL works on your phone.

## Deploy (Vercel alternative)

`vercel.json` is included. Import the repo at https://vercel.com/new, framework auto-detected as Vite, deploy → `https://aetherforgev.vercel.app` (or your custom subdomain).

## Controls

| Input | Action |
|---|---|
| Click canvas | Pointer lock (grab mouse look) |
| Mouse move | Look around |
| W A S D | Move |
| Shift | Sprint |
| Space | Jump |
| LMB | Break block |
| RMB | Place selected hotbar block |
| Wheel | Rotate hotbar selection |

## Roadmap (MVP + crafting + saving, singleplayer)

1. ✅ Project scaffold + Babylon render + test chunk
2. ✅ SIM layer port (blocks/chunk/mesher/world) + vitest harness
3. ✅ Worldgen (noise terrain + biomes + trees)
4. ✅ Player controller (WASD + pointer-lock look + jump + gravity + AABB collision)
5. ✅ Place/break blocks via DDA raycast
6. ✅ Multi-chunk streaming loader around player
7. ✅ Inventory + crafting recipes + DOM hotbar UI
8. ✅ Save/load player state via IndexedDB (throttled autosave)

Netcode intentionally deferred — the SIM layer has no engine types, so it can later run server-authoritative.
