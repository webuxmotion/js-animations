import {
  ROTATE_SPEED, PAN_SPEED, ZOOM_SPEED, DRAG_ROTATE_SPEED,
  ZOOM_MIN, ZOOM_MAX
} from "../constants.js";

export function bind(canvasEl, mouse, state, hooks = {}) {
  const { onWheel, onMouseMove } = hooks;
  let dragging = false;
  let last = { x: 0, y: 0 };

  const actions = {
    zoom(deltaY) {
      const delta = Math.max(-50, Math.min(50, deltaY));
      state.zoom *= Math.exp(-delta * ZOOM_SPEED);
      state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom));
    },
    rotate(deltaX, deltaY) {
      state.rotY -= deltaX * ROTATE_SPEED;
      state.rotX -= deltaY * ROTATE_SPEED;
    },
    pan(deltaX, deltaY) {
      state.panX -= deltaX * PAN_SPEED;
      state.panY -= deltaY * PAN_SPEED;
    },
  };

  function handleMouseDown() { dragging = true; last.x = mouse.x; last.y = mouse.y; }
  function handleMouseUp() { dragging = false; }

  function handleMouseMove() {
    if (onMouseMove) onMouseMove(mouse);
    if (!dragging) return;
    state.rotY += (mouse.x - last.x) * DRAG_ROTATE_SPEED;
    state.rotX += (mouse.y - last.y) * DRAG_ROTATE_SPEED;
    last.x = mouse.x;
    last.y = mouse.y;
  }

  function handleWheel(e) {
    e.preventDefault();
    if (e.ctrlKey)  { actions.zoom(e.deltaY); return; }
    if (e.shiftKey) { actions.pan(e.deltaX, e.deltaY); return; }
    if (onWheel) { onWheel(e, actions); return; }
    actions.rotate(e.deltaX, e.deltaY);
  }

  canvasEl.addEventListener("mousedown", handleMouseDown);
  canvasEl.addEventListener("mouseup", handleMouseUp);
  canvasEl.addEventListener("mousemove", handleMouseMove);
  canvasEl.addEventListener("wheel", handleWheel, { passive: false });

  return function unbind() {
    canvasEl.removeEventListener("mousedown", handleMouseDown);
    canvasEl.removeEventListener("mouseup", handleMouseUp);
    canvasEl.removeEventListener("mousemove", handleMouseMove);
    canvasEl.removeEventListener("wheel", handleWheel);
  };
}
