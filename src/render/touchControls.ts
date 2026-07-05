// Virtual touch controls: left-side movement joystick + right-side look drag,
// plus Break / Place / Jump buttons. Only mounted when the device looks touch
// capable (max-touch-points > 0 or coarse pointer media query).
//
// Exposes a small input state shape that main.ts feeds into the existing
// PlayerController / BlockPicker, decoupled from mouse code.

export interface TouchInputState {
  move: { x: number; y: number };   // joystick, x/y in [-1, 1]
  jump: boolean;
  sprint: boolean;
  look: { dx: number; dy: number };  // accumulated delta since last consume
  breakRequested: boolean;
  placeRequested: boolean;
}

export interface TouchControls {
  enabled: boolean;
  state: TouchInputState;
  /** Reset per-frame impulse flags (called by main each frame after reading). */
  endFrame(): void;
  /** Reset accumulated look delta without resetting buttons (consumer call). */
  consumeLook(): { dx: number; dy: number };
  dispose(): void;
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)").matches) return true;
  if ((navigator as any).maxTouchPoints > 0) return true;
  return "ontouchstart" in window;
}

export function mountTouchControls(): TouchControls | null {
  if (!isTouchDevice()) return null;

  const state: TouchInputState = {
    move: { x: 0, y: 0 },
    jump: false,
    sprint: false,
    look: { dx: 0, dy: 0 },
    breakRequested: false,
    placeRequested: false,
  };

  const root = document.createElement("div");
  root.id = "touchRoot";
  Object.assign(root.style, {
    position: "fixed", inset: "0", pointerEvents: "none",
    zIndex: "20",
  } as Partial<CSSStyleDeclaration>);

  // ----- Left-side movement joystick -----------------------------------------
  const stickBase = document.createElement("div");
  Object.assign(stickBase.style, {
    position: "absolute", left: "calc(env(safe-area-inset-left, 0px) + 24px)",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
    width: "128px", height: "128px", borderRadius: "50%",
    background: "rgba(15,18,24,0.35)",
    border: "1px solid rgba(255,255,255,0.18)", pointerEvents: "auto",
    touchAction: "none",
  } as Partial<CSSStyleDeclaration>);
  const stickKnob = document.createElement("div");
  Object.assign(stickKnob.style, {
    position: "absolute", left: "50%", top: "50%",
    width: "52px", height: "52px", marginLeft: "-26px", marginTop: "-26px",
    borderRadius: "50%", background: "rgba(255,255,255,0.55)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)", transition: "transform 0.04s linear",
  } as Partial<CSSStyleDeclaration>);
  stickBase.appendChild(stickKnob);

  let stickPointerId: number | null = null;
  let stickCenter = { x: 0, y: 0 };
  const R = 56;
  stickBase.addEventListener("pointerdown", (e) => {
    stickPointerId = e.pointerId;
    stickBase.setPointerCapture?.(e.pointerId);
    const r = stickBase.getBoundingClientRect();
    stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    e.preventDefault();
  });
  const moveHandler = (e: PointerEvent) => {
    if (stickPointerId !== e.pointerId) return;
    let dx = e.clientX - stickCenter.x;
    let dy = e.clientY - stickCenter.y;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    state.move.x = dx / R;
    state.move.y = dy / R;
    // Sprint when fully pushed.
    state.sprint = Math.hypot(state.move.x, state.move.y) > 0.85;
  };
  stickBase.addEventListener("pointermove", moveHandler);
  const endStick = (e: PointerEvent) => {
    if (stickPointerId !== e.pointerId) return;
    stickPointerId = null;
    stickKnob.style.transform = "translate(0,0)";
    state.move.x = 0; state.move.y = 0; state.sprint = false;
  };
  stickBase.addEventListener("pointerup", endStick);
  stickBase.addEventListener("pointercancel", endStick);
  stickBase.addEventListener("pointerleave", endStick);

  // ----- Right-side action buttons -------------------------------------------
  const mkButton = (label: string, color: string, style: Partial<CSSStyleDeclaration> = {}) => {
    const b = document.createElement("div");
    Object.assign(b.style, {
      position: "absolute",
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "64px", height: "64px", borderRadius: "50%",
      background: "rgba(15,18,24,0.55)",
      border: `2px solid ${color}`,
      color, fontWeight: "bold", fontSize: "13px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      pointerEvents: "auto", touchAction: "none", userSelect: "none",
      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
      ...style,
    } as Partial<CSSStyleDeclaration>);
    b.textContent = label;
    return b;
  };

  const btnBreak = mkButton("BREAK", "#ff6b6b", {
    right: "calc(env(safe-area-inset-right, 0px) + 96px)",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 130px)",
  });
  const btnPlace = mkButton("PLACE", "#6bd2ff", {
    right: "calc(env(safe-area-inset-right, 0px) + 24px)",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 180px)",
  });
  const btnJump = mkButton("JUMP", "#ffd24a", {
    right: "calc(env(safe-area-inset-right, 0px) + 96px)",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 54px)",
  });

  const tapBtn = (el: HTMLElement, onDown: () => void, onUp?: () => void) => {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); onDown(); });
    el.addEventListener("pointerup", (e) => { e.preventDefault(); onUp?.(); });
    el.addEventListener("pointercancel", () => onUp?.());
    el.addEventListener("pointerleave", () => onUp?.());
  };
  tapBtn(btnBreak, () => { state.breakRequested = true; });
  tapBtn(btnPlace, () => { state.placeRequested = true; });
  tapBtn(btnJump, () => { state.jump = true; }, () => { state.jump = false; });

  // ----- Right-side look area (drag the canvas to look) ----------------------
  // The touch root is invisible and lies above the canvas only on the right
  // half so the left half is reserved for the joystick. Wheel events still
  // fall through; touch look handled here.
  const lookZone = document.createElement("div");
  Object.assign(lookZone.style, {
    position: "absolute", right: "0", top: "0", bottom: "0",
    width: "55%", pointerEvents: "auto", touchAction: "none",
  } as Partial<CSSStyleDeclaration>);
  let lookActive = false;
  lookZone.addEventListener("pointerdown", (e) => {
    lookActive = true;
    lookZone.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  lookZone.addEventListener("pointermove", (e) => {
    if (!lookActive) return;
    state.look.dx += e.movementX;
    state.look.dy += e.movementY;
  });
  const endLook = () => { lookActive = false; };
  lookZone.addEventListener("pointerup", endLook);
  lookZone.addEventListener("pointercancel", endLook);

  root.appendChild(lookZone);
  root.appendChild(stickBase);
  root.appendChild(btnBreak);
  root.appendChild(btnPlace);
  root.appendChild(btnJump);
  document.body.appendChild(root);

  return {
    enabled: true,
    state,
    endFrame() {
      state.breakRequested = false;
      state.placeRequested = false;
    },
    consumeLook() {
      const l = { dx: state.look.dx, dy: state.look.dy };
      state.look.dx = 0; state.look.dy = 0;
      return l;
    },
    dispose() {
      root.remove();
    },
  };
}
