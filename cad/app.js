import { createMouseTracker } from "../mouse.js";
import { createCanvas } from "../canvas.js";
import { createCamera } from "./camera.js";
import { buildText } from "./font.js";
import { drawLine3D, drawGridPlane } from "./renderer.js";
import * as trackpad from "./controls/trackpad.js";
import * as style2 from "./controls/style2.js";
import * as style3 from "./controls/style3.js";
import { drawBorderHints, drawModeHint } from "./border-hints.js";
import { createRecorder } from "./recorder.js";

const SCHEMES = { trackpad, style2, style3 };

const canvasEl = document.querySelector("canvas");
canvasEl.style.width = "100vw";
canvasEl.style.height = "100vh";

const canvas = createCanvas(canvasEl);
const ctx = canvas.ctx;
const mouse = createMouseTracker(canvasEl);
const camera = createCamera();

function onResize() {
  canvas.resize();
  const rect = canvasEl.getBoundingClientRect();
  camera.state.width = rect.width;
  camera.state.height = rect.height;
}

onResize();
window.addEventListener("resize", onResize);

let unbindCurrent = null;
let activeScheme = "trackpad";

function applyScheme(name) {
  if (unbindCurrent) unbindCurrent();
  activeScheme = name;
  unbindCurrent = SCHEMES[name].bind(canvasEl, mouse, camera.state);
}

applyScheme("style2");

document.getElementById("controls").addEventListener("change", (e) => {
  applyScheme(e.target.value);
});

const recorder = createRecorder(canvasEl);
const recordBtn = document.getElementById("record");
recordBtn.addEventListener("click", () => recorder.toggle(recordBtn));

const themeBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("cad-theme") ?? "dark";
applyTheme(savedTheme);

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  themeBtn.textContent = theme === "light" ? "Dark" : "Light";
  localStorage.setItem("cad-theme", theme);
}

themeBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(next);
});

const labels = [
  ...buildText("TOP",   { x: -100, y: 0, z: 0 }, 10, "#4a90e2"),
  ...buildText("FRONT", { x: -120, y: 0, z: -120 }, 10, "#e24a4a"),
  ...buildText("RIGHT", { x: 120, y: 0, z: 0 }, 10, "#4ae28a")
];

function loop() {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  drawGridPlane(ctx, "xy", camera.state);
  drawGridPlane(ctx, "xz", camera.state);
  drawGridPlane(ctx, "yz", camera.state);

  for (const l of labels) {
    drawLine3D(ctx, l.a, l.b, camera.state, l.color);
  }

  if (activeScheme === "style2") {
    drawBorderHints(ctx, camera.state.width, camera.state.height, style2.debug.centerHalf, style2.debug.mouseY);
  }
  if (activeScheme === "style3") {
    drawModeHint(ctx, camera.state.height, style3.debug.mode, style3.debug.mouseY, style3.debug.activationTime);
  }

  requestAnimationFrame(loop);
}

loop();
