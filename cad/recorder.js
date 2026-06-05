export function createRecorder(canvasEl) {
  let recording = false;
  let samples = [];
  let prevX = 0, prevY = 0, prevT = 0;

  function onMouseMove(e) {
    if (!recording) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = Date.now();

    const dx = x - prevX;
    const dy = y - prevY;
    const dt = prevT > 0 ? t - prevT : 0;

    samples.push({ t: dt, dx: +dx.toFixed(2), dy: +dy.toFixed(2) });

    prevX = x;
    prevY = y;
    prevT = t;
  }

  function start() {
    samples = [];
    prevT = 0;
    recording = true;
    canvasEl.addEventListener("mousemove", onMouseMove);
    console.log("%c[Recorder] started", "color:#4ae28a;font-weight:bold");
  }

  function stop() {
    recording = false;
    canvasEl.removeEventListener("mousemove", onMouseMove);
    console.log("%c[Recorder] stopped — %d samples", "color:#4a90e2;font-weight:bold", samples.length);
    console.log(JSON.stringify(samples));
  }

  function toggle(btn) {
    if (!recording) {
      start();
      btn.textContent = "Stop";
      btn.style.color = "#e24a4a";
    } else {
      stop();
      btn.textContent = "Record";
      btn.style.color = "";
    }
  }

  return { toggle };
}
