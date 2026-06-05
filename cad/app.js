import { createMouseTracker } from "../mouse.js";
import { createCanvas } from "../canvas.js";
import { createCamera } from "./camera.js";
import { drawGridPlane, drawPlaneIntersections } from "./renderer.js";
import { drawBox, drawPyramid, drawSphere } from "./shapes.js";
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

applyScheme("trackpad");

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

const EYE_OPEN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_SHUT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const planeVisible = { xy: true, xz: true, yz: true };

document.querySelectorAll('.plane-vis').forEach(btn => {
  btn.innerHTML = EYE_OPEN;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const p = btn.dataset.plane;
    planeVisible[p] = !planeVisible[p];
    btn.innerHTML = planeVisible[p] ? EYE_OPEN : EYE_SHUT;
    btn.classList.toggle('hidden', !planeVisible[p]);
  });
});

const objVisible = { box: true, pyramid: true, sphere: true };

document.querySelectorAll('.obj-vis').forEach(btn => {
  btn.innerHTML = EYE_OPEN;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const o = btn.dataset.obj;
    objVisible[o] = !objVisible[o];
    btn.innerHTML = objVisible[o] ? EYE_OPEN : EYE_SHUT;
    btn.classList.toggle('hidden', !objVisible[o]);
  });
});

// Normal-view camera angles per plane
const PLANE_VIEWS = {
  xy: { rotX: 0,              rotY: 0 },           // front
  xz: { rotX: Math.PI / 2,   rotY: 0 },            // top
  yz: { rotX: 0,              rotY: -Math.PI / 2 }, // right
};

let snapAnim = null; // { fromX, fromY, toX, toY, startTime, duration }

function snapToPlane(plane) {
  const target = PLANE_VIEWS[plane];
  snapAnim = {
    fromX: camera.state.rotX, fromY: camera.state.rotY,
    toX: target.rotX,         toY: target.rotY,
    startTime: performance.now(), duration: 350,
  };
}

document.querySelectorAll('.plane-item').forEach(el => {
  el.addEventListener('dblclick', () => {
    document.querySelectorAll('.plane-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    snapToPlane(el.dataset.plane);
  });
});

function easeOut(t) { return 1 - (1 - t) * (1 - t); }

function tickSnap() {
  if (!snapAnim) return;
  const t = Math.min(1, (performance.now() - snapAnim.startTime) / snapAnim.duration);
  const e = easeOut(t);
  camera.state.rotX = snapAnim.fromX + (snapAnim.toX - snapAnim.fromX) * e;
  camera.state.rotY = snapAnim.fromY + (snapAnim.toY - snapAnim.fromY) * e;
  if (t >= 1) snapAnim = null;
}

function loop() {
  tickSnap();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (planeVisible.xy) drawGridPlane(ctx, "xy", camera.state);
  if (planeVisible.xz) drawGridPlane(ctx, "xz", camera.state);
  if (planeVisible.yz) drawGridPlane(ctx, "yz", camera.state);
  drawPlaneIntersections(ctx, camera.state, planeVisible);

  if (objVisible.box)     drawBox(ctx,      150, -70,  150, 140, camera.state);
  if (objVisible.pyramid) drawPyramid(ctx, -150,   0, -150, 130, 170, camera.state);
  if (objVisible.sphere)  drawSphere(ctx,   150, -95, -150,  95, camera.state);

  if (activeScheme === "style2") {
    drawBorderHints(ctx, camera.state.width, camera.state.height, style2.debug.centerHalf, style2.debug.mouseY);
  }
  if (activeScheme === "style3") {
    drawModeHint(ctx, camera.state.height, style3.debug.mode, style3.debug.mouseY, style3.debug.activationTime);
  }

  requestAnimationFrame(loop);
}

loop();
