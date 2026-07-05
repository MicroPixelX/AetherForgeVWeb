import { Mesh, VertexBuffer, Scene, StandardMaterial, Texture, Color3 } from "@babylonjs/core";
import type { ChunkMesh as SimMesh } from "../sim/chunkMesher";
import { BlockId } from "../sim/blocks";
import {
  buildAtlasCanvas, atlasIndexFor, faceKindForDir, tileUV,
} from "./blockTextures";

let sharedMat: StandardMaterial | null = null;

function getMat(scene: Scene): StandardMaterial {
  if (sharedMat && sharedMat.getScene() === scene) return sharedMat;
  const m = new StandardMaterial("aether_chunk_mat", scene);
  const canvas = buildAtlasCanvas();
  const tex = new Texture(canvas.toDataURL(), scene);
  tex.updateSamplingMode(Texture.NEAREST_NEAREST_MIPNEAREST);
  tex.wrapU = Texture.CLAMP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;
  m.diffuseTexture = tex;
  m.diffuseColor = new Color3(1, 1, 1);
  m.specularColor = new Color3(0, 0, 0);
  m.emissiveColor = new Color3(0.05, 0.05, 0.05);
  m.backFaceCulling = true;
  m.disableLighting = true;
  sharedMat = m;
  return m;
}

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

  const vCount = sim.verts.length / 3;
  const positions = new Float32Array(sim.verts.length);
  for (let i = 0; i < vCount; i++) {
    positions[i * 3 + 0] = sim.verts[i * 3 + 0] + originX;
    positions[i * 3 + 1] = sim.verts[i * 3 + 1] + originY;
    positions[i * 3 + 2] = sim.verts[i * 3 + 2] + originZ;
  }

  const uvs = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    const id = sim.blocks[i] as BlockId;
    const dx = sim.faceDirs[i * 3 + 0];
    const dy = sim.faceDirs[i * 3 + 1];
    const dz = sim.faceDirs[i * 3 + 2];
    const kind = faceKindForDir(dx, dy, dz);
    const idx = atlasIndexFor(id, kind);
    const t = tileUV(idx);
    const lu = sim.uvs[i * 2 + 0];
    const lv = sim.uvs[i * 2 + 1];
    uvs[i * 2 + 0] = t.u0 + (t.u1 - t.u0) * lu;
    uvs[i * 2 + 1] = t.v0 + (t.v1 - t.v0) * (1 - lv);
  }

  mesh.setVerticesData(VertexBuffer.PositionKind, positions, false);
  mesh.setVerticesData(VertexBuffer.NormalKind, sim.normals, false);
  mesh.setVerticesData(VertexBuffer.UVKind, uvs, false);
  mesh.setIndices(sim.indices);

  mesh.material = getMat(scene);
  mesh.freezeWorldMatrix();
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}
