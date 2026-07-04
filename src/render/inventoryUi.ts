import type { Inventory, Slot } from "../sim/inventory";
import { blockProperties, BlockId } from "../sim/blocks";

// Pure-DOM hotbar + crosshair UI. No framework; updates on slot changes.

let root: HTMLDivElement | null = null;
let cross: HTMLDivElement | null = null;
let cells: HTMLDivElement[] = [];

const BLOCK_COLOR: Record<number, string> = {
  [BlockId.Grass]: "#74c258", [BlockId.Dirt]: "#8b633d",
  [BlockId.Stone]:"#808084",  [BlockId.Sand]: "#e0d089",
  [BlockId.Water]:"#3366d8",  [BlockId.Wood]: "#735032",
  [BlockId.Leaves]:"#339933", [BlockId.Bedrock]:"#2e2e33",
  [BlockId.Planks]:"#a8814d",[BlockId.Cobblestone]:"#6b6b6f",
  [BlockId.Glass]:"#b3d8f0",
};

export function drawInventoryToDom(inv: Inventory): void {
  if (!root) {
    root = document.createElement("div");
    root.id = "hotbar";
    Object.assign(root.style, {
      position: "fixed", left: "50%", bottom: "12px", transform: "translateX(-50%)",
      display: "flex", gap: "4px", padding: "6px", borderRadius: "6px",
      background: "rgba(0,0,0,0.45)", pointerEvents: "none", zIndex: "10",
    } as Partial<CSSStyleDeclaration>);

    for (let i = 0; i < 9; i++) {
      const c = document.createElement("div");
      Object.assign(c.style, {
        width: "40px", height: "40px", borderRadius: "4px",
        border: "2px solid rgba(255,255,255,0.25)", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", font: "bold 11px monospace",
        background: "rgba(255,255,255,0.08)",
      } as Partial<CSSStyleDeclaration>);
      cells.push(c);
      root.appendChild(c);
    }
    document.body.appendChild(root);

    cross = document.createElement("div");
    Object.assign(cross.style, {
      position: "fixed", left: "50%", top: "50%", width: "14px", height: "14px",
      transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: "10",
    } as Partial<CSSStyleDeclaration>);
    cross.style.background =
      "linear-gradient(to right, transparent 46%, #fff 47%, #fff 53%, transparent 54%)," +
      "linear-gradient(to bottom, transparent 46%, #fff 47%, #fff 53%, transparent 54%)";
    document.body.appendChild(cross);
  }
  refresh(inv);
  inv.refreshCb = () => refresh(inv);
}

function refresh(inv: Inventory): void {
  for (let i = 0; i < 9; i++) {
    const cell = cells[i];
    if (!cell) continue;
    const s: Slot | null = inv.hotbar[i] ?? null;
    const sel = i === inv.selected;
    cell.style.borderColor = sel ? "#ffd24a" : "rgba(255,255,255,0.25)";
    if (s) {
      cell.style.background = (BLOCK_COLOR[s.id] ?? "#888");
      cell.textContent = s.count > 1 ? String(s.count) : "";
      cell.style.color = "#0b0d10";
    } else {
      cell.style.background = "rgba(255,255,255,0.08)";
      cell.textContent = "";
    }
    cell.title = s ? blockProperties(s.id).name : "";
  }
}
