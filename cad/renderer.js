import { transform, project } from "./math3d.js";
import { GRID_SIZE, GRID_STEP, COLOR_XY, COLOR_XZ, COLOR_YZ } from "./constants.js";

export function drawLine3D(ctx, a, b, state, color = "#aaa") {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;

  a = transform(a, rotX, rotY);
  b = transform(b, rotX, rotY);

  const pa = project(a, zoom, panX, panY, width, height);
  const pb = project(b, zoom, panX, panY, width, height);

  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

const PLANE_CORNERS = {
  xy: [{ x: -1, y: -1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }],
  xz: [{ x: -1, y: 0, z: -1 }, { x: 1, y: 0, z: -1 }, { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }],
  yz: [{ x: 0, y: -1, z: -1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }],
};

export function highlightPlane(ctx, type, state) {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;
  const colorMap = { xy: COLOR_XY, xz: COLOR_XZ, yz: COLOR_YZ };
  const pts = PLANE_CORNERS[type].map(p => {
    const scaled = { x: p.x * GRID_SIZE, y: p.y * GRID_SIZE, z: p.z * GRID_SIZE };
    const t = transform(scaled, rotX, rotY);
    return project(t, zoom, panX, panY, width, height);
  });
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.strokeStyle = colorMap[type];
  ctx.lineWidth = 2;
  ctx.stroke();

  const fill = ctx.createRadialGradient(
    pts.reduce((s,p)=>s+p.x,0)/4, pts.reduce((s,p)=>s+p.y,0)/4, 0,
    pts.reduce((s,p)=>s+p.x,0)/4, pts.reduce((s,p)=>s+p.y,0)/4,
    Math.max(...pts.map(p => Math.hypot(p.x - pts.reduce((s,q)=>s+q.x,0)/4, p.y - pts.reduce((s,q)=>s+q.y,0)/4)))
  );
  fill.addColorStop(0, colorMap[type] + '22');
  fill.addColorStop(1, colorMap[type] + '08');
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawGridPlane(ctx, type, state) {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;
  const S = GRID_SIZE;

  const corners3D = {
    xy: [{ x: -S, y: -S, z: 0 }, { x: S, y: -S, z: 0 }, { x: S, y: S, z: 0 }, { x: -S, y: S, z: 0 }],
    xz: [{ x: -S, y: 0, z: -S }, { x: S, y: 0, z: -S }, { x: S, y: 0, z: S }, { x: -S, y: 0, z: S }],
    yz: [{ x: 0, y: -S, z: -S }, { x: 0, y: S, z: -S }, { x: 0, y: S, z: S }, { x: 0, y: -S, z: S }],
  };

  const colorMap = { xy: COLOR_XY, xz: COLOR_XZ, yz: COLOR_YZ };
  const color = colorMap[type];

  const pts = corners3D[type].map(p => {
    const t = transform(p, rotX, rotY);
    return project(t, zoom, panX, panY, width, height);
  });

  const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
  const radius = Math.max(...pts.map(p => Math.hypot(p.x - cx, p.y - cy)));

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, color + "1a");
  grad.addColorStop(1, color + "04");

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = color + "40";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawPlaneIntersections(ctx, state, visible = { xy: true, xz: true, yz: true }) {
  const S = GRID_SIZE;
  const axes = [
    { a: { x: -S, y: 0, z: 0 }, b: { x: S, y: 0, z: 0 }, c1: COLOR_XY, c2: COLOR_XZ, p1: 'xy', p2: 'xz' },
    { a: { x: 0, y: -S, z: 0 }, b: { x: 0, y: S, z: 0 }, c1: COLOR_XY, c2: COLOR_YZ, p1: 'xy', p2: 'yz' },
    { a: { x: 0, y: 0, z: -S }, b: { x: 0, y: 0, z: S }, c1: COLOR_XZ, c2: COLOR_YZ, p1: 'xz', p2: 'yz' },
  ];

  const { zoom, panX, panY, width, height, rotX, rotY } = state;

  for (const { a, b, c1, c2, p1, p2 } of axes) {
    if (!visible[p1] || !visible[p2]) continue;
    const pa = project(transform(a, rotX, rotY), zoom, panX, panY, width, height);
    const pb = project(transform(b, rotX, rotY), zoom, panX, panY, width, height);

    const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
    grad.addColorStop(0, c1 + "40");
    grad.addColorStop(0.5, "#ffffff40");
    grad.addColorStop(1, c2 + "40");

    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
