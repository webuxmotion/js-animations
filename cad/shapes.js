import { drawLine3D } from "./renderer.js";
import { transform, project } from "./math3d.js";

function shifted(p, cx, cy, cz) { return { x: p.x + cx, y: p.y + cy, z: p.z + cz }; }
function sub(a, b) { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
function cross(a, b) { return { x: a.y*b.z-a.z*b.y, y: a.z*b.x-a.x*b.z, z: a.x*b.y-a.y*b.x }; }
function dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
function norm(v) { const l = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z); return { x: v.x/l, y: v.y/l, z: v.z/l }; }
function hex(color) { return [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)]; }

const LIGHT = norm({ x: 1, y: -2, z: -1 });

function fillFace(ctx, pts3d, state, r, g, b) {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;
  const n = norm(cross(sub(pts3d[1], pts3d[0]), sub(pts3d[2], pts3d[0])));
  const shade = Math.max(0, dot(n, LIGHT)) * 0.6 + 0.15;

  const pts = pts3d.map(p => {
    const t = transform(p, rotX, rotY);
    return project(t, zoom, panX, panY, width, height);
  });

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = `rgba(${r},${g},${b},${(shade * 1.2).toFixed(2)})`;
  ctx.fill();
}

function wireEdges(verts, pairs, ctx, state, color) {
  for (const [i, j] of pairs) drawLine3D(ctx, verts[i], verts[j], state, color);
}

export function drawBox(ctx, cx, cy, cz, size, state, color = "#e8e8e8") {
  const s = size / 2;
  const v = [
    { x: -s, y: -s, z: -s }, { x:  s, y: -s, z: -s },
    { x:  s, y:  s, z: -s }, { x: -s, y:  s, z: -s },
    { x: -s, y: -s, z:  s }, { x:  s, y: -s, z:  s },
    { x:  s, y:  s, z:  s }, { x: -s, y:  s, z:  s },
  ].map(p => shifted(p, cx, cy, cz));

  const [r, g, b] = hex(color);
  fillFace(ctx, [v[0],v[1],v[2],v[3]], state, r, g, b);
  fillFace(ctx, [v[4],v[7],v[6],v[5]], state, r, g, b);
  fillFace(ctx, [v[0],v[4],v[5],v[1]], state, r, g, b);
  fillFace(ctx, [v[3],v[2],v[6],v[7]], state, r, g, b);
  fillFace(ctx, [v[0],v[3],v[7],v[4]], state, r, g, b);
  fillFace(ctx, [v[1],v[5],v[6],v[2]], state, r, g, b);

  wireEdges(v, [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ], ctx, state, color);
}

export function drawPyramid(ctx, cx, cy, cz, base, height, state, color = "#ffcc44", rotZ = 0) {
  const s = base / 2;
  const cos = Math.cos(rotZ), sin = Math.sin(rotZ);
  const rz = p => ({ x: p.x*cos - p.z*sin, y: p.y, z: p.x*sin + p.z*cos });
  const v = [
    { x: -s, y: 0, z: -s }, { x: s, y: 0, z: -s },
    { x:  s, y: 0, z:  s }, { x:-s, y: 0, z:  s },
    { x:  0, y: -height, z: 0 },
  ].map(p => shifted(rz(p), cx, cy, cz));

  const [r, g, b] = hex(color);
  fillFace(ctx, [v[0],v[1],v[4]], state, r, g, b);
  fillFace(ctx, [v[1],v[2],v[4]], state, r, g, b);
  fillFace(ctx, [v[2],v[3],v[4]], state, r, g, b);
  fillFace(ctx, [v[3],v[0],v[4]], state, r, g, b);
  fillFace(ctx, [v[0],v[3],v[2],v[1]], state, r, g, b);

  wireEdges(v, [
    [0,1],[1,2],[2,3],[3,0],
    [0,4],[1,4],[2,4],[3,4],
  ], ctx, state, color);
}

export function drawSphere(ctx, cx, cy, cz, radius, state, color = "#44ccff") {
  const lat = 10, lon = 14;
  const [r, g, b] = hex(color);

  const grid = [];
  for (let i = 0; i <= lat; i++) {
    const phi = (i / lat) * Math.PI;
    const row = [];
    for (let j = 0; j <= lon; j++) {
      const theta = (j / lon) * Math.PI * 2;
      row.push(shifted({
        x: Math.sin(phi) * Math.cos(theta) * radius,
        y: Math.cos(phi) * radius,
        z: Math.sin(phi) * Math.sin(theta) * radius,
      }, cx, cy, cz));
    }
    grid.push(row);
  }

  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const v0 = grid[i][j], v1 = grid[i][j+1];
      const v2 = grid[i+1][j+1], v3 = grid[i+1][j];
      if (i === 0) fillFace(ctx, [v0, v1, v2], state, r, g, b);
      else if (i === lat - 1) fillFace(ctx, [v0, v2, v3], state, r, g, b);
      else fillFace(ctx, [v0, v1, v2, v3], state, r, g, b);
    }
  }

  for (let i = 1; i < lat; i++)
    for (let j = 0; j < lon; j++)
      drawLine3D(ctx, grid[i][j], grid[i][j+1], state, color + "55");
  for (let j = 0; j < lon; j++)
    for (let i = 0; i < lat; i++)
      drawLine3D(ctx, grid[i][j], grid[i+1][j], state, color + "55");
}

function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

function toScreen2D(pts3d, state) {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;
  return pts3d.map(p => project(transform(p, rotX, rotY), zoom, panX, panY, width, height));
}

export function hitTestBox(mx, my, cx, cy, cz, size, state) {
  const s = size / 2;
  const v = [
    {x:-s,y:-s,z:-s},{x:s,y:-s,z:-s},{x:s,y:s,z:-s},{x:-s,y:s,z:-s},
    {x:-s,y:-s,z:s },{x:s,y:-s,z:s },{x:s,y:s,z:s },{x:-s,y:s,z:s },
  ].map(p => shifted(p, cx, cy, cz));
  const faces = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]];
  return faces.some(f => pointInPolygon(mx, my, toScreen2D(f.map(i => v[i]), state)));
}

export function hitTestPyramid(mx, my, cx, cy, cz, base, height, state) {
  const s = base / 2;
  const v = [
    {x:-s,y:0,z:-s},{x:s,y:0,z:-s},{x:s,y:0,z:s},{x:-s,y:0,z:s},
    {x:0,y:-height,z:0},
  ].map(p => shifted(p, cx, cy, cz));
  const faces = [[0,1,4],[1,2,4],[2,3,4],[3,0,4],[0,3,2,1]];
  return faces.some(f => pointInPolygon(mx, my, toScreen2D(f.map(i => v[i]), state)));
}

export function hitTestSphere(mx, my, cx, cy, cz, radius, state) {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;
  const sc = project(transform({x:cx,y:cy,z:cz}, rotX, rotY), zoom, panX, panY, width, height);
  return Math.hypot(mx - sc.x, my - sc.y) < radius * zoom;
}

const HL = '#ffffffcc';

export function highlightBox(ctx, cx, cy, cz, size, state) {
  const s = size / 2;
  const v = [
    { x:-s,y:-s,z:-s },{ x:s,y:-s,z:-s },{ x:s,y:s,z:-s },{ x:-s,y:s,z:-s },
    { x:-s,y:-s,z:s  },{ x:s,y:-s,z:s  },{ x:s,y:s,z:s  },{ x:-s,y:s,z:s  },
  ].map(p => shifted(p, cx, cy, cz));
  wireEdges(v, [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]], ctx, state, HL);
}

export function highlightPyramid(ctx, cx, cy, cz, base, height, state) {
  const s = base / 2;
  const v = [
    { x:-s,y:0,z:-s },{ x:s,y:0,z:-s },{ x:s,y:0,z:s },{ x:-s,y:0,z:s },
    { x:0,y:-height,z:0 },
  ].map(p => shifted(p, cx, cy, cz));
  wireEdges(v, [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]], ctx, state, HL);
}

export function highlightSphere(ctx, cx, cy, cz, radius, state) {
  const lat = 6, lon = 10;
  const grid = [];
  for (let i = 0; i <= lat; i++) {
    const phi = (i / lat) * Math.PI;
    const row = [];
    for (let j = 0; j <= lon; j++) {
      const theta = (j / lon) * Math.PI * 2;
      row.push(shifted({ x:Math.sin(phi)*Math.cos(theta)*radius, y:Math.cos(phi)*radius, z:Math.sin(phi)*Math.sin(theta)*radius }, cx, cy, cz));
    }
    grid.push(row);
  }
  for (let i = 1; i < lat; i++)
    for (let j = 0; j < lon; j++) drawLine3D(ctx, grid[i][j], grid[i][j+1], state, HL);
  for (let j = 0; j < lon; j++)
    for (let i = 0; i < lat; i++) drawLine3D(ctx, grid[i][j], grid[i+1][j], state, HL);
}
