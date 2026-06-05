import { bind as bindBase } from "./base.js";
import { GESTURE_TIMEOUT_MS } from "../constants.js";

export function bind(canvasEl, mouse, state) {
  let gestureMode = null;
  let gestureTimeout = null;

  const unbindBase = bindBase(canvasEl, mouse, state, {
    onWheel(e, { zoom, rotate, pan }) {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      if (gestureTimeout) clearTimeout(gestureTimeout);
      gestureTimeout = setTimeout(() => { gestureMode = null; }, GESTURE_TIMEOUT_MS);

      if (!gestureMode) {
        if (absY > absX * 3 && absY > 25) gestureMode = "zoom";
        else                              gestureMode = "rotate";
      }

      if (gestureMode === "zoom") { zoom(e.deltaY); return; }
      if (gestureMode === "pan")  { pan(e.deltaX, e.deltaY); return; }
      rotate(e.deltaX, e.deltaY);
    },
  });

  return function unbind() {
    unbindBase();
    if (gestureTimeout) clearTimeout(gestureTimeout);
  };
}
