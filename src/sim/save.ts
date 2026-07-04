import type { Vector3Like } from "./types";

// Authoritative save shape. Stored under one key per world slot.
export interface PlayerSave {
  pos: Vector3Like;
  yaw: number;
  pitch: number;
  selectedHotbar: number;
}
export interface WorldSave {
  player: PlayerSave;
  // Dirty voxels as flat arrays for compactness (sparse edits overlay worldgen).
  edits: { x: number; y: number; z: number; id: number }[];
  version: number;
}

const DB_NAME = "aetherforgev";
const STORE = "saves";
const KEY = "default";

let db: IDBDatabase | null = null;

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

export async function loadSave(): Promise<WorldSave | null> {
  try {
    const d = await openDb();
    return await new Promise<WorldSave | null>((resolve, reject) => {
      const store = d.transaction(STORE, "readonly").objectStore(STORE);
      const getReq = store.get(KEY);
      getReq.onsuccess = () => resolve((getReq.result as WorldSave) ?? null);
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}

export async function saveWorld(s: WorldSave): Promise<void> {
  const d = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(s, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let playerSaveBuf: PlayerSave = { pos: { x: 8, y: 40, z: 8 }, yaw: 0, pitch: 0, selectedHotbar: 0 };
let lastSaveAt = 0;

export function memoPlayer(p: PlayerSave): void { playerSaveBuf = p; }
export function getPlayerSave(): PlayerSave { return playerSaveBuf; }

export async function savePlayer(pos: Vector3Like): Promise<void> {
  playerSaveBuf.pos = { x: pos.x, y: pos.y, z: pos.z };
  const now = performance.now();
  if (now - lastSaveAt < 5000) return; // throttle to once per 5s
  lastSaveAt = now;
  await persistNow();
}

export async function persistNow(): Promise<void> {
  try {
    await saveWorld({ player: playerSaveBuf, edits: [], version: 1 });
  } catch {
    // Storage failures are non-fatal in the browser; carry on.
  }
}
