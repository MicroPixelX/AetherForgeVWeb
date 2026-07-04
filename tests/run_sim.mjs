// Minimal runner: imports the TS modules via bun and asserts.
let fails = 0;
const ok = (c, m) => { if (!c) { console.log("FAIL " + m); fails++; } else { console.log("ok  " + m); } };

const { BlockId, blockProperties, Chunk, meshChunk, World, worldToChunk, worldToLocal, voxelIndex, indexToVoxel, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, CHUNK_VOXEL_COUNT } = await import("../src/sim/index.ts");

// blocks
ok(blockProperties(BlockId.Air).solid === false, "air not solid");
ok(blockProperties(BlockId.Air).transparent === true, "air transparent");
ok(blockProperties(BlockId.Grass).opaqueCube === true, "grass opaque");
ok(blockProperties(BlockId.Leaves).transparent === true, "leaves transparent");
ok(blockProperties(BlockId.Glass).transparent === true, "glass transparent");

// chunk
const c = new Chunk();
ok(c.isEmpty === true, "chunk empty");
c.set(1,2,3, BlockId.Grass);
ok(c.isEmpty === false, "chunk not empty after set");
ok(c.get(1,2,3) === BlockId.Grass, "get returns set id");
ok(c.get(0,0,0) === BlockId.Air, "unset is air");
ok(c.occupiedCount === 1, "occupied 1");
c.set(1,2,3, BlockId.Air);
ok(c.isEmpty === true, "chunk empty after clear");
ok(c.getSafe(-1,0,0, BlockId.Stone) === BlockId.Stone, "getSafe respects bounds");

// index math
let mxOk = true;
for (let i = 0; i < CHUNK_VOXEL_COUNT; i++) {
  const v = indexToVoxel(i);
  if (voxelIndex(v.x, v.y, v.z) !== i) { mxOk = false; break; }
}
ok(mxOk, "voxelIndex <-> indexToVoxel round trip");

// mesher: single block
const single = new Chunk();
single.set(0,0,0, BlockId.Stone);
const m1 = meshChunk(single);
ok(m1.verts.length === 24*3, "single block verts 24*3, got " + m1.verts.length);
ok(m1.indices.length === 36, "single block indices 36, got " + m1.indices.length);

// mesher: buried block adds no faces
const solid = new Chunk();
for (let x = 3; x <= 7; x++) for (let y = 3; y <= 7; y++) for (let z = 3; z <= 7; z++) solid.set(x,y,z, BlockId.Stone);
const mb1 = meshChunk(solid);
const mb2 = meshChunk(solid);
ok(mb1.verts.length === mb2.verts.length && mb1.verts.length > 0, "big box meshes >0 verts");
ok(mb1.indices.length === mb2.indices.length, "meshing deterministic");

// world
const w = new World();
w.setBlock(0,0,0, BlockId.Dirt);
w.setBlock(CHUNK_SIZE_X, 0, 0, BlockId.Stone);
ok(w.getBlock(0,0,0) === BlockId.Dirt, "world dirt at origin");
ok(w.getBlock(CHUNK_SIZE_X,0,0) === BlockId.Stone, "world stone across chunk");
ok(w.getBlock(CHUNK_SIZE_X-1,0,0) === BlockId.Air, "world air at last local");
ok(w.chunkCount === 2, "world has 2 chunks, got " + w.chunkCount);

// coord math
const cc = worldToChunk(-1,-1,-1);
ok(cc.x === -1 && cc.y === -1 && cc.z === -1, "worldToChunk negative -1");
const lv = worldToLocal(-1,0,0);
ok(lv.x === CHUNK_SIZE_X-1, "worldToLocal wraps -1");
const c2 = worldToChunk(-7,13,-42);
const l2 = worldToLocal(-7,13,-42);
ok(c2.x*CHUNK_SIZE_X + l2.x === -7, "roundtrip x");
ok(c2.y*CHUNK_SIZE_Y + l2.y === 13, "roundtrip y");
ok(c2.z*CHUNK_SIZE_Z + l2.z === -42, "roundtrip z");

console.log(fails === 0 ? "PASS all" : ("FAIL " + fails));
process.exit(fails === 0 ? 0 : 1);
