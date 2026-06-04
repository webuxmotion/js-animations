import { createMouseTracker } from "./mouse.js";
import { createCanvas } from "./canvas.js";
import { render } from "./renderer.js";

const canvasEl = document.querySelector("canvas");

canvasEl.style.width = "100vw";
canvasEl.style.height = "100vh";

const canvas = createCanvas(canvasEl);
const ctx = canvas.ctx;

const mouse = createMouseTracker(canvasEl);

// initial resize
canvas.resize();

// resize listener
window.addEventListener("resize", canvas.resize);

function loop() {
  render(ctx, mouse, canvasEl);
  requestAnimationFrame(loop);
}

loop();