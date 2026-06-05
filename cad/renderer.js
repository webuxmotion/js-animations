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

export function drawGridPlane(ctx, type, state) {
  for (let i = -GRID_SIZE; i <= GRID_SIZE; i += GRID_STEP) {
    if (type === "xy") {
      drawLine3D(ctx, { x: i, y: -GRID_SIZE, z: 0 }, { x: i, y: GRID_SIZE, z: 0 }, state, COLOR_XY);
      drawLine3D(ctx, { x: -GRID_SIZE, y: i, z: 0 }, { x: GRID_SIZE, y: i, z: 0 }, state, COLOR_XY);
    }
    if (type === "xz") {
      drawLine3D(ctx, { x: i, y: 0, z: -GRID_SIZE }, { x: i, y: 0, z: GRID_SIZE }, state, COLOR_XZ);
      drawLine3D(ctx, { x: -GRID_SIZE, y: 0, z: i }, { x: GRID_SIZE, y: 0, z: i }, state, COLOR_XZ);
    }
    if (type === "yz") {
      drawLine3D(ctx, { x: 0, y: i, z: -GRID_SIZE }, { x: 0, y: i, z: GRID_SIZE }, state, COLOR_YZ);
      drawLine3D(ctx, { x: 0, y: -GRID_SIZE, z: i }, { x: 0, y: GRID_SIZE, z: i }, state, COLOR_YZ);
    }
  }
}
