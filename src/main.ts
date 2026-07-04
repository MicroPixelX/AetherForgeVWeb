import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Materials/standardMaterial";

import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "./sim/chunk";
import { buildTestChunk, meshTestChunk } from "./render/testWorld";
import { buildChunkBabylonMesh } from "./render/chunkMeshBuilder";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });

const scene = new Scene(engine);
scene.clearColor = new Color4(0.04, 0.05, 0.06, 1);

const cx = CHUNK_SIZE_X / 2, cy = CHUNK_SIZE_Y / 2, cz = CHUNK_SIZE_Z / 2;
const camera = new ArcRotateCamera("cam", -Math.PI / 4, Math.PI / 3, 90, new Vector3(cx, cy, cz), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 20;
camera.upperRadiusLimit = 180;
camera.wheelDeltaPercentage = 0.02;

const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.4), scene);
hemi.intensity = 0.7;
const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.4), scene);
sun.intensity = 0.7;

const chunk = buildTestChunk();
const simMesh = meshTestChunk(chunk, null);
const bMesh = buildChunkBabylonMesh(scene, "test_chunk", simMesh, 0, 0, 0);
if (!bMesh) console.warn("[AetherForgeV] mesh produced no geometry");

const hud = document.getElementById("hud");
if (hud) {
  const tris = simMesh.indices.length / 3;
  const verts = simMesh.verts.length / 3;
  hud.textContent = `AetherForgeV alpha  verts=${verts} tris=${tris}  drag=orbit  wheel=zoom`;
}

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
