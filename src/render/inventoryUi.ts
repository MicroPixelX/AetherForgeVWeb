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
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: "6px", padding: "8px",
      borderRadius: "12px", background: "rgba(15,18,24,0.72)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
      backdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,0.08)",
      pointerEvents: "none", zIndex: "10",
    } as Partial<CSSStyleDeclaration>);
    root.style.setProperty("bottom", "max(14px, env(safe-area-inset-bottom))");

    for (let i = 0; i < 9; i++) {
      const c = document.createElement("div");
      Object.assign(c.style, {
        width: "44px", height: "44px", borderRadius: "8px",
        position: "relative",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        flex: "0 0 auto",
        color: "#fff",
        font: "bold 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
        textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)",
        boxSizing: "border-box",
        border: "2px solid transparent",
        overflow: "hidden",
        transition: "transform 0.08s ease",
      } as Partial<CSSStyleDeclaration>);
      const pad = document.createElement("div");
      pad.style.cssText = "position:absolute;left:0;right:0;bottom:0;padding:2px 0;text-align:center;";
      pad.textContent = "";
      c.appendChild(pad);
      cells.push(c);
      root.appendChild(c);
    }
    document.body.appendChild(root);

    cross = document.createElement("div");
    Object.assign(cross.style, {
      position: "fixed", left: "50%", top: "50%", width: "18px", height: "18px",
      transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: "10",
      mixBlendMode: "difference", opacity: "0.9",
    } as Partial<CSSStyleDeclaration>);
    cross.style.background =
      "linear-gradient(to right, transparent 44%, #fff 46%, #fff 54%, transparent 56%)," +
      "linear-gradient(to bottom, transparent 44%, #fff 46%, #fff 54%, transparent 56%)";
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
    cell.style.borderColor = sel ? "#ffd24a" : "rgba(255,255,255,0.10)";
    cell.style.borderWidth = "2px";
    cell.style.borderStyle = "solid";
    cell.style.boxShadow = sel
      ? "0 0 10px rgba(255,210,74,0.55), inset 0 0 6px rgba(0,0,0,0.35)"
      : "inset 0 0 6px rgba(0,0,0,0.35)";
    cell.style.transform = sel ? "scale(1.08)" : "scale(1)";
    const pad = cell.firstChild as HTMLDivElement;
    if (s) {
      cell.style.background = `linear-gradient(${BLOCK_COLOR[s.id] ?? "#888"}, ${BLOCK_COLOR[s.id] ?? "#888"})`;
      pad.textContent = s.count > 1 ? String(s.count) : "";
      pad.style.color = "#fff";
    } else {
      cell.style.background = "rgba(255,255,255,0.06)";
      pad.textContent = "";
    }
    cell.title = s ? blockProperties(s.id).name : "";
  }
}
