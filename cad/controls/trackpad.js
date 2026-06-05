import {
  ROTATE_SPEED, PAN_SPEED, ZOOM_SPEED, DRAG_ROTATE_SPEED,
  GESTURE_TIMEOUT_MS, ZOOM_MIN, ZOOM_MAX
} from "../constants.js";

export function bind(canvasEl, mouse, state) {
  let dragging = false;
  let last = { x: 0, y: 0 };
  let gestureMode = null;
  let gestureTimeout = null;

  function onMouseDown() {
    dragging = true;
    last.x = mouse.x;
    last.y = mouse.y;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onMouseMove() {
    if (!dragging) return;
    const dx = mouse.x - last.x;
    const dy = mouse.y - last.y;
    state.rotY += dx * DRAG_ROTATE_SPEED;
    state.rotX += dy * DRAG_ROTATE_SPEED;
    last.x = mouse.x;
    last.y = mouse.y;
  }

  function onWheel(e) {
    e.preventDefault();

    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    if (gestureTimeout) clearTimeout(gestureTimeout);
    gestureTimeout = setTimeout(() => {
      gestureMode = null;
    }, GESTURE_TIMEOUT_MS);

    if (!gestureMode) {
      if (e.ctrlKey) {
        gestureMode = "zoom";
      } else if (e.shiftKey) {
        gestureMode = "pan";
      } else if (absY > absX * 3 && absY > 25) {
        gestureMode = "zoom";
      } else {
        gestureMode = "rotate";
      }
    }

    if (gestureMode === "zoom") {
      const delta = Math.max(-50, Math.min(50, e.deltaY));
      state.zoom *= Math.exp(-delta * ZOOM_SPEED);
      state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom));
      return;
    }

    if (gestureMode === "pan") {
      state.panX -= e.deltaX * PAN_SPEED;
      state.panY -= e.deltaY * PAN_SPEED;
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
    if (gestureTimeout) clearTimeout(gestureTimeout);
  };
}
