import { bind as bindBase } from "./base.js";

const CENTER_HALF = 40;

export const debug = {
  mode: null,
  mouseX: 0,
  mouseY: 0,
  screenHeight: 0,
  centerHalf: CENTER_HALF,
  lastEventTime: 0,
};

export function bind(canvasEl, mouse, state) {
  return bindBase(canvasEl, mouse, state, {
    onMouseMove(m) {
      debug.mouseX = m.x;
      debug.mouseY = m.y;
      debug.screenHeight = state.height;
    },
    onWheel(e, { rotate, pan }) {
      debug.mouseX = mouse.x;
      debug.mouseY = mouse.y;
      debug.screenHeight = state.height;
      debug.lastEventTime = Date.now();

      const inCenter = Math.abs(mouse.y - state.height / 2) < CENTER_HALF;
      debug.mode = inCenter ? "pan" : "rotate";
      if (inCenter) pan(e.deltaX, e.deltaY);
      else          rotate(e.deltaX, e.deltaY);
    },
  });
}
