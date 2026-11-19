/* Daybreak sky: a smiling sun by day, a sleepy moon by night, drifting clouds,
   twinkling stars and the odd shooting star. Pure DOM + SVG, no images. */
(function () {
  "use strict";
  const sky = document.getElementById("sky");
  if (!sky) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const div = (cls, html = "") => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; return d; };
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- stars ----------
  const stars = div("stars");
  for (let i = 0; i < 26; i++) {
    const sparkle = i % 5 === 0;
    const s = div(sparkle ? "star sparkly" : "star",
      sparkle ? '<svg viewBox="0 0 24 24"><path d="M12 2c.7 5.3 3.5 8.3 10 10-6.5 1.7-9.3 4.7-10 10-.7-5.3-3.5-8.3-10-10 6.5-1.7 9.3-4.7 10-10z"/></svg>' : "");
    s.style.left = `${rand(2, 98)}%`;
    s.style.top = `${rand(4, 150)}px`;
    const size = sparkle ? rand(9, 14) : rand(2, 4);
    s.style.width = s.style.height = `${size}px`;
    s.style.animationDuration = `${rand(2.5, 5.5)}s`;
    s.style.animationDelay = `${-rand(0, 5)}s`;
    stars.append(s);
  }
  const shooting = div("shooting");

  // ---------- clouds ----------
  const cloudSVG = (face) => `<svg viewBox="0 0 120 60">
      <path class="puff" d="M22 50h76a16 16 0 0 0 1-32 22 22 0 0 0-41-6 17 17 0 0 0-30 9A15 15 0 0 0 22 50z"/>
      ${face ? '<g class="cface"><path d="M48 33q3 3 6 0M66 33q3 3 6 0"/><path d="M56 40q4 3 8 0"/><ellipse cx="44" cy="39" rx="4" ry="2.4" class="blush"/><ellipse cx="76" cy="39" rx="4" ry="2.4" class="blush"/></g>' : ""}
    </svg>`;
  const clouds = div("clouds");
  [
    { w: 96, top: 46, dur: 70, delay: -12, face: true },
    { w: 64, top: 112, dur: 95, delay: -60, face: false },
    { w: 78, top: 18, dur: 120, delay: -95, face: false },
  ].forEach((c) => {
    const el = div("cloud", cloudSVG(c.face));
    el.style.width = `${c.w}px`;
    el.style.top = `${c.top}px`;
    el.style.animationDuration = `${c.dur}s`;
    el.style.animationDelay = `${c.delay}s`;
    clouds.append(el);
  });

  // ---------- sun ----------
  const rays = Array.from({ length: 12 }, (_, i) =>
    `<rect x="47" y="2" width="6" height="15" rx="3" transform="rotate(${i * 30} 50 50)"/>`).join("");
  const sun = div("celestial sun", `<svg viewBox="0 0 100 100">
      <defs><radialGradient id="sunBody" cx="40%" cy="35%"><stop offset="0" stop-color="#fff6c9"/><stop offset="1" stop-color="#ffd36e"/></radialGradient></defs>
      <g class="rays">${rays}</g>
      <circle cx="50" cy="50" r="27" fill="url(#sunBody)"/>
      <g class="eyes"><ellipse cx="41" cy="47" rx="3" ry="4"/><ellipse cx="59" cy="47" rx="3" ry="4"/></g>
      <ellipse cx="35" cy="57" rx="5" ry="3" class="blush"/><ellipse cx="65" cy="57" rx="5" ry="3" class="blush"/>
      <path d="M44 57q6 6 12 0" class="mouth"/>
    </svg>`);

  // ---------- moon ----------
  const moon = div("celestial moon", `<svg viewBox="0 0 100 100">
      <defs>
        <mask id="crescent"><rect width="100" height="100" fill="#fff"/><circle cx="66" cy="38" r="26" fill="#000"/></mask>
        <radialGradient id="moonBody" cx="35%" cy="40%"><stop offset="0" stop-color="#fffdf3"/><stop offset="1" stop-color="#ffeeb5"/></radialGradient>
      </defs>
      <circle cx="48" cy="52" r="30" fill="url(#moonBody)" mask="url(#crescent)"/>
      <path d="M30 56q4 3 8 0" class="mouth"/>
      <path d="M33 66q5 4 10 0" class="mouth"/>
      <ellipse cx="28" cy="64" rx="4" ry="2.4" class="blush"/>
    </svg>
    <span class="zz">z</span><span class="zz z2">z</span>`);

  const hills = sky.querySelector(".hills");
  // Tiny flowers that sway on the hills (and glow at night).
  const FL = ["#ffc4dc", "#dcc8ff", "#bfe2ff", "#fff0b8", "#ffd2b8"];
  const flowers = div("flowers");
  [[8, 6], [17, 10], [31, 4], [46, 9], [63, 5], [74, 11], [88, 7], [95, 3]].forEach(([x, up], i) => {
    const f = div("hill-flower", `<svg viewBox="0 0 14 22"><path class="stem" d="M7 22V9"/>${
      [0, 72, 144, 216, 288].map((r) => `<ellipse class="petal" cx="7" cy="4.2" rx="2.4" ry="3" transform="rotate(${r} 7 7)"/>`).join("")
    }<circle class="heart" cx="7" cy="7" r="1.8"/></svg>`);
    f.style.left = `${x}%`;
    f.style.bottom = `${up + 14}px`;
    f.style.setProperty("--fl", FL[i % FL.length]);
    f.style.animationDelay = `${-i * 0.7}s`;
    const sc = 0.8 + (i % 3) * 0.15;
    f.style.width = `${14 * sc}px`; f.style.height = `${22 * sc}px`;
    flowers.append(f);
  });
  sky.querySelectorAll(".stars, .cloud, .orb").forEach((n) => n.remove());
  sky.insertBefore(stars, hills);
  sky.insertBefore(shooting, hills);
  sky.insertBefore(clouds, hills);
  sky.insertBefore(sun, hills);
  sky.insertBefore(moon, hills);


  // A tap on the sun or moon makes it wiggle (and chime, if sounds are on).
  [sun, moon].forEach((c) => c.addEventListener("click", () => {
    c.classList.remove("wiggle"); void c.offsetWidth; c.classList.add("wiggle");
    if (window.DaybreakSound) window.DaybreakSound.play("sky");
  }));
  sky.style.pointerEvents = "none";
  sun.style.pointerEvents = moon.style.pointerEvents = "auto";

  // ---------- shooting stars ----------
  function shoot() {
    const p = document.body.dataset.period;
    if (!reduce && (p === "night" || p === "dusk") && document.visibilityState === "visible") {
      const s = div("shooter");
      s.style.left = `${rand(10, 75)}%`;
      s.style.top = `${rand(0, 60)}px`;
      s.style.setProperty("--len", `${rand(70, 120)}px`);
      shooting.append(s);
      setTimeout(() => s.remove(), 1600);
    }
    setTimeout(shoot, rand(4000, 11000));
  }
  setTimeout(shoot, 1500);

  // Position the sun along a soft arc through the day; the moon sits top right.
  window.DaybreakSky = {
    update() {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      const t = Math.min(1, Math.max(0, (h - 6) / 13)); // 6:00 to 19:00
      sun.style.right = `${6 + (1 - t) * 0 + t * 10}%`;
      sun.style.top = `${4 + Math.pow(2 * t - 1, 2) * 26}px`;
    },
  };
  window.DaybreakSky.update();
})();
