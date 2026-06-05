import { drawLine3D } from "./renderer.js";
import { transform, project } from "./math3d.js";

const PLANE_COLOR = { xy: '#4a90e2', xz: '#e24a4a', yz: '#4ae28a' };
const SNAP_PX = 14; // screen-space pixels to snap-to-close

function unproject(sx, sy, state, plane) {
  const { zoom, panX, panY, width, height, rotX, rotY } = state;
  const cx = (sx - width / 2 - panX) / zoom;
  const cy = (sy - height / 2 - panY) / zoom;
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

  let t;
  if (plane === 'xy') {
    const d = cosX * cosY;
    if (Math.abs(d) < 1e-6) return null;
    t = (cx * sinY + cy * sinX * cosY) / d;
  } else if (plane === 'xz') {
    if (Math.abs(sinX) < 1e-6) return null;
    t = -cy * cosX / sinX;
  } else {
    const d = cosX * sinY;
    if (Math.abs(d) < 1e-6) return null;
    t = (-cx * cosY + cy * sinX * sinY) / d;
  }

  return {
    x:  cx * cosY  - cy * sinX * sinY + t * cosX * sinY,
    y:  cy * cosX  + t * sinX,
    z: -cx * sinY  - cy * sinX * cosY + t * cosX * cosY,
  };
}

function toScreen(pt, state) {
  const t = transform(pt, state.rotX, state.rotY);
  return project(t, state.zoom, state.panX, state.panY, state.width, state.height);
}

export function createSketch() {
  let active = false;
  let plane  = null;
  let paths  = [];       // { plane, points[], closed }
  let activePath = null; // { plane, points[] } — in-progress
  let previewEnd = null;
  let snapResult = null; // { type, pt }
  let mouseDownPos = null;

  // Edit mode
  let editingPath    = null;
  let editHoveredIdx = -1;
  let editDrag       = null; // { idx }

  let _canvas = null, _state = null, _onChange = null;

  function getPos(e) {
    const r = _canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function nearestPointIdx(pos, points) {
    for (let i = 0; i < points.length; i++) {
      const s = toScreen(points[i], _state);
      if (Math.hypot(pos.x - s.x, pos.y - s.y) < SNAP_PX) return i;
    }
    return -1;
  }

  function startEdit(path) {
    editingPath    = path;
    editHoveredIdx = -1;
    editDrag       = null;
    active         = false;
    if (_canvas) _canvas.style.cursor = 'default';
    _onChange?.();
  }

  function stopEdit() {
    editingPath    = null;
    editHoveredIdx = -1;
    editDrag       = null;
    if (_canvas) _canvas.style.cursor = '';
    _onChange?.();
  }

  // Capture-phase handler — intercepts mousedown before camera when editing
  function onMouseDownCapture(e) {
    if (!editingPath) return;
    const pos = getPos(e);
    const idx = nearestPointIdx(pos, editingPath.points);
    if (idx >= 0) {
      editDrag = { idx };
      e.stopImmediatePropagation();
    }
  }

  // Returns { type: 'close'|'point', pt } or null
  function findSnap(mousePos) {
    // Snap-to-close first (highest priority)
    if (activePath && activePath.points.length >= 2) {
      const s = toScreen(activePath.points[0], _state);
      if (Math.hypot(mousePos.x - s.x, mousePos.y - s.y) < SNAP_PX)
        return { type: 'close', pt: activePath.points[0] };
    }
    // Snap to any existing point on this plane
    const candidates = [
      ...(activePath ? activePath.points.slice(1) : []),
      ...paths.filter(p => p.plane === plane).flatMap(p => p.points),
    ];
    for (const pt of candidates) {
      const s = toScreen(pt, _state);
      if (Math.hypot(mousePos.x - s.x, mousePos.y - s.y) < SNAP_PX)
        return { type: 'point', pt };
    }
    return null;
  }

  function commitClose() {
    paths.push({ ...activePath, closed: true, visible: true });
    activePath = null;
    previewEnd = null;
    snapResult = null;
    _onChange?.();
  }

  function onMouseDown(e) {
    if (!active || !plane) return;
    mouseDownPos = getPos(e);
  }

  function onMouseMove(e) {
    if (editingPath) {
      const pos = getPos(e);
      if (editDrag) {
        const pt = unproject(pos.x, pos.y, _state, editingPath.plane);
        if (pt) editingPath.points[editDrag.idx] = pt;
      } else {
        editHoveredIdx = nearestPointIdx(pos, editingPath.points);
        _canvas.style.cursor = editHoveredIdx >= 0 ? 'move' : 'default';
      }
      return;
    }
    if (!active || !plane) return;
    const pos = getPos(e);
    snapResult = activePath ? findSnap(pos) : null;
    previewEnd = snapResult
      ? snapResult.pt
      : unproject(pos.x, pos.y, _state, plane);
  }

  function onMouseUp(e) {
    if (editingPath) { editDrag = null; return; }
    if (!active || !plane || !mouseDownPos) return;
    const pos = getPos(e);
    const dragged = Math.hypot(pos.x - mouseDownPos.x, pos.y - mouseDownPos.y) > 5;
    mouseDownPos = null;
    if (dragged) return;

    if (snapResult?.type === 'close') { commitClose(); return; }

    const pt = snapResult ? { ...snapResult.pt } : unproject(pos.x, pos.y, _state, plane);
    if (!pt) return;

    if (!activePath) {
      activePath = { plane, points: [{ ...pt }] };
    } else {
      activePath.points.push({ ...pt });
    }
    _onChange?.();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (editingPath) { stopEdit(); return; }
      if (!active) return;
      activePath = null;
      previewEnd = null;
      snapResult = null;
      _onChange?.();
    }
  }

  function setActive(val) {
    active = val;
    if (!val) { plane = null; activePath = null; previewEnd = null; snapResult = null; mouseDownPos = null; }
    if (_canvas) _canvas.style.cursor = (val && plane) ? 'crosshair' : '';
    _onChange?.();
  }

  function selectPlane(p) {
    plane = p;
    activePath = null;
    previewEnd = null;
    snapResult = null;
    if (_canvas) _canvas.style.cursor = (active && plane) ? 'crosshair' : '';
    _onChange?.();
  }

  function bind(canvasEl, state, onChange) {
    _canvas = canvasEl; _state = state; _onChange = onChange;
    canvasEl.addEventListener('mousedown', onMouseDownCapture, { capture: true });
    canvasEl.addEventListener('mousedown', onMouseDown);
    canvasEl.addEventListener('mousemove', onMouseMove);
    canvasEl.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
  }

  function draw(ctx, state) {
    // Edit mode handles
    if (editingPath) {
      const c = PLANE_COLOR[editingPath.plane];
      editingPath.points.forEach((pt, i) => {
        const s = toScreen(pt, state);
        const hovered = i === editHoveredIdx;
        ctx.beginPath();
        ctx.arc(s.x, s.y, hovered ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle   = hovered ? c : c + '66';
        ctx.strokeStyle = c;
        ctx.lineWidth   = 1.5;
        ctx.fill();
        ctx.stroke();
      });
    }

    // Completed paths
    for (const path of paths) {
      if (!path.visible) continue;
      const c = PLANE_COLOR[path.plane];
      for (let i = 0; i < path.points.length - 1; i++)
        drawLine3D(ctx, path.points[i], path.points[i + 1], state, c);
      if (path.closed)
        drawLine3D(ctx, path.points[path.points.length - 1], path.points[0], state, c);
    }

    if (!activePath) return;
    const c = PLANE_COLOR[plane];

    // Committed edges of active path
    for (let i = 0; i < activePath.points.length - 1; i++)
      drawLine3D(ctx, activePath.points[i], activePath.points[i + 1], state, c);

    // Preview edge
    if (previewEnd) {
      const last = activePath.points[activePath.points.length - 1];
      drawLine3D(ctx, last, previewEnd, state, snapResult ? c : c + '70');
    }

    // Snap indicator circle
    if (snapResult) {
      const s = toScreen(snapResult.pt, state);
      ctx.beginPath();
      ctx.arc(s.x, s.y, SNAP_PX, 0, Math.PI * 2);
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  return {
    bind, draw, setActive, selectPlane, startEdit,
    get active()      { return active; },
    get plane()       { return plane; },
    get hasPath()     { return !!activePath; },
    get canClose()    { return !!(activePath && activePath.points.length >= 3); },
    get paths()       { return paths; },
    get editingPath() { return editingPath; },
    setPathVisible(idx, val) { if (paths[idx]) { paths[idx].visible = val; } },
  };
}
