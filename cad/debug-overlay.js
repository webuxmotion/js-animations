const BOX_W = 192;
const BOX_H = 148;
const MARGIN = 20;
const PAD = 12;

export function drawDebugOverlay(ctx, debug, w, h) {
  const bx = w - MARGIN - BOX_W;
  const by = h - MARGIN - BOX_H;

  ctx.save();

  // panel background
  ctx.fillStyle = "rgba(10, 12, 20, 0.82)";
  ctx.beginPath();
  ctx.roundRect(bx, by, BOX_W, BOX_H, 8);
  ctx.fill();

  // ── miniature screen ──────────────────────────────────────────
  const sw = debug.screenWidth  || 1;
  const sh = debug.screenHeight || 1;

  const mvW = BOX_W - PAD * 2;
  const mvH = Math.round(mvW * (sh / sw));
  const mvX = bx + PAD;
  const mvY = by + PAD;

  // background
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(mvX, mvY, mvW, mvH);

  // cross arm half-width scaled to miniature (min 6px for visibility)
  const ch = Math.max(6, debug.crossHalf * (mvW / sw));
  const mcx = mvX + mvW / 2;
  const mcy = mvY + mvH / 2;

  // rotate zones — 4 corners
  ctx.fillStyle = "rgba(255, 140, 0, 0.30)";
  ctx.fillRect(mvX,          mvY,          mcx - mvX - ch, mcy - mvY - ch); // TL
  ctx.fillRect(mcx + ch,     mvY,          mvX + mvW - mcx - ch, mcy - mvY - ch); // TR
  ctx.fillRect(mvX,          mcy + ch,     mcx - mvX - ch, mvY + mvH - mcy - ch); // BL
  ctx.fillRect(mcx + ch,     mcy + ch,     mvX + mvW - mcx - ch, mvY + mvH - mcy - ch); // BR

  // pan zones — cross arms (horizontal + vertical, drawn separately so overlap is fine)
  ctx.fillStyle = "rgba(74, 144, 226, 0.30)";
  ctx.fillRect(mvX,      mcy - ch, mvW,   ch * 2); // horizontal arm
  ctx.fillRect(mcx - ch, mvY,      ch * 2, mvH);   // vertical arm

  // cross center (overlap, slightly brighter)
  ctx.fillStyle = "rgba(74, 144, 226, 0.20)";
  ctx.fillRect(mcx - ch, mcy - ch, ch * 2, ch * 2);

  // miniature border
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mvX, mvY, mvW, mvH);

  // cross guide lines
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(mcx, mvY); ctx.lineTo(mcx, mvY + mvH);
  ctx.moveTo(mvX, mcy); ctx.lineTo(mvX + mvW, mcy);
  ctx.stroke();

  // mouse dot
  if (sw > 0 && sh > 0) {
    const dotX = mvX + (debug.mouseX / sw) * mvW;
    const dotY = mvY + (debug.mouseY / sh) * mvH;

    const modeColors = { rotate: "#ffaa00", pan: "#4a90e2", zoom: "#4ae28a" };
    const dotColor = modeColors[debug.mode] ?? "#fff";

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── label row ────────────────────────────────────────────────
  const modeColors = { rotate: "#ffaa00", pan: "#4a90e2", zoom: "#4ae28a" };
  const ty = mvY + mvH + 18;

  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = modeColors[debug.mode] ?? "#555";
  ctx.fillText(`mode: ${debug.mode ?? "—"}`, bx + PAD, ty);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText(
    `${Math.round(debug.mouseX)}, ${Math.round(debug.mouseY)}`,
    bx + BOX_W - PAD, ty
  );

  ctx.restore();
}
