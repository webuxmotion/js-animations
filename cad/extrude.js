import { transform, project } from "./math3d.js";
import { drawLine3D } from "./renderer.js";

const PLANE_COLOR  = { xy: '#4a90e2', xz: '#e24a4a', yz: '#4ae28a' };
const PLANE_NORMAL = { xy: { x:0,y:0,z:1 }, xz: { x:0,y:1,z:0 }, yz: { x:1,y:0,z:0 } };

// ── shared geometry helpers ───────────────────────────────────────
function sub(a, b) { return { x:a.x-b.x, y:a.y-b.y, z:a.z-b.z }; }
function cross(a, b) { return { x:a.y*b.z-a.z*b.y, y:a.z*b.x-a.x*b.z, z:a.x*b.y-a.y*b.x }; }
function dot(a, b)  { return a.x*b.x+a.y*b.y+a.z*b.z; }
function norm(v)    { const l=Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z); return {x:v.x/l,y:v.y/l,z:v.z/l}; }
function hex(c)     { return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }

const LIGHT = norm({ x:1, y:-2, z:-1 });

function toScreen(pt, state) {
  const t = transform(pt, state.rotX, state.rotY);
  return project(t, state.zoom, state.panX, state.panY, state.width, state.height);
}

function fillFace(ctx, pts3d, state, r, g, b) {
  if (pts3d.length < 3) return;
  const n     = norm(cross(sub(pts3d[1], pts3d[0]), sub(pts3d[2], pts3d[0])));
  const shade = Math.max(0, dot(n, LIGHT)) * 0.6 + 0.15;
  const pts   = pts3d.map(p => {
    const t = transform(p, state.rotX, state.rotY);
    return project(t, state.zoom, state.panX, state.panY, state.width, state.height);
  });
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = `rgba(${r},${g},${b},${(shade * 1.1).toFixed(2)})`;
  ctx.fill();
}

// ── hit testing ───────────────────────────────────────────────────
function pointInPolygon(px, py, screenPts) {
  let inside = false;
  for (let i = 0, j = screenPts.length - 1; i < screenPts.length; j = i++) {
    const { x: xi, y: yi } = screenPts[i];
    const { x: xj, y: yj } = screenPts[j];
    if (((yi > py) !== (yj > py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi))
      inside = !inside;
  }
  return inside;
}

// ── main factory ──────────────────────────────────────────────────
export function createExtrude(sketch) {
  let active      = false;
  let extrusions  = [];   // { path, depth }
  let hovered     = null; // path being hovered
  let drag        = null; // { extrusion, startY, startDepth }
  let editTarget  = null; // extrusion pre-selected from tree for next drag

  let _canvas = null, _state = null, _onChange = null;

  function getPos(e) {
    const r = _canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function closedPaths() {
    return sketch.paths.filter(p => p.closed && p.points.length >= 3);
  }

  function polygonArea(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
      a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
    return Math.abs(a) / 2;
  }

  function pathAt(pos) {
    let best = null, bestArea = Infinity;
    for (const path of closedPaths()) {
      const pts = path.points.map(p => toScreen(p, _state));
      if (!pointInPolygon(pos.x, pos.y, pts)) continue;
      const area = polygonArea(pts);
      if (area < bestArea) { best = path; bestArea = area; }
    }
    return best;
  }

  function extrusionOf(path) {
    return extrusions.find(e => e.path === path) ?? null;
  }

  function onMouseDown(e) {
    if (!active) return;
    const pos = getPos(e);

    let ex = editTarget;
    if (ex) {
      editTarget = null;
    } else {
      const path = pathAt(pos);
      if (!path) return;
      ex = extrusionOf(path);
      if (!ex) { ex = { path, depth: 0, visible: true }; extrusions.push(ex); }
    }

    e.stopImmediatePropagation();
    drag = { extrusion: ex, startY: pos.y, startDepth: ex.depth };
    _canvas.style.cursor = 'ns-resize';
  }

  function onMouseMove(e) {
    if (!active) return;
    const pos = getPos(e);

    if (drag) {
      drag.extrusion.depth = drag.startDepth + (pos.y - drag.startY) / _state.zoom;
      return;
    }

    hovered = pathAt(pos);
    _canvas.style.cursor = hovered ? 'pointer' : '';
  }

  function onMouseUp() {
    if (!drag) return;
    // Remove near-zero extrusions (accidental click)
    if (Math.abs(drag.extrusion.depth) < 0.5)
      extrusions = extrusions.filter(e => e !== drag.extrusion);
    drag = null;
    _canvas.style.cursor = hovered ? 'pointer' : '';
    _onChange?.();
  }

  function setActive(val) {
    active = val;
    hovered    = null;
    drag       = null;
    editTarget = null;
    if (_canvas) _canvas.style.cursor = '';
    _onChange?.();
  }

  function selectForEdit(ex) {
    active     = true;
    editTarget = ex;
    if (_canvas) _canvas.style.cursor = 'ns-resize';
    _onChange?.();
  }

  function bind(canvasEl, state, onChange) {
    _canvas = canvasEl; _state = state; _onChange = onChange;
    // capture: true so we fire before camera controls
    canvasEl.addEventListener('mousedown', onMouseDown, { capture: true });
    canvasEl.addEventListener('mousemove', onMouseMove);
    canvasEl.addEventListener('mouseup',   onMouseUp);
  }

  function drawSolid(ctx, state, ex) {
    const { path, depth } = ex;
    const n   = PLANE_NORMAL[path.plane];
    const [r, g, b] = hex(PLANE_COLOR[path.plane]);
    const pts = path.points;
    const N   = pts.length;

    const offset = p => ({ x: p.x + n.x*depth, y: p.y + n.y*depth, z: p.z + n.z*depth });
    const bot = pts;
    const top = pts.map(offset);

    // Faces
    fillFace(ctx, [...bot].reverse(), state, r, g, b);
    fillFace(ctx, top,                state, r, g, b);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      fillFace(ctx, [bot[i], bot[j], top[j], top[i]], state, r, g, b);
    }

    // Edges
    const ec = PLANE_COLOR[path.plane] + 'aa';
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      drawLine3D(ctx, bot[i], bot[j], state, ec);
      drawLine3D(ctx, top[i], top[j], state, ec);
      drawLine3D(ctx, bot[i], top[i], state, ec);
    }
  }

  function draw(ctx, state) {
    for (const ex of extrusions) {
      if (ex.visible && Math.abs(ex.depth) > 0.01) drawSolid(ctx, state, ex);
    }

    // Live preview while dragging
    if (drag && Math.abs(drag.extrusion.depth) > 0.01)
      drawSolid(ctx, state, drag.extrusion);

    // Hover highlight
    if (active && hovered && !drag) {
      const pts = hovered.points.map(p => toScreen(p, state));
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.strokeStyle = PLANE_COLOR[hovered.plane] + 'cc';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Edit-target highlight — pulsing outline to show "ready to drag"
    if (active && editTarget && !drag) {
      const pts = editTarget.path.points.map(p => toScreen(p, state));
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.strokeStyle = PLANE_COLOR[editTarget.path.plane];
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawHighlight(ctx, state, ex) {
    const { path, depth } = ex;
    const n   = PLANE_NORMAL[path.plane];
    const bot = path.points;
    const top = bot.map(p => ({ x:p.x+n.x*depth, y:p.y+n.y*depth, z:p.z+n.z*depth }));
    const N   = bot.length;
    const HL  = '#ffffffcc';
    for (let i = 0; i < N; i++) {
      const j = (i+1) % N;
      drawLine3D(ctx, bot[i], bot[j], state, HL);
      drawLine3D(ctx, top[i], top[j], state, HL);
      drawLine3D(ctx, bot[i], top[i], state, HL);
    }
  }

  return {
    bind, draw, drawHighlight, setActive, selectForEdit,
    get active()      { return active; },
    get isDragging()  { return !!drag; },
    get extrusions()  { return extrusions; },
    setExtrusionVisible(idx, val) { if (extrusions[idx]) extrusions[idx].visible = val; },
  };
}
