import { BlockId } from "./blocks";

export interface Slot { id: BlockId; count: number; }
const STACK_MAX = 64;

const private_refresh = (inv: Inventory) => inv.refreshCb?.();

export class Inventory {
  hotbar: Slot[] = [];
  bags: Slot[] = [];
  selected = 0;
  refreshCb: (() => void) | null = null;

  constructor(hotbarSize = 9, bagSize = 27) {
    this.hotbar = new Array(hotbarSize).fill(null);
    this.bags = new Array(bagSize).fill(null);
  }

  // Add as many of `id` as possible, returning leftover count.
  add(id: BlockId, count = 1): number {
    const left = this._add(id, count);
    private_refresh(this);
    return left;
  }

  private _add(id: BlockId, count: number): number {
    let remaining = count;
    for (const arr of [this.hotbar, this.bags] as Slot[][]) {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        const s = arr[i];
        if (s && s.id === id && s.count < STACK_MAX) {
          const take = Math.min(STACK_MAX - s.count, remaining);
          s.count += take; remaining -= take;
        }
      }
    }
    for (const arr of [this.hotbar, this.bags] as Slot[][]) {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        if (!arr[i]) {
          const take = Math.min(STACK_MAX, remaining);
          arr[i] = { id, count: take };
          remaining -= take;
        }
      }
    }
    return remaining;
  }

  // Consume one from the selected hotbar slot. Returns true if removed.
  consumeSelected(): boolean {
    const s = this.hotbar[this.selected];
    if (!s || s.count <= 0) return false;
    s.count--;
    if (s.count === 0) this.hotbar[this.selected] = null;
    private_refresh(this);
    return true;
  }

  selectedSlot(): Slot | null {
    return this.hotbar[this.selected];
  }

  scrollHotbar(dir: 1 | -1): void {
    this.selected = (this.selected + dir + this.hotbar.length) % this.hotbar.length;
    private_refresh(this);
  }

  setHotbar(index: number, slot: Slot | null): void {
    if (index < 0 || index >= this.hotbar.length) return;
    this.hotbar[index] = slot;
    private_refresh(this);
  }

  serialize(): { hotbar: Slot[]; bags: Slot[]; selected: number } {
    return {
      hotbar: this.hotbar.map(s => s ? { id: s.id, count: s.count } : null).filter(Boolean) as Slot[],
      bags:   this.bags.map(s => s ? { id: s.id, count: s.count } : null).filter(Boolean) as Slot[],
      selected: this.selected,
    };
  }

  loadFrom(data: { hotbar: Slot[]; bags: Slot[]; selected: number }): void {
    this.hotbar = new Array(9).fill(null);
    for (const s of data.hotbar ?? []) this.add(s.id, s.count);
    this.bags = new Array(27).fill(null);
    for (const s of data.bags ?? []) this.add(s.id, s.count);
    this.selected = data.selected ?? 0;
  }
}
