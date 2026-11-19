/* Daybreak fairy dust: soft glowing motes drifting up behind everything.
   By day they're pastel sparkles; at dusk and night some become warm fireflies. */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = document.createElement("canvas");
  cv.className = "fairy-dust";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const g = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size);

  const DAY = ["255,182,213", "201,168,255", "159,216,255", "168,236,201", "255,226,150"];
  const NIGHT = ["255,246,190", "220,255,170", "255,214,240", "200,190,255"];
  const night = () => ["night", "dusk"].includes(document.body.dataset.period);
  const rand = (a, b) => a + Math.random() * (b - a);

  function mote(fresh) {
    const n = night();
    const firefly = n && Math.random() < 0.55;
    const pal = n ? NIGHT : DAY;
    return {
      x: rand(0, W),
      y: fresh ? rand(0, H) : H + 10,
      r: firefly ? rand(1.6, 2.6) : rand(0.8, 2.2),
      vy: firefly ? rand(-0.12, 0.05) : rand(0.12, 0.35),
      vx: rand(-0.12, 0.12),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.02),
      color: pal[(Math.random() * pal.length) | 0],
      firefly,
      star: !firefly && Math.random() < 0.25,
    };
  }
  const COUNT = () => (night() ? 34 : 26);
  let motes = Array.from({ length: COUNT() }, () => mote(true));

  function drawStar(x, y, r, a, color) {
    g.fillStyle = `rgba(${color},${a})`;
    g.beginPath();
    const s = r * 3.2;
    g.moveTo(x, y - s);
    g.quadraticCurveTo(x, y, x + s, y);
    g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y);
    g.quadraticCurveTo(x, y, x, y - s);
    g.fill();
  }

  function frame() {
    g.clearRect(0, 0, W, H);
    motes.forEach((m, i) => {
      m.phase += m.speed;
      m.y -= m.vy;
      m.x += m.vx + Math.sin(m.phase) * (m.firefly ? 0.35 : 0.18);
      if (m.firefly) m.y += Math.cos(m.phase * 0.7) * 0.25;
      const twinkle = 0.35 + 0.65 * Math.pow((Math.sin(m.phase * 2) + 1) / 2, 2);
      const a = (m.firefly ? 0.85 : 0.6) * twinkle;
      const glow = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * (m.firefly ? 7 : 5));
      glow.addColorStop(0, `rgba(${m.color},${a})`);
      glow.addColorStop(1, `rgba(${m.color},0)`);
      g.fillStyle = glow;
      g.beginPath();
      g.arc(m.x, m.y, m.r * (m.firefly ? 7 : 5), 0, Math.PI * 2);
      g.fill();
      if (m.star) drawStar(m.x, m.y, m.r, Math.min(1, a + 0.2), m.color);
      else { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(m.x, m.y, m.r * 0.6, 0, Math.PI * 2); g.fill(); }
      if (m.y < -20 || m.y > H + 20 || m.x < -20 || m.x > W + 20) motes[i] = mote(false);
    });
    while (motes.length < COUNT()) motes.push(mote(false));
    if (motes.length > COUNT()) motes.length = COUNT();
  }

  let running = false;
  function loop() {
    if (!running) return;
    frame();
    requestAnimationFrame(loop);
  }
  function setRunning() {
    const want = !reduce && document.visibilityState === "visible";
    if (want && !running) { running = true; requestAnimationFrame(loop); }
    if (!want) running = false;
  }
  document.addEventListener("visibilitychange", setRunning);
  if (reduce) frame();
  setRunning();
})();
