import {
  DRAG_ROTATE_SPEED, ZOOM_SPEED, ZOOM_MIN, ZOOM_MAX,
  PAN_SPEED, ROTATE_SPEED
} from "../constants.js";

const CENTER_HALF = 40; // half-height of the pan zone at vertical center

export const debug = {
  mode: null,
  mouseX: 0,
  mouseY: 0,
  screenHeight: 0,
  centerHalf: CENTER_HALF,
  lastEventTime: 0
};

export function bind(canvasEl, mouse, state) {
  let dragging = false;
  let last = { x: 0, y: 0 };

  function onMouseDown() {
    dragging = true;
    last.x = mouse.x;
    last.y = mouse.y;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onMouseMove() {
    debug.mouseX = mouse.x;
    debug.mouseY = mouse.y;
    debug.screenHeight = state.height;

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

    debug.mouseX = mouse.x;
    debug.mouseY = mouse.y;
    debug.screenHeight = state.height;
    debug.lastEventTime = Date.now();

    if (e.ctrlKey) {
      const delta = Math.max(-50, Math.min(50, e.deltaY));
      state.zoom *= Math.exp(-delta * ZOOM_SPEED);
      state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom));
      debug.mode = "zoom";
      return;
    }

    const inCenter = Math.abs(mouse.y - state.height / 2) < CENTER_HALF;
    const mode = inCenter ? "pan" : "rotate";
    debug.mode = mode;

    if (mode === "pan") {
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
  };
}
