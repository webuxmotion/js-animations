import { createMouseTracker } from "../mouse.js";
import { createCanvas } from "../canvas.js";
import { createCamera } from "./camera.js";
import { drawGridPlane, drawPlaneIntersections, drawLine3D, highlightPlane, hitTestPlane } from "./renderer.js";
import { drawBox, drawPyramid, drawSphere, highlightBox, highlightPyramid, highlightSphere, hitTestBox, hitTestPyramid, hitTestSphere } from "./shapes.js";
import * as trackpad from "./controls/trackpad.js";
import * as style2 from "./controls/style2.js";
import * as style3 from "./controls/style3.js";
import { drawBorderHints, drawModeHint } from "./border-hints.js";
import { createSketch } from "./sketch.js";
import { downloadSTL, extrusionToSTL, boxToSTL, pyramidToSTL, sphereToSTL } from "./export.js";
import { createExtrude } from "./extrude.js";

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

const DOWNLOAD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

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

const OBJ_STL = {
  box:     () => boxToSTL(150, -70, 150, 140),
  pyramid: () => pyramidToSTL(-150, 0, -150, 130, 170),
  sphere:  () => sphereToSTL(150, -95, -150, 95),
};

document.querySelectorAll('.obj-vis').forEach(btn => {
  btn.innerHTML = EYE_OPEN;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const o = btn.dataset.obj;
    objVisible[o] = !objVisible[o];
    btn.innerHTML = objVisible[o] ? EYE_OPEN : EYE_SHUT;
    btn.classList.toggle('hidden', !objVisible[o]);
  });
  const li = btn.closest('li');
  if (li) {
    const o = btn.dataset.obj;
    addDownloadBtn(li, () => downloadSTL(OBJ_STL[o](), `${o}.stl`));
    withHover(li, 'object', o);
  }
});

const PLANE_COLOR = { xy: '#4a90e2', xz: '#e24a4a', yz: '#4ae28a' };
const PLANE_NAME  = { xy: 'Front',   xz: 'Top',     yz: 'Right'   };

const sketchList  = document.getElementById('sketch-list');
const extrudeList = document.getElementById('extrude-list');

let treeHovered = null; // { type, data }

function withHover(el, type, data) {
  el.addEventListener('mouseenter', () => { treeHovered = { type, data }; });
  el.addEventListener('mouseleave', () => { treeHovered = null; });
}

function addDownloadBtn(li, onDownload) {
  const btn = document.createElement('button');
  btn.className = 'obj-vis';
  btn.innerHTML = DOWNLOAD_ICON;
  btn.title = 'Export STL';
  btn.addEventListener('click', e => { e.stopPropagation(); onDownload(); });
  li.appendChild(btn);
}

function makeTreeItem(label, color, visible, onToggle) {
  const li  = document.createElement('li');
  li.className = 'plane-item';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = color;
  const name = document.createElement('span');
  name.textContent = label;
  const btn = document.createElement('button');
  btn.className = 'obj-vis' + (visible ? '' : ' hidden');
  btn.innerHTML = visible ? EYE_OPEN : EYE_SHUT;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    onToggle(btn);
  });
  li.append(dot, name, btn);
  return li;
}

function refreshTree() {
  sketchList.innerHTML = '';
  sketch.paths.forEach((path, i) => {
    const color = PLANE_COLOR[path.plane];
    const label = `Sketch ${i + 1} · ${PLANE_NAME[path.plane]}`;
    const li = makeTreeItem(label, color, path.visible, btn => {
      const next = !path.visible;
      sketch.setPathVisible(i, next);
      btn.innerHTML = next ? EYE_OPEN : EYE_SHUT;
      btn.classList.toggle('hidden', !next);
    });
    li.addEventListener('dblclick', () => {
      if (extrude.active) { extrude.setActive(false); updateExtrudeUI(); }
      sketch.startEdit(path);
      sketchBtn.classList.remove('active');
      sketchBtn.textContent = 'Sketch';
      sketchHint.textContent = 'Drag points to edit · Esc to finish';
    });
    withHover(li, 'sketch', path);
    sketchList.appendChild(li);
  });

  extrudeList.innerHTML = '';
  extrude.extrusions.forEach((ex, i) => {
    const color = PLANE_COLOR[ex.path.plane];
    const label = `Extrusion ${i + 1} · ${PLANE_NAME[ex.path.plane]}`;
    const li = makeTreeItem(label, color, ex.visible, btn => {
      const next = !ex.visible;
      extrude.setExtrusionVisible(i, next);
      btn.innerHTML = next ? EYE_OPEN : EYE_SHUT;
      btn.classList.toggle('hidden', !next);
    });
    li.addEventListener('dblclick', () => {
      if (sketch.active) { sketch.setActive(false); updateSketchUI(); }
      extrude.selectForEdit(ex);
      extrudeBtn.classList.add('active');
      extrudeBtn.textContent = 'Stop';
      sketchHint.textContent = 'Drag on canvas to adjust depth · click to confirm';
    });
    addDownloadBtn(li, () => downloadSTL(extrusionToSTL(ex), `extrusion-${i+1}.stl`));
    withHover(li, 'extrusion', ex);
    extrudeList.appendChild(li);
  });
}

const sketch = createSketch();
const sketchBtn = document.getElementById("sketch");
const sketchHint = document.getElementById("sketch-hint");
const sketchToolbar = document.getElementById("sketch-toolbar");

const TOOL_HINTS = {
  polyline:   ["Click to place first point", "Click to add points · Esc to cancel"],
  line:       ["Click to place start point", "Click to place end point"],
  centerLine: ["Click to place center point", "Click to set length"],
  circle:     ["Click to place center", "Click to set radius"],
  rect:       ["Click first corner", "Click opposite corner"],
  centerRect: ["Click to place center", "Click to set size"],
};

function updateSketchUI() {
  refreshTree();
  sketchBtn.classList.toggle("active", sketch.active);
  sketchBtn.textContent = sketch.active ? "Stop" : "Sketch";

  sketchToolbar.style.display = sketch.active ? 'flex' : 'none';
  sketchToolbar.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === sketch.toolMode);
  });

  document.querySelectorAll('.plane-item[data-plane]').forEach(el => {
    el.classList.toggle('sketch-target', sketch.active && el.dataset.plane === sketch.plane);
  });

  if (sketch.editingPath) {
    sketchHint.textContent = 'Drag points to edit · Esc to finish';
    return;
  }
  if (!sketch.active) {
    sketchHint.textContent = "";
  } else if (!sketch.plane) {
    sketchHint.textContent = "Click a plane to start";
  } else {
    const hints = TOOL_HINTS[sketch.toolMode] ?? TOOL_HINTS.polyline;
    if (sketch.toolMode === 'polyline') {
      if (!sketch.hasPath)       sketchHint.textContent = hints[0];
      else if (sketch.canClose)  sketchHint.textContent = "Click · hover start to close · Esc to cancel";
      else                       sketchHint.textContent = hints[1];
    } else {
      sketchHint.textContent = sketch.hasFirstPt ? hints[1] : hints[0];
    }
  }
}

sketchToolbar.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sketch.setTool(btn.dataset.tool);
    updateSketchUI();
  });
});

sketchBtn.addEventListener("click", () => {
  if (!sketch.active && extrude.active) { extrude.setActive(false); updateExtrudeUI(); }
  sketch.setActive(!sketch.active);
  updateSketchUI();
});

sketch.bind(canvasEl, camera.state, updateSketchUI);

const extrude = createExtrude(sketch);
const extrudeBtn = document.getElementById("extrude");

function updateExtrudeUI() {
  refreshTree();
  extrudeBtn.classList.toggle("active", extrude.active);
  extrudeBtn.textContent = extrude.active ? "Stop" : "Extrude";
  if (extrude.active)
    sketchHint.textContent = "Click a closed sketch and drag up/down to extrude";
  else if (!sketch.active)
    sketchHint.textContent = "";
}

extrudeBtn.addEventListener("click", () => {
  const entering = !extrude.active;
  if (entering && sketch.active) { sketch.setActive(false); updateSketchUI(); }
  extrude.setActive(entering);
  updateExtrudeUI();
});

extrude.bind(canvasEl, camera.state, updateExtrudeUI);

document.querySelectorAll('.plane-item[data-plane]').forEach(el => {
  el.addEventListener('click', () => {
    if (!sketch.active) return;
    sketch.selectPlane(el.dataset.plane);
    updateSketchUI();
  });
  withHover(el, 'plane', el.dataset.plane);
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

function getCanvasPos(e) {
  const r = canvasEl.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvasEl.addEventListener('click', (e) => {
  if (!sketch.active || sketch.plane) return;
  const { x, y } = getCanvasPos(e);
  const plane = hitTestPlane(x, y, camera.state, planeVisible);
  if (plane) {
    sketch.selectPlane(plane);
    updateSketchUI();
  }
});

canvasEl.addEventListener('dblclick', (e) => {
  const { x, y } = getCanvasPos(e);
  const plane = hitTestPlane(x, y, camera.state, planeVisible);
  if (plane) {
    document.querySelectorAll('.plane-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll(`.plane-item[data-plane="${plane}"]`).forEach(el => el.classList.add('active'));
    snapToPlane(plane);
  }
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

  sketch.draw(ctx, camera.state);
  extrude.draw(ctx, camera.state);

  let canvasHover = null;
  if (!treeHovered) {
    const s = camera.state;
    if      (objVisible.box     && hitTestBox(mouse.x, mouse.y, 150, -70, 150, 140, s))       canvasHover = { type: 'object', data: 'box' };
    else if (objVisible.pyramid && hitTestPyramid(mouse.x, mouse.y, -150, 0, -150, 130, 170, s)) canvasHover = { type: 'object', data: 'pyramid' };
    else if (objVisible.sphere  && hitTestSphere(mouse.x, mouse.y, 150, -95, -150, 95, s))    canvasHover = { type: 'object', data: 'sphere' };
    if (!canvasHover) {
      const plane = hitTestPlane(mouse.x, mouse.y, s, planeVisible);
      if (plane) canvasHover = { type: 'plane', data: plane };
    }
  }
  if (canvasHover) {
    const s = camera.state;
    if (canvasHover.type === 'plane') {
      highlightPlane(ctx, canvasHover.data, s);
    } else {
      if (canvasHover.data === 'box')     highlightBox(ctx, 150, -70, 150, 140, s);
      if (canvasHover.data === 'pyramid') highlightPyramid(ctx, -150, 0, -150, 130, 170, s);
      if (canvasHover.data === 'sphere')  highlightSphere(ctx, 150, -95, -150, 95, s);
    }
  }

  if (treeHovered) {
    const s = camera.state;
    const { type, data } = treeHovered;
    if (type === 'plane') {
      highlightPlane(ctx, data, s);
    } else if (type === 'sketch') {
      const c = '#ffffffcc';
      for (let i = 0; i < data.points.length - 1; i++)
        drawLine3D(ctx, data.points[i], data.points[i+1], s, c);
      if (data.closed)
        drawLine3D(ctx, data.points[data.points.length-1], data.points[0], s, c);
    } else if (type === 'extrusion') {
      extrude.drawHighlight(ctx, s, data);
    } else if (type === 'object') {
      if (data === 'box')     highlightBox(ctx, 150, -70, 150, 140, s);
      if (data === 'pyramid') highlightPyramid(ctx, -150, 0, -150, 130, 170, s);
      if (data === 'sphere')  highlightSphere(ctx, 150, -95, -150, 95, s);
    }
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
