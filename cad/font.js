export const FONT = {
  F: [[[0,0],[0,10]], [[0,10],[6,10]], [[0,5],[4,5]]],
  R: [[[0,0],[0,10]], [[0,10],[6,10]], [[6,10],[6,5]], [[6,5],[0,5]], [[0,5],[6,0]]],
  O: [[[0,0],[6,0]], [[6,0],[6,10]], [[6,10],[0,10]], [[0,10],[0,0]]],
  N: [[[0,0],[0,10]], [[0,10],[6,0]], [[6,0],[6,10]]],
  T: [[[0,10],[6,10]], [[3,10],[3,0]]],
  P: [[[0,0],[0,10]], [[0,10],[6,10]], [[6,10],[6,5]], [[6,5],[0,5]]],
  L: [[[0,10],[0,0]], [[0,0],[6,0]]]
};

export function buildText(word, origin, scale = 10, color = "#000") {
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
