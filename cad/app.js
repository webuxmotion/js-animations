import { createMouseTracker } from "../mouse.js";
import { createCanvas } from "../canvas.js";

// ----------------------
// SETUP
// ----------------------
const canvasEl = document.querySelector("canvas");

canvasEl.style.width = "100vw";
canvasEl.style.height = "100vh";

const canvas = createCanvas(canvasEl);
const ctx = canvas.ctx;
const mouse = createMouseTracker(canvasEl);

canvas.resize();
window.addEventListener("resize", canvas.resize);

// ----------------------
// CAMERA (isometric angle)
// ----------------------
let rotX = 0.6;
let rotY = 0.8;

// drag rotation
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

canvasEl.addEventListener("wheel", (e) => {
  e.preventDefault();

  // trackpad scroll sensitivity
  const speed = 0.002;

  rotY -= e.deltaX * speed;
  rotX -= e.deltaY * speed;
}, { passive: false });

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

// ----------------------
// ISOMETRIC PROJECTION (NO PERSPECTIVE)
// ----------------------
function project(p) {
  const rect = canvasEl.getBoundingClientRect();

  return {
    x: p.x + rect.width / 2,
    y: p.y + rect.height / 2
  };
}

// ----------------------
// CAMERA SPACE
// ----------------------
function transform(p) {
  p = rotateY(p, rotY);
  p = rotateX(p, rotX);
  return p;
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
      drawLine3D(
        { x: i, y: -size, z: 0 },
        { x: i, y: size, z: 0 },
        "#4a90e2"
      );

      drawLine3D(
        { x: -size, y: i, z: 0 },
        { x: size, y: i, z: 0 },
        "#4a90e2"
      );
    }

    if (type === "xz") {
      drawLine3D(
        { x: i, y: 0, z: -size },
        { x: i, y: 0, z: size },
        "#e24a4a"
      );

      drawLine3D(
        { x: -size, y: 0, z: i },
        { x: size, y: 0, z: i },
        "#e24a4a"
      );
    }

    if (type === "yz") {
      drawLine3D(
        { x: 0, y: i, z: -size },
        { x: 0, y: i, z: size },
        "#4ae28a"
      );

      drawLine3D(
        { x: 0, y: -size, z: i },
        { x: 0, y: size, z: i },
        "#4ae28a"
      );
    }
  }
}

// ----------------------
// LOOP
// ----------------------
function loop() {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  drawGridPlane("xy");
  drawGridPlane("xz");
  drawGridPlane("yz");

  requestAnimationFrame(loop);
}

loop();