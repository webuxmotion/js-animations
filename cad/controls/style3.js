import { bind as bindBase } from "./base.js";

const STROKE_MIN       = 18;
const STROKE_MAX       = 60;  // strokes longer than this don't count
const AXIS_RATIO       = 2.5; // one axis must dominate by this factor
const GAP_RESET_MS     = 100;
const PAN_DEACTIVATE   = 800;
const ACTIVATION_GRACE = 250;

export const debug = { mode: "rotate", mouseX: 0, mouseY: 0, activationTime: 0 };

export function bind(canvasEl, mouse, state) {
  let accX = 0, prevAccX = 0, doneX = false;
  let accY = 0, prevAccY = 0, doneY = false;
  let lastMoveTime = 0;
  let deactivateTimer = null;

  function scheduleDeactivation() {
    if (deactivateTimer) clearTimeout(deactivateTimer);
    deactivateTimer = setTimeout(deactivatePan, PAN_DEACTIVATE);
  }

  function deactivatePan() {
    if (deactivateTimer) clearTimeout(deactivateTimer);
    debug.mode = "rotate";
    accX = 0; prevAccX = 0; doneX = false;
    accY = 0; prevAccY = 0; doneY = false;
  }

  function enterPan() {
    debug.mode = "pan";
    debug.activationTime = Date.now();
    scheduleDeactivation();
  }

  const unbindBase = bindBase(canvasEl, mouse, state, {
    onMouseMove(m) {
      const now = Date.now();
      const rawDx = m.x - debug.mouseX;
      const rawDy = m.y - debug.mouseY;
      debug.mouseX = m.x;
      debug.mouseY = m.y;

      if (debug.mode === "pan" && now - debug.activationTime > ACTIVATION_GRACE) {
        deactivatePan();
        return;
      }

      if (now - lastMoveTime > GAP_RESET_MS) {
        accX = 0; prevAccX = 0; doneX = false;
        accY = 0; prevAccY = 0; doneY = false;
      }
      lastMoveTime = now;

      const absX = Math.abs(rawDx);
      const absY = Math.abs(rawDy);
      const dominantX = absX > absY * AXIS_RATIO;
      const dominantY = absY > absX * AXIS_RATIO;

      // ── X axis (only when horizontal move dominates) ──────────
      if (dominantX) {
        if (accX !== 0 && Math.sign(rawDx) !== Math.sign(accX)) {
          prevAccX = accX; accX = rawDx; doneX = false;
        } else { accX += rawDx; }

        if (!doneX &&
            Math.abs(prevAccX) >= STROKE_MIN && Math.abs(prevAccX) <= STROKE_MAX &&
            Math.abs(accX) >= STROKE_MIN &&
            Math.sign(accX) !== Math.sign(prevAccX)) {
          enterPan(); doneX = true;
        }
      }

      // ── Y axis (only when vertical move dominates) ────────────
      if (dominantY) {
        if (accY !== 0 && Math.sign(rawDy) !== Math.sign(accY)) {
          prevAccY = accY; accY = rawDy; doneY = false;
        } else { accY += rawDy; }

        if (!doneY &&
            Math.abs(prevAccY) >= STROKE_MIN && Math.abs(prevAccY) <= STROKE_MAX &&
            Math.abs(accY) >= STROKE_MIN &&
            Math.sign(accY) !== Math.sign(prevAccY)) {
          enterPan(); doneY = true;
        }
      }
    },
    onWheel(e, { rotate, pan }) {
      if (debug.mode === "pan") { pan(e.deltaX, e.deltaY); scheduleDeactivation(); return; }
      rotate(e.deltaX, e.deltaY);
    },
  });

  return function unbind() {
    unbindBase();
    if (deactivateTimer) clearTimeout(deactivateTimer);
  };
}
