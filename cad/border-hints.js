const BAR   = 6;
const FADE  = 50;
const DEPTH = BAR + FADE;

const PAN_SOLID  = "rgba(74,  144, 226, 0.25)";
const PAN_FADE   = "rgba(74,  144, 226, 0.00)";
const ROT_SOLID  = "rgba(255, 140,   0, 0.25)";
const ROT_FADE   = "rgba(255, 140,   0, 0.00)";
const PAN_BRIGHT = "rgba(74,  144, 226, 0.95)";
const ROT_BRIGHT = "rgba(255, 140,   0, 0.95)";

function vGrad(ctx, x, w, solid, fade) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, solid);
  g.addColorStop(1, fade);
  return g;
}

export function drawBorderHints(ctx, w, h, centerHalf, mouseY) {
  const cy = h / 2;

  ctx.save();

  // ── Left edge — three vertical zones ──────────────────────────

  // rotate — top section
  ctx.fillStyle = vGrad(ctx, 0, DEPTH, ROT_SOLID, ROT_FADE);
  ctx.fillRect(0, 0, DEPTH, cy - centerHalf);

  // pan — center section
  ctx.fillStyle = vGrad(ctx, 0, DEPTH, PAN_SOLID, PAN_FADE);
  ctx.fillRect(0, cy - centerHalf, DEPTH, centerHalf * 2);

  // rotate — bottom section
  ctx.fillStyle = vGrad(ctx, 0, DEPTH, ROT_SOLID, ROT_FADE);
  ctx.fillRect(0, cy + centerHalf, DEPTH, h - cy - centerHalf);

  // ── Labels ────────────────────────────────────────────────────
  const labelX = 14;

  function rotateLabel(text, y, color) {
    ctx.save();
    ctx.translate(labelX, y);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  rotateLabel("ROTATE", (cy - centerHalf) / 2,              ROT_SOLID);
  rotateLabel("PAN",     cy,                                 PAN_SOLID);
  rotateLabel("ROTATE", cy + centerHalf + (h - cy - centerHalf) / 2, ROT_SOLID);

  // ── Mouse projection indicator on left edge ──────────────────
  const isPan    = Math.abs(mouseY - cy) < centerHalf;
  const tickColor = isPan ? PAN_BRIGHT : ROT_BRIGHT;

  const glowRadius = isPan ? 36  : 20;
  const glowAlpha  = isPan ? 0.5 : 0.18;
  const AH         = isPan ? 14  : 8;   // arrow half-height
  const AW         = isPan ? 24  : 14;  // arrow length
  const AX         = 6;
  const dotR       = isPan ? 3.5 : 2;

  // glow
  const glow = ctx.createRadialGradient(0, mouseY, 0, 0, mouseY, glowRadius);
  glow.addColorStop(0, tickColor.replace("0.95", String(glowAlpha)));
  glow.addColorStop(1, tickColor.replace("0.95", "0.00"));
  ctx.fillStyle = glow;
  ctx.fillRect(0, mouseY - glowRadius, glowRadius * 2, glowRadius * 2);

  // arrow
  ctx.fillStyle = tickColor;
  ctx.beginPath();
  ctx.moveTo(AX + AW, mouseY);
  ctx.lineTo(AX,      mouseY - AH);
  ctx.lineTo(AX,      mouseY + AH);
  ctx.closePath();
  ctx.fill();

  // dot at tip
  ctx.fillStyle = isPan ? "#fff" : "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(AX + AW, mouseY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Simple mode indicator for gesture-based schemes (no zones, just current mode)
export function drawModeHint(ctx, h, mode, mouseY, activationTime) {
  const isPan       = mode === "pan";
  const edgeColor   = isPan ? PAN_SOLID  : ROT_SOLID;
  const edgeFade    = isPan ? PAN_FADE   : ROT_FADE;
  const arrowColor  = isPan ? PAN_BRIGHT : ROT_BRIGHT;

  ctx.save();

  // left edge background
  const bg = ctx.createLinearGradient(0, 0, DEPTH, 0);
  bg.addColorStop(0, edgeColor);
  bg.addColorStop(1, edgeFade);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, DEPTH, h);

  // activation flash
  const flashAge   = Date.now() - activationTime;
  const flashAlpha = Math.max(0, 0.45 - flashAge / 500);
  if (flashAlpha > 0) {
    const flash = ctx.createLinearGradient(0, 0, DEPTH * 2.5, 0);
    flash.addColorStop(0, arrowColor.replace("0.95", flashAlpha.toFixed(2)));
    flash.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, DEPTH * 2.5, h);
  }

  // mode label (rotated)
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = arrowColor;
  ctx.fillText(isPan ? "PAN" : "ROTATE", 0, 0);
  ctx.restore();

  // arrow indicator
  const AX   = 6;
  const AH   = isPan ? 14 : 8;
  const AW   = isPan ? 24 : 14;
  const dotR = isPan ? 3.5 : 2;
  const glowR = isPan ? 36 : 20;
  const glowA = isPan ? 0.5 : 0.18;

  const glow = ctx.createRadialGradient(0, mouseY, 0, 0, mouseY, glowR);
  glow.addColorStop(0, arrowColor.replace("0.95", String(glowA)));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, mouseY - glowR, glowR * 2, glowR * 2);

  ctx.fillStyle = arrowColor;
  ctx.beginPath();
  ctx.moveTo(AX + AW, mouseY);
  ctx.lineTo(AX,      mouseY - AH);
  ctx.lineTo(AX,      mouseY + AH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isPan ? "#fff" : "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(AX + AW, mouseY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
