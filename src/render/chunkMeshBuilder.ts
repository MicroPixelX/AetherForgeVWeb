import { Mesh, VertexBuffer, Scene, StandardMaterial, Color3 } from "@babylonjs/core";
import type { ChunkMesh as SimMesh } from "../sim/chunkMesher";
import { BlockId } from "../sim/blocks";

let sharedMat: StandardMaterial | null = null;
function getMat(scene: Scene): StandardMaterial {
  if (sharedMat && sharedMat.getScene() === scene) return sharedMat;
  const m = new StandardMaterial("aether_chunk_mat", scene);
  m.diffuseColor = new Color3(1, 1, 1);
  m.ambientColor = new Color3(1, 1, 1);
  m.emissiveColor = new Color3(1, 1, 1);
  m.specularColor = new Color3(0, 0, 0);
  m.backFaceCulling = true;
  m.disableLighting = true;
  sharedMat = m;
  return m;
}

const BLOCK_COLORS: Record<number, [number, number, number]> = {
  [BlockId.Grass]: [0.45, 0.78, 0.36],
  [BlockId.Dirt]:  [0.55, 0.39, 0.24],
  [BlockId.Stone]: [0.50, 0.50, 0.52],
  [BlockId.Sand]:  [0.88, 0.82, 0.55],
  [BlockId.Water]: [0.20, 0.40, 0.85],
  [BlockId.Wood]:  [0.45, 0.32, 0.18],
  [BlockId.Leaves]: [0.20, 0.55, 0.20],
  [BlockId.Bedrock]: [0.18, 0.18, 0.20],
  [BlockId.Planks]: [0.65, 0.50, 0.30],
  [BlockId.Cobblestone]: [0.42, 0.42, 0.44],
  [BlockId.Glass]: [0.70, 0.85, 0.95],
};

export function buildChunkBabylonMesh(
  scene: Scene,
  name: string,
  sim: SimMesh,
  originX: number,
  originY: number,
  originZ: number,
): Mesh | null {
  if (sim.indices.length === 0) return null;

  const mesh = new Mesh(name, scene);
  mesh.useVertexColors = true;

  const vCount = sim.verts.length / 3;
  const positions = new Float32Array(sim.verts.length);
  for (let i = 0; i < vCount; i++) {
    positions[i * 3 + 0] = sim.verts[i * 3 + 0] + originX;
    positions[i * 3 + 1] = sim.verts[i * 3 + 1] + originY;
    positions[i * 3 + 2] = sim.verts[i * 3 + 2] + originZ;
  }

  const colors = new Float32Array(vCount * 4);
  for (let i = 0; i < vCount; i++) {
    const id = sim.blocks[i];
    const col = BLOCK_COLORS[id] ?? [0.7, 0.7, 0.7];
    const ny = sim.normals[i * 3 + 1];
    let shade = 0.8;
    if (ny > 0.5) shade = 1.0;
    else if (ny < -0.5) shade = 0.6;
    colors[i * 4 + 0] = col[0] * shade;
    colors[i * 4 + 1] = col[1] * shade;
    colors[i * 4 + 2] = col[2] * shade;
    colors[i * 4 + 3] = 1.0;
  }

  mesh.setVerticesData(VertexBuffer.PositionKind, positions, false);
  mesh.setVerticesData(VertexBuffer.NormalKind, sim.normals, false);
  mesh.setVerticesData(VertexBuffer.UVKind, sim.uvs, false);
  mesh.setVerticesData(VertexBuffer.ColorKind, colors, false);
  mesh.setIndices(sim.indices);

  mesh.material = getMat(scene);
  mesh.freezeWorldMatrix();
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}
