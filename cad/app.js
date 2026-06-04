import { createMouseTracker } from "../mouse.js";
import { createCanvas } from "../canvas.js";

// ----------------------
// SETUP
// ----------------------
const canvasEl = document.querySelector("canvas");

let gestureMode = null; // "rotate" | "zoom" | "pan"
let gestureTimeout = null;

canvasEl.style.width = "100vw";
canvasEl.style.height = "100vh";

const canvas = createCanvas(canvasEl);
const ctx = canvas.ctx;
const mouse = createMouseTracker(canvasEl);

canvas.resize();
window.addEventListener("resize", canvas.resize);

// ----------------------
// CAMERA STATE
// ----------------------
let rotX = 0.6;
let rotY = 0.8;

let zoom = 1;

// PAN
let panX = 0;
let panY = 0;

// ----------------------
// DRAG ROTATION
// ----------------------
let dragging = false;
let last = { x: 0, y: 0 };

canvasEl.addEventListener("mousedown", () => {
  dragging = true;
  last.x = mouse.x;
  last.y = mouse.y;
});

canvasEl.addEventListener("mouseup", () => {
  dragging = false;
});

canvasEl.addEventListener("mousemove", () => {
  if (!dragging) return;

  const dx = mouse.x - last.x;
  const dy = mouse.y - last.y;

  rotY += dx * 0.005;
  rotX += dy * 0.005;

  last.x = mouse.x;
  last.y = mouse.y;
});

// ----------------------
// WHEEL + TOUCHPAD HANDLING (CAD STYLE)
// ----------------------
canvasEl.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    // -----------------------------------------------------
    // RESET MODE AFTER INACTIVITY
    // -----------------------------------------------------
    if (gestureTimeout) clearTimeout(gestureTimeout);

    gestureTimeout = setTimeout(() => {
      gestureMode = null;
    }, 120);

    // -----------------------------------------------------
    // MODE DETECTION (ONLY ON FIRST EVENT)
    // -----------------------------------------------------
    if (!gestureMode) {
      if (e.ctrlKey) {
        gestureMode = "zoom";
      } else if (e.shiftKey) {
        gestureMode = "pan";
      } else if (absY > absX * 3 && absY > 25) {
        // ONLY strong vertical movement = pinch zoom
        gestureMode = "zoom";
      } else {
        gestureMode = "rotate";
      }
    }

    // -----------------------------------------------------
    // EXECUTE MODE
    // -----------------------------------------------------
    const rotateSpeed = 0.002;
    const panSpeed = 1;
    const zoomSpeed = 0.01;

    if (gestureMode === "zoom") {
      const delta = Math.max(-50, Math.min(50, e.deltaY));
      const zoomFactor = Math.exp(-delta * zoomSpeed);

      zoom *= zoomFactor;
      zoom = Math.max(0.05, Math.min(20, zoom));
      return;
    }

    if (gestureMode === "pan") {
      panX -= e.deltaX * panSpeed;
      panY -= e.deltaY * panSpeed;
      return;
    }

    // rotate
    rotY -= e.deltaX * rotateSpeed;
    rotX -= e.deltaY * rotateSpeed;
  },
  { passive: false }
);

// ----------------------
// ROTATION
// ----------------------
function rotateX(p, a) {
  return {
    x: p.x,
    y: p.y * Math.cos(a) - p.z * Math.sin(a),
    z: p.y * Math.sin(a) + p.z * Math.cos(a)
  };
}

function rotateY(p, a) {
  return {
    x: p.x * Math.cos(a) - p.z * Math.sin(a),
    y: p.y,
    z: p.x * Math.sin(a) + p.z * Math.cos(a)
  };
}

function transform(p) {
  p = rotateY(p, rotY);
  p = rotateX(p, rotX);
  return p;
}

// ----------------------
// PROJECTION (ZOOM + PAN)
// ----------------------
function project(p) {
  const rect = canvasEl.getBoundingClientRect();

  return {
    x: p.x * zoom + rect.width / 2 + panX,
    y: p.y * zoom + rect.height / 2 + panY
  };
}

// ----------------------
// DRAW LINE
// ----------------------
function drawLine3D(a, b, color = "#aaa") {
  a = transform(a);
  b = transform(b);

  const pa = project(a);
  const pb = project(b);

  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ----------------------
// GRID
// ----------------------
function drawGridPlane(type) {
  const size = 400;
  const step = 50;

  for (let i = -size; i <= size; i += step) {
    if (type === "xy") {
      drawLine3D({ x: i, y: -size, z: 0 }, { x: i, y: size, z: 0 }, "#4a90e2");
      drawLine3D({ x: -size, y: i, z: 0 }, { x: size, y: i, z: 0 }, "#4a90e2");
    }

    if (type === "xz") {
      drawLine3D({ x: i, y: 0, z: -size }, { x: i, y: 0, z: size }, "#e24a4a");
      drawLine3D({ x: -size, y: 0, z: i }, { x: size, y: 0, z: i }, "#e24a4a");
    }

    if (type === "yz") {
      drawLine3D({ x: 0, y: i, z: -size }, { x: 0, y: i, z: size }, "#4ae28a");
      drawLine3D({ x: 0, y: -size, z: i }, { x: 0, y: size, z: i }, "#4ae28a");
    }
  }
}

// ----------------------
// VECTOR FONT
// ----------------------
const FONT = {
  F: [[[0,0],[0,10]], [[0,10],[6,10]], [[0,5],[4,5]]],
  R: [[[0,0],[0,10]], [[0,10],[6,10]], [[6,10],[6,5]], [[6,5],[0,5]], [[0,5],[6,0]]],
  O: [[[0,0],[6,0]], [[6,0],[6,10]], [[6,10],[0,10]], [[0,10],[0,0]]],
  N: [[[0,0],[0,10]], [[0,10],[6,0]], [[6,0],[6,10]]],
  T: [[[0,10],[6,10]], [[3,10],[3,0]]],
  P: [[[0,0],[0,10]], [[0,10],[6,10]], [[6,10],[6,5]], [[6,5],[0,5]]],
  L: [[[0,10],[0,0]], [[0,0],[6,0]]]
};

function buildText(word, origin, scale = 10, color = "#000") {
  const letters = word.split("");
  const lines = [];
  let offset = 0;

  for (const ch of letters) {
    const glyph = FONT[ch];
    if (!glyph) continue;

    for (const seg of glyph) {
      lines.push({
        a: {
          x: origin.x + (seg[0][0] + offset) * scale,
          y: origin.y + seg[0][1] * scale,
          z: origin.z
        },
        b: {
          x: origin.x + (seg[1][0] + offset) * scale,
          y: origin.y + seg[1][1] * scale,
          z: origin.z
        },
        color
      });
    }

    offset += 8;
  }

  return lines;
}

// ----------------------
// LABELS
// ----------------------
const labels = [
  ...buildText("TOP",   { x: -100, y: 0, z: 0 }, 10, "#4a90e2"),
  ...buildText("FRONT", { x: -120, y: 0, z: -120 }, 10, "#e24a4a"),
  ...buildText("RIGHT", { x: 120, y: 0, z: 0 }, 10, "#4ae28a")
];

// ----------------------
// LOOP
// ----------------------
function loop() {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  drawGridPlane("xy");
  drawGridPlane("xz");
  drawGridPlane("yz");

  for (const l of labels) {
    drawLine3D(l.a, l.b, l.color);
  }

  requestAnimationFrame(loop);
}

loop();