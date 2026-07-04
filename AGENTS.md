# AGENTS.md — AetherForgeV (web)

Babylon.js + TypeScript voxel sandbox. Bundled with Vite. Mobile-friendly Web deploy via GitHub Pages CI (no secrets).

## Commands

```sh
npm install
npm run dev        # vite dev server
npm test           # vitest, Node env — covers the SIM layer
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit + vite build -> dist/
```

## Conventions

- TypeScript strict, 2-space indent, `camelCase` for files, `PascalCase` for classes.
- `src/sim/` is engine-agnostic and must NOT import `@babylonjs/*`. Game logic that could run on a future server lives here.
- `src/render/` is the Babylon glue; only here may touch engine types.
- The meshing output is a `ChunkMesh` of typed arrays (`Float32Array` verts/normals/uvs, `Uint16Array` blocks, `Uint32Array` indices) — Babylon consumes it via the builder, but it's also reusable server-side.
- No comments unless requested. No emojis in code.
- Don't ship `node_modules/` or `bun.lock` — the CI installs via `npm install` from `package.json` (no lockfile cached yet).

## Where things go

- New game logic (block types, crafting recipes, save format, netcode message shapes) → `src/sim/<module>.ts`.
- New engine glue (camera modes, render passes, materials, input) → `src/render/<module>.ts` (only here import Babylon).
- New tests → `tests/<thing>.test.ts` (vitest, runs in Node).
- Deploy target changes → `vercel.json` and `.github/workflows/deploy-pages.yml` (both kept in sync).
