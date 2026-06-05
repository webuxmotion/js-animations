export function rotateX(p, a) {
  return {
    x: p.x,
    y: p.y * Math.cos(a) - p.z * Math.sin(a),
    z: p.y * Math.sin(a) + p.z * Math.cos(a)
  };
}

export function rotateY(p, a) {
  return {
    x: p.x * Math.cos(a) - p.z * Math.sin(a),
    y: p.y,
    z: p.x * Math.sin(a) + p.z * Math.cos(a)
  };
}

export function transform(p, rotX, rotY) {
  p = rotateY(p, rotY);
  p = rotateX(p, rotX);
  return p;
}

export function project(p, zoom, panX, panY, width, height) {
  return {
    x: p.x * zoom + width / 2 + panX,
    y: p.y * zoom + height / 2 + panY
  };
}
