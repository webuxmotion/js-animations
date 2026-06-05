import {
  DRAG_ROTATE_SPEED, ZOOM_SPEED, ZOOM_MIN, ZOOM_MAX,
  PAN_SPEED, ROTATE_SPEED
} from "../constants.js";

const STROKE_MIN     = 18;   // px — each half of the shake must travel this far
const GAP_RESET_MS   = 100;  // ms — pause longer than this resets stroke state
const PAN_DEACTIVATE = 800;  // ms — after last pan scroll, return to rotate
const ACTIVATION_GRACE = 250; // ms — mouse move won't self-cancel right after activation

export const debug = {
  mode: "rotate",
  mouseX: 0,
  mouseY: 0,
  activationTime: 0
};

export function bind(canvasEl, mouse, state) {
  let dragging = false;
  let dragLast = { x: 0, y: 0 };

  // per-axis stroke accumulation
  let accX = 0, prevAccX = 0, doneX = false;
  let accY = 0, prevAccY = 0, doneY = false;
  let lastMoveTime = 0;

  let deactivateTimer = null;

  function enterPan() {
    debug.mode = "pan";
    debug.activationTime = Date.now();
    scheduleDeactivation();
  }

  function deactivatePan() {
    if (deactivateTimer) clearTimeout(deactivateTimer);
    debug.mode = "rotate";
    accX = 0; prevAccX = 0; doneX = false;
    accY = 0; prevAccY = 0; doneY = false;
  }

  function scheduleDeactivation() {
    if (deactivateTimer) clearTimeout(deactivateTimer);
    deactivateTimer = setTimeout(deactivatePan, PAN_DEACTIVATE);
  }

  function onMouseDown() {
    dragging = true;
    dragLast.x = mouse.x;
    dragLast.y = mouse.y;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onMouseMove() {
    const now = Date.now();
    const rawDx = mouse.x - debug.mouseX;
    const rawDy = mouse.y - debug.mouseY;

    debug.mouseX = mouse.x;
    debug.mouseY = mouse.y;

    // exit pan immediately on mouse move (after grace)
    if (debug.mode === "pan" && now - debug.activationTime > ACTIVATION_GRACE) {
      deactivatePan();
      return;
    }

    // reset stroke state after a pause
    if (now - lastMoveTime > GAP_RESET_MS) {
      accX = 0; prevAccX = 0; doneX = false;
      accY = 0; prevAccY = 0; doneY = false;
    }
    lastMoveTime = now;

    // ── X axis ──────────────────────────────────────────────────
    if (Math.abs(rawDx) > 0) {
      const signX = Math.sign(rawDx);
      if (accX !== 0 && signX !== Math.sign(accX)) {
        // direction reversed — complete the outgoing stroke
        prevAccX = accX;
        accX = rawDx;
        doneX = false;
      } else {
        accX += rawDx;
      }

      if (!doneX &&
          Math.abs(prevAccX) >= STROKE_MIN &&
          Math.abs(accX)     >= STROKE_MIN &&
          Math.sign(accX) !== Math.sign(prevAccX)) {
        enterPan();
        doneX = true;
      }
    }

    // ── Y axis ──────────────────────────────────────────────────
    if (Math.abs(rawDy) > 0) {
      const signY = Math.sign(rawDy);
      if (accY !== 0 && signY !== Math.sign(accY)) {
        prevAccY = accY;
        accY = rawDy;
        doneY = false;
      } else {
        accY += rawDy;
      }

      if (!doneY &&
          Math.abs(prevAccY) >= STROKE_MIN &&
          Math.abs(accY)     >= STROKE_MIN &&
          Math.sign(accY) !== Math.sign(prevAccY)) {
        enterPan();
        doneY = true;
      }
    }

    if (!dragging) return;
    state.rotY += (mouse.x - dragLast.x) * DRAG_ROTATE_SPEED;
    state.rotX += (mouse.y - dragLast.y) * DRAG_ROTATE_SPEED;
    dragLast.x = mouse.x;
    dragLast.y = mouse.y;
  }

  function onWheel(e) {
    e.preventDefault();

    if (e.ctrlKey) {
      const delta = Math.max(-50, Math.min(50, e.deltaY));
      state.zoom *= Math.exp(-delta * ZOOM_SPEED);
      state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom));
      return;
    }

    if (debug.mode === "pan") {
      state.panX -= e.deltaX * PAN_SPEED;
      state.panY -= e.deltaY * PAN_SPEED;
      scheduleDeactivation();
      return;
    }

    state.rotY -= e.deltaX * ROTATE_SPEED;
    state.rotX -= e.deltaY * ROTATE_SPEED;
  }

  canvasEl.addEventListener("mousedown", onMouseDown);
  canvasEl.addEventListener("mouseup", onMouseUp);
  canvasEl.addEventListener("mousemove", onMouseMove);
  canvasEl.addEventListener("wheel", onWheel, { passive: false });

  return function unbind() {
    canvasEl.removeEventListener("mousedown", onMouseDown);
    canvasEl.removeEventListener("mouseup", onMouseUp);
    canvasEl.removeEventListener("mousemove", onMouseMove);
    canvasEl.removeEventListener("wheel", onWheel);
    if (deactivateTimer) clearTimeout(deactivateTimer);
  };
}
