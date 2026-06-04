export function render(ctx, mouse, canvas) {
  const rect = canvas.getBoundingClientRect();

  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);

  ctx.fillStyle = "#DA61FC";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;

  ctx.fill();
  ctx.stroke();
}