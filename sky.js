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
  for (let i = 0; i < 40; i++) {
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

  // ---------- real sun and moon for Toronto ----------
  const LAT = 43.65, LON = -79.38, rad = Math.PI / 180;
  // Sun elevation in degrees at a moment (simplified NOAA formula, good to well under a degree).
  function sunElev(ms) {
    const n = ms / 86400000 + 2440587.5 - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * rad;
    const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
    const eps = (23.439 - 0.0000004 * n) * rad;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const gmst = (280.46061837 + 360.98564736629 * n) % 360;
    const ha = (gmst + LON) * rad - ra;
    return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
  }
  // Sunrise, sunset and highest point for the local day containing `ms`.
  const dayCache = {};
  function sunDay(ms) {
    const d = new Date(ms); d.setHours(0, 0, 0, 0);
    const k = d.getTime();
    if (dayCache[k]) return dayCache[k];
    let rise = null, set = null, peak = 0, prev = sunElev(k);
    for (let t = k + 120000; t <= k + 86400000; t += 120000) {
      const e = sunElev(t);
      if (prev < -0.833 && e >= -0.833) rise = t;
      if (prev >= -0.833 && e < -0.833) set = t;
      peak = Math.max(peak, e);
      prev = e;
    }
    return (dayCache[k] = { rise: rise || k + 6 * 3600000, set: set || k + 18 * 3600000, peak: Math.max(peak, 10) });
  }
  // Moon phase: 0 new, 0.5 full (mean synodic month from a known new moon).
  const moonPhase = (ms) => ((((ms - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588853) + 29.530588853) % 29.530588853 / 29.530588853;

  // Sky colours by sun height: deep enchanted night, lilac twilight, peach sunrise and sunset, clear pastel day.
  const LIGHT = [
    [-18, "#221d50", "#3a3180", "#ece5fb"], [-10, "#2c2766", "#54489c", "#efe8fb"], [-4, "#574ca6", "#c48ccb", "#f8eef8"],
    [0, "#8a80da", "#ffb6c6", "#fdeef0"], [4, "#a3b0f2", "#ffd3c6", "#fdf3f2"], [10, "#a8ccfc", "#ffe5da", "#fdf6fb"],
    [25, "#a9d4ff", "#d3e9ff", "#fdf6fb"], [55, "#94c9ff", "#cde6ff", "#fdf6fb"]];
  const DARK = [
    [-18, "#120f2b", "#1d1842", "#1d1830"], [-10, "#1b1640", "#2a2256", "#201a33"], [-4, "#2d2558", "#563a68", "#221c33"],
    [0, "#3a2f62", "#6e406c", "#221c33"], [6, "#34416f", "#4c4272", "#221c33"], [20, "#2f3f6e", "#3b3a6a", "#221c33"], [55, "#2f416f", "#3a3d6c", "#221c33"]];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(",")})`;
  function skyColors(e, dark) {
    const S = dark ? DARK : LIGHT;
    if (e <= S[0][0]) return S[0].slice(1).map((c) => mix(c, c, 0));
    for (let i = 1; i < S.length; i++) {
      if (e <= S[i][0]) { const t = (e - S[i - 1][0]) / (S[i][0] - S[i - 1][0]); return [1, 2, 3].map((j) => mix(S[i - 1][j], S[i][j], t)); }
    }
    return S[S.length - 1].slice(1).map((c) => mix(c, c, 0));
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Extra magic layers: sun glow, sunbeams, a faint daytime rainbow, night aurora ribbons and a moon halo.
  const glow = div("sunglow");
  const beams = div("sunbeams");
  const rainbow = div("rainbow", '<svg viewBox="0 0 200 100" preserveAspectRatio="none">' +
    ["#ffc4dc", "#ffd9b8", "#fff0b8", "#c9f0d8", "#bfe2ff", "#dcc8ff"].map((c, i) =>
      `<path d="M${10 + i * 6} 100a${90 - i * 6} ${90 - i * 6} 0 0 1 ${180 - i * 12} 0" stroke="${c}" stroke-width="6.5" fill="none"/>`).join("") + "</svg>");
  const aurora = div("night-aurora", '<i></i><i></i><i></i>');
  sky.insertBefore(aurora, stars);
  sky.insertBefore(rainbow, clouds);
  sky.insertBefore(glow, sun);
  sky.insertBefore(beams, sun);

  const moonSvg = moon.querySelector("svg");
  moonSvg.innerHTML = `<defs>
      <mask id="phaseMask"><rect width="100" height="100" fill="#fff"/><circle id="phaseShadow" cx="20" cy="50" r="31" fill="#000"/></mask>
      <radialGradient id="moonBody" cx="40%" cy="40%"><stop offset="0" stop-color="#fffdf3"/><stop offset="1" stop-color="#ffeeb5"/></radialGradient>
    </defs>
    <circle cx="50" cy="50" r="30" class="moon-ghost"/>
    <circle cx="50" cy="50" r="30" fill="url(#moonBody)" mask="url(#phaseMask)"/>
    <g class="moon-face"><path d="M40 50q4 3 8 0" class="mouth"/><path d="M52 50q4 3 8 0" class="mouth"/><path d="M45 60q5 4 10 0" class="mouth"/>
      <ellipse cx="37" cy="58" rx="4" ry="2.4" class="blush"/><ellipse cx="63" cy="58" rx="4" ry="2.4" class="blush"/></g>`;
  const halo = div("moon-halo");
  moon.prepend(halo);

  const place = (elm, frac, elev, peak, size) => {
    // x: rises on the left (east), sets on the right (west). y: by real height, hidden behind the hills at the horizon.
    const top = 200 - clamp(elev / peak, -0.4, 1) * 166 - size / 2;
    elm.style.right = "auto";
    elm.style.left = `calc(${clamp(frac).toFixed(4)} * (100% - ${size + 8}px) + 4px)`;
    elm.style.top = `${top.toFixed(1)}px`;
    return top + size / 2;
  };

  window.DaybreakSky = {
    sunElev, sunDay, moonPhase,
    // Returns "dawn" | "day" | "dusk" | "night" from the real sun.
    update(at) {
      const ms = at ? +at : Date.now();
      const e = sunElev(ms);
      const today = sunDay(ms);
      const noon = (today.rise + today.set) / 2;
      const morning = ms < noon;
      const period = e > 6 ? "day" : e < -6 ? "night" : morning ? "dawn" : "dusk";
      document.body.dataset.period = period;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const [top, mid, bottom] = skyColors(e, dark);
      const st = document.body.style;
      st.setProperty("--sky-top", top); st.setProperty("--sky-mid", mid); st.setProperty("--sky-bottom", bottom);

      // Sun
      const sunFrac = (ms - today.rise) / (today.set - today.rise);
      const sunY = place(sun, sunFrac, e, today.peak, 92);
      const sunVis = clamp((e + 3) / 4);
      sun.style.opacity = sunVis.toFixed(2);
      sun.style.display = sunVis > 0 ? "block" : "none";
      sun.style.setProperty("--warm", clamp(1 - e / 12).toFixed(2)); // redder near the horizon
      const sx = `calc(${clamp(sunFrac).toFixed(4)} * (100% - 100px) + 50px)`;
      glow.style.left = beams.style.left = sx;
      glow.style.top = beams.style.top = `${sunY.toFixed(1)}px`;
      glow.style.opacity = (clamp(1 - Math.abs(e - 2) / 14) * 0.95 + 0.15 * clamp(e / 20)).toFixed(2);
      beams.style.opacity = (0.55 * clamp((e - 4) / 10)).toFixed(2);
      rainbow.style.opacity = (0.4 * clamp((e - 8) / 10) * clamp((today.peak - e + 12) / 12)).toFixed(2);

      // Moon: crosses the sky from sunset to the next sunrise, showing tonight's real phase.
      const night = clamp((-e - 2) / 6);
      let set = today.set, rise = sunDay(ms + 86400000).rise;
      if (ms < today.rise) { set = sunDay(ms - 86400000).set; rise = today.rise; }
      const mFrac = (ms - set) / (rise - set);
      const mElev = Math.sin(Math.PI * clamp(mFrac)) * 50;
      place(moon, mFrac, mElev, 50, 84);
      moon.style.display = night > 0 ? "block" : "none";
      moon.style.opacity = night.toFixed(2);
      const p = moonPhase(ms);
      const k = clamp(p < 0.5 ? p / 0.5 : (1 - p) / 0.5, 0.22, 1); // 0 new to 1 full (always a cute sliver)
      const dir = p < 0.5 ? -1 : 1; // waxing: lit on the right
      moon.querySelector("#phaseShadow").setAttribute("cx", (50 + dir * k * 64).toFixed(1));
      moon.querySelector(".moon-face").setAttribute("transform", `translate(${(-dir * (1 - k) * 14).toFixed(1)} 0)`);
      moon.dataset.phase = p.toFixed(2);

      aurora.style.opacity = (night * 0.9).toFixed(2);
      stars.style.opacity = clamp((-e - 1) / 8).toFixed(2);
      return period;
    },
  };
  window.DaybreakSky.update();
  setInterval(() => { if (document.visibilityState === "visible") window.DaybreakSky.update(); }, 60000);
})();
