function sub(a, b) { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
function cross(a, b) { return { x: a.y*b.z-a.z*b.y, y: a.z*b.x-a.x*b.z, z: a.x*b.y-a.y*b.x }; }
function norm(v) { const l = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z); return l>0?{x:v.x/l,y:v.y/l,z:v.z/l}:{x:0,y:1,z:0}; }

function facet(a, b, c) {
  const n = norm(cross(sub(b,a), sub(c,a)));
  const f = v => `      vertex ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`;
  return `  facet normal ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}\n    outer loop\n${f(a)}\n${f(b)}\n${f(c)}\n    endloop\n  endfacet`;
}

function fan(pts) {
  const out = [];
  for (let i = 1; i < pts.length - 1; i++) out.push(facet(pts[0], pts[i], pts[i+1]));
  return out;
}

function buildSTL(name, facets) {
  return `solid ${name}\n${facets.join('\n')}\nendsolid ${name}`;
}

export function downloadSTL(content, filename) {
  const blob = new Blob([content], { type: 'model/stl' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Extrusion ─────────────────────────────────────────────────────
const PLANE_NORMAL = { xy:{x:0,y:0,z:1}, xz:{x:0,y:1,z:0}, yz:{x:1,y:0,z:0} };

export function extrusionToSTL(ex) {
  const { path, depth } = ex;
  const n   = PLANE_NORMAL[path.plane];
  const bot = path.points;
  const top = bot.map(p => ({ x:p.x+n.x*depth, y:p.y+n.y*depth, z:p.z+n.z*depth }));
  const N   = bot.length;

  const facets = [
    ...fan([...bot].reverse()),
    ...fan(top),
  ];
  for (let i = 0; i < N; i++) {
    const j = (i+1) % N;
    facets.push(facet(bot[i], top[i], top[j]));
    facets.push(facet(bot[i], top[j], bot[j]));
  }
  return buildSTL('extrusion', facets);
}

// ── Box ───────────────────────────────────────────────────────────
export function boxToSTL(cx, cy, cz, size) {
  const s = size / 2;
  const p = (x,y,z) => ({ x:cx+x, y:cy+y, z:cz+z });
  const [v0,v1,v2,v3] = [p(-s,-s,-s),p(s,-s,-s),p(s,s,-s),p(-s,s,-s)];
  const [v4,v5,v6,v7] = [p(-s,-s,s), p(s,-s,s), p(s,s,s), p(-s,s,s)];
  return buildSTL('box', [
    facet(v0,v2,v1), facet(v0,v3,v2), // front
    facet(v4,v5,v6), facet(v4,v6,v7), // back
    facet(v0,v1,v5), facet(v0,v5,v4), // bottom
    facet(v3,v6,v2), facet(v3,v7,v6), // top
    facet(v0,v4,v7), facet(v0,v7,v3), // left
    facet(v1,v2,v6), facet(v1,v6,v5), // right
  ]);
}

// ── Pyramid ───────────────────────────────────────────────────────
export function pyramidToSTL(cx, cy, cz, base, height) {
  const s = base / 2;
  const p = (x,y,z) => ({ x:cx+x, y:cy+y, z:cz+z });
  const [b0,b1,b2,b3] = [p(-s,0,-s),p(s,0,-s),p(s,0,s),p(-s,0,s)];
  const apex = p(0,-height,0);
  return buildSTL('pyramid', [
    facet(b0,b2,b1), facet(b0,b3,b2),    // base
    facet(b0,b1,apex), facet(b1,b2,apex), // sides
    facet(b2,b3,apex), facet(b3,b0,apex),
  ]);
}

// ── Sphere ────────────────────────────────────────────────────────
export function sphereToSTL(cx, cy, cz, radius) {
  const LAT = 20, LON = 32;
  const pt = (phi, theta) => ({
    x: cx + Math.sin(phi)*Math.cos(theta)*radius,
    y: cy + Math.cos(phi)*radius,
    z: cz + Math.sin(phi)*Math.sin(theta)*radius,
  });

  const grid = Array.from({ length: LAT+1 }, (_,i) =>
    Array.from({ length: LON+1 }, (_,j) => pt(i/LAT*Math.PI, j/LON*Math.PI*2))
  );

  const facets = [];
  for (let i = 0; i < LAT; i++) {
    for (let j = 0; j < LON; j++) {
      const [a,b,c,d] = [grid[i][j], grid[i][j+1], grid[i+1][j+1], grid[i+1][j]];
      if (i === 0)        facets.push(facet(a, c, d));
      else if (i===LAT-1) facets.push(facet(a, b, c));
      else { facets.push(facet(a,b,c)); facets.push(facet(a,c,d)); }
    }
  }
  return buildSTL('sphere', facets);
}
