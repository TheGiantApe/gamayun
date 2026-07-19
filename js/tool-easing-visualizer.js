/* EASING_VISUALIZER — canvas curve rendering (P0=(0,0), P3=(1,1), P1/P2
   the draggable control points) plus a real CSS transition using the
   exact same cubic-bezier() value for the moving-element preview, so
   the animation is the browser's actual easing engine, not a hand-rolled
   approximation that could drift from what CSS really produces. */

function easingSliderValues() {
  const x1 = document.getElementById("ease-x1").value / 100;
  const y1 = document.getElementById("ease-y1").value / 100;
  const x2 = document.getElementById("ease-x2").value / 100;
  const y2 = document.getElementById("ease-y2").value / 100;
  return { x1, y1, x2, y2 };
}

function drawEasingCurve(x1, y1, x2, y2) {
  const canvas = document.getElementById("easing-canvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  // Fixed visual range y: [-1, 2] so back/elastic-style overshoot presets
  // (y outside 0-1) still render inside the canvas instead of clipping.
  const toCanvasY = (y) => h - ((y + 1) / 3) * h;
  const toCanvasX = (x) => x * w;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,255,102,0.15)";
  ctx.beginPath();
  ctx.moveTo(0, toCanvasY(0));
  ctx.lineTo(w, toCanvasY(0));
  ctx.moveTo(0, toCanvasY(1));
  ctx.lineTo(w, toCanvasY(1));
  ctx.stroke();

  ctx.strokeStyle = "#00ff66";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), toCanvasY(0));
  ctx.bezierCurveTo(toCanvasX(x1), toCanvasY(y1), toCanvasX(x2), toCanvasY(y2), toCanvasX(1), toCanvasY(1));
  ctx.stroke();

  ctx.fillStyle = "#ffb300";
  [[x1, y1], [x2, y2]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(toCanvasX(x), toCanvasY(y), 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderEasing() {
  const { x1, y1, x2, y2 } = easingSliderValues();
  drawEasingCurve(x1, y1, x2, y2);
  document.getElementById("easing-css").textContent = `transition-timing-function: cubic-bezier(${x1}, ${y1}, ${x2}, ${y2});`;
}

function setEasingPreset(x1, y1, x2, y2) {
  document.getElementById("ease-x1").value = x1 * 100;
  document.getElementById("ease-y1").value = y1 * 100;
  document.getElementById("ease-x2").value = x2 * 100;
  document.getElementById("ease-y2").value = y2 * 100;
  renderEasing();
}

function playEasingBall() {
  const { x1, y1, x2, y2 } = easingSliderValues();
  const ball = document.getElementById("easing-ball");
  const track = ball.parentElement;
  const distance = track.offsetWidth - ball.offsetWidth;
  ball.style.transition = "none";
  ball.style.left = "0px";
  // Force layout so the browser registers the reset position before the
  // transition below starts, otherwise it can silently skip the animation.
  void ball.offsetWidth;
  ball.style.transition = `left 1.2s cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  ball.style.left = `${distance}px`;
  GAMA.say("working");
}

document.addEventListener("DOMContentLoaded", renderEasing);
