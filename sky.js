/* Daybreak sky: a full-screen dreamy scene that follows the real sun and moon over Toronto.
   Layered mountains and hills, drifting cloud banks, a haloed sun and moon, stars, aurora and shooting stars.
   Pure DOM + SVG, no images. */
(function () {
  "use strict";
  const sky = document.getElementById("sky");
  if (!sky) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const div = (cls, html = "") => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; return d; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  sky.innerHTML = "";
  const HORIZON = 250; // px from the top of the screen where the land begins

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

  // ---------- colours by sun height ----------
  // [elevation, sky top, sky middle, horizon glow, far mountains, mid mountains, near mountains, ground, cloud]
  const LIGHT = [
    [-18, "#120e3a", "#241a63", "#3b2a86", "#2c2170", "#231a5e", "#1c154f", "#211862", "rgba(190,170,255,.28)"],
    [-8, "#1d1652", "#3a2a86", "#6a4aa8", "#45338a", "#38297a", "#2d2169", "#33266f", "rgba(205,180,255,.38)"],
    [-3, "#3d2f8f", "#8a5fb8", "#ff9fc4", "#7552a6", "#614496", "#503886", "#6b4a9c", "rgba(255,195,228,.62)"],
    [1, "#6f5fcf", "#d58fc8", "#ffc0a8", "#a274bc", "#8a62ae", "#74519e", "#b689c6", "rgba(255,212,232,.86)"],
    [6, "#8e8cec", "#e9b6dc", "#ffdcc8", "#a99be0", "#9282d4", "#7c6cc6", "#c9b6f0", "rgba(255,242,250,.92)"],
    [16, "#9fa6f6", "#dcc6fb", "#ffe2ee", "#ad9fe8", "#958ade", "#8274d2", "#d6c8fa", "rgba(255,255,255,.94)"],
    [45, "#a3acfa", "#d9c9fd", "#ffe6f1", "#b1a6ec", "#9a90e2", "#8679d6", "#ddd0fc", "rgba(255,255,255,.95)"]];
  const hex = (h) => { const m = h.match(/\d*\.?\d+/g); return h[0] === "#" ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) : m.map(Number).concat(m.length < 4 ? [1] : []); };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); const v = A.map((x, i) => x + (B[i] - x) * t);
    return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${v[3].toFixed(2)})`; };
  function palette(e, dark) {
    let row;
    if (e <= LIGHT[0][0]) row = LIGHT[0].slice(1);
    else if (e >= LIGHT[LIGHT.length - 1][0]) row = LIGHT[LIGHT.length - 1].slice(1);
    else for (let i = 1; i < LIGHT.length; i++) if (e <= LIGHT[i][0]) {
      const t = (e - LIGHT[i - 1][0]) / (LIGHT[i][0] - LIGHT[i - 1][0]);
      row = LIGHT[i].slice(1).map((c, j) => mix(LIGHT[i - 1][j + 1], c, t)); break;
    }
    row = row.map((c) => mix(c, c, 0));
    // Dark mode: the same scene, dimmed toward deep violet.
    return dark ? row.map((c, j) => j === 7 ? c : mix(c, "#140f30", 0.45)) : row;
  }

  // ---------- layers (back to front) ----------
  const stars = div("stars");
  for (let i = 0; i < 46; i++) {
    const sparkle = i % 6 === 0;
    const st = div(sparkle ? "star sparkly" : "star",
      sparkle ? '<svg viewBox="0 0 24 24"><path d="M12 1c.8 6 3.6 9.6 11 11-7.4 1.4-10.2 5-11 11-.8-6-3.6-9.6-11-11 7.4-1.4 10.2-5 11-11z"/></svg>' : "");
    st.style.left = `${rand(1, 99)}%`;
    st.style.top = `${Math.pow(Math.random(), 1.4) * (HORIZON - 30)}px`;
    const size = sparkle ? rand(9, 15) : rand(1.5, 3.6);
    st.style.width = st.style.height = `${size}px`;
    st.style.animationDuration = `${rand(2.5, 6)}s`;
    st.style.animationDelay = `${-rand(0, 6)}s`;
    stars.append(st);
  }
  const aurora = div("night-aurora", "<i></i><i></i><i></i>");
  const shooting = div("shooting");
  const glow = div("sunglow");
  const beams = div("sunbeams");
  const rainbow = div("rainbow", '<svg viewBox="0 0 200 100" preserveAspectRatio="none">' +
    ["#ffc4dc", "#ffd9b8", "#fff0b8", "#c9f0d8", "#bfe2ff", "#dcc8ff"].map((c, i) =>
      `<path d="M${10 + i * 6} 100a${90 - i * 6} ${90 - i * 6} 0 0 1 ${180 - i * 12} 0" stroke="${c}" stroke-width="6.5" fill="none"/>`).join("") + "</svg>");

  const sun = div("celestial sun", `<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
    <svg viewBox="0 0 100 100"><defs><radialGradient id="sunBody" cx="42%" cy="38%">
      <stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="var(--sun-a)"/><stop offset="1" stop-color="var(--sun-b)"/></radialGradient></defs>
      <circle cx="50" cy="50" r="40" fill="url(#sunBody)"/></svg>`);
  const moon = div("celestial moon", `<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
    <svg viewBox="0 0 100 100"><defs>
      <mask id="phaseMask"><rect width="100" height="100" fill="#fff"/><circle id="phaseShadow" cx="20" cy="50" r="40" fill="#000"/></mask>
      <radialGradient id="moonBody" cx="40%" cy="38%"><stop offset="0" stop-color="#fffef8"/><stop offset=".7" stop-color="#fbf1ff"/><stop offset="1" stop-color="#e6d8ff"/></radialGradient></defs>
      <circle cx="50" cy="50" r="39" class="moon-ghost"/>
      <circle cx="50" cy="50" r="39" fill="url(#moonBody)" mask="url(#phaseMask)"/>
      <g class="craters"><circle cx="38" cy="40" r="5"/><circle cx="60" cy="58" r="7"/><circle cx="45" cy="66" r="3.5"/></g></svg>`);

  // Cloud banks: puffy tops, flat bottoms, with long soft streaks (drift slowly across).
  const bank = (w) => {
    let d = "M0 60 V44", x = 0, i = 0;
    while (x < w - 8) { const r = Math.min(10 + ((i * 29) % 17), (w - x) / 2); d += ` a${r} ${(r * (0.75 + (i % 3) * 0.12)).toFixed(1)} 0 0 1 ${2 * r} 0`; x += 2 * r; i++; }
    return `<svg viewBox="0 0 ${w} 60" preserveAspectRatio="none"><path d="${d} V60 Z"/></svg>`;
  };
  const clouds = div("clouds");
  [
    { w: 340, top: HORIZON - 80, h: 46, dur: 260, delay: -40, o: 0.95 },
    { w: 260, top: HORIZON - 150, h: 34, dur: 340, delay: -200, o: 0.7 },
    { w: 220, top: 44, h: 26, dur: 420, delay: -120, o: 0.45 },
  ].forEach((c) => {
    const el = div("cloud-bank", bank(c.w));
    Object.assign(el.style, { width: `${c.w}px`, height: `${c.h}px`, top: `${c.top}px`, opacity: c.o, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` });
    clouds.append(el);
  });
  [[HORIZON - 58, 46, 0], [HORIZON - 100, 30, 1], [HORIZON - 36, 60, 2], [120, 22, 3]].forEach(([top, w, i]) => {
    const st = div("streak");
    Object.assign(st.style, { top: `${top}px`, width: `${w}%`, animationDuration: `${180 + i * 70}s`, animationDelay: `${-i * 50}s` });
    clouds.append(st);
  });

  // A sea of big fluffy clouds resting on the hills, and glints that pop all over the sky.
  const puff = (seed, n) => { let d = ""; for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 800 + ((seed * (i + 3) * 37) % 40) - 20;
      const r = 34 + ((seed * (i + 7) * 53) % 38); d += `<circle cx="${x.toFixed(0)}" cy="${(96 - r * 0.55).toFixed(0)}" r="${r}"/>`; } return d; };
  const cloudSea = div("cloud-sea", `<svg viewBox="0 0 800 110" preserveAspectRatio="none"><defs>
      <linearGradient id="seaA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--cloud-top)"/><stop offset="1" stop-color="var(--cloud-shade)"/></linearGradient></defs>
      <g class="sea-back">${puff(3, 13)}</g><g class="sea-front" fill="url(#seaA)">${puff(7, 15)}</g></svg>`);
  const glints = div("glints");
  for (let i = 0; i < 14; i++) {
    const g = div("glint", '<svg viewBox="0 0 24 24"><path d="M12 1c.8 6 3.6 9.6 11 11-7.4 1.4-10.2 5-11 11-.8-6-3.6-9.6-11-11 7.4-1.4 10.2-5 11-11z"/></svg>');
    const size = rand(10, 22);
    Object.assign(g.style, { left: `${rand(2, 96)}%`, top: `${rand(2, 96)}vh`, width: `${size}px`, height: `${size}px`, animationDuration: `${rand(3.5, 7)}s`, animationDelay: `${-rand(0, 7)}s` });
    glints.append(g);
  }
  const land = div("land", `<svg class="mtn far" viewBox="0 0 400 100" preserveAspectRatio="none">
      <path d="M0 70 L30 48 Q40 38 52 46 L80 30 Q92 20 104 30 L140 52 Q150 58 162 50 L196 26 Q208 16 222 28 L262 56 L290 40 Q300 33 312 40 L352 22 Q364 14 376 26 L400 40 V100 H0 Z"/></svg>
    <svg class="mtn mid" viewBox="0 0 400 100" preserveAspectRatio="none">
      <path d="M0 60 Q20 40 44 54 Q60 30 78 22 Q92 16 104 34 Q120 60 150 58 Q176 34 196 40 Q214 46 236 30 Q250 22 262 36 Q282 62 312 54 Q336 30 360 36 Q384 44 400 32 V100 H0 Z"/></svg>
    <svg class="mtn near" viewBox="0 0 400 100" preserveAspectRatio="none">
      <path d="M0 72 Q40 44 90 62 Q130 76 170 58 Q214 38 262 60 Q300 76 340 56 Q372 42 400 54 V100 H0 Z"/></svg>
    <div class="ground"><span class="shine"></span><span class="mist m1"></span><span class="mist m2"></span></div>`);

  sky.append(stars, aurora, shooting, rainbow, glow, beams, sun, moon, clouds, land, cloudSea, glints);

  // A tap on the sun or moon makes it wiggle (and chime, if sounds are on).
  [sun, moon].forEach((c) => c.addEventListener("click", () => {
    c.classList.remove("wiggle"); void c.offsetWidth; c.classList.add("wiggle");
    if (window.DaybreakSound) window.DaybreakSound.play("sky");
  }));

  // ---------- shooting stars ----------
  function shoot() {
    const n = document.body.classList.contains("night");
    if (!reduce && n && document.visibilityState === "visible") {
      const k = Math.random() < 0.35 ? 2 : 1;
      for (let j = 0; j < k; j++) {
        const s = div("shooter");
        s.style.left = `${rand(30, 105)}%`;
        s.style.top = `${rand(-10, HORIZON - 40)}px`;
        s.style.setProperty("--len", `${rand(120, 220)}px`);
        s.style.animationDelay = `${j * rand(0.2, 0.6)}s`;
        shooting.append(s);
        setTimeout(() => s.remove(), 2600);
      }
    }
    setTimeout(shoot, n ? rand(1400, 4500) : 5000);
  }
  setTimeout(shoot, 1200);

  const place = (elm, frac, elev, peak, size) => {
    // x: rises on the left (east), sets on the right (west). y: by real height; at the horizon it sinks behind the hills.
    const cy = HORIZON + 6 - clamp(elev / peak, -0.4, 1) * (HORIZON - 52);
    elm.style.left = `calc(${clamp(frac).toFixed(4)} * (100% - ${size + 8}px) + 4px)`;
    elm.style.top = `${(cy - size / 2).toFixed(1)}px`;
    return cy;
  };

  window.DaybreakSky = {
    sunElev, sunDay, moonPhase,
    // Returns "dawn" | "day" | "dusk" | "night" from the real sun.
    update(at) {
      const ms = at ? +at : Date.now();
      const e = sunElev(ms);
      const today = sunDay(ms);
      const morning = ms < (today.rise + today.set) / 2;
      const period = e > 6 ? "day" : e < -6 ? "night" : morning ? "dawn" : "dusk";
      const body = document.body;
      body.dataset.period = period;
      body.classList.toggle("night", e < -4);
      body.classList.toggle("twilight", e < 7);
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const [top, mid, horizon, far, midM, near, ground, cloud] = palette(e, dark);
      const st = body.style;
      [["--sky-top", top], ["--sky-mid", mid], ["--sky-horizon", horizon], ["--mtn-far", far], ["--mtn-mid", midM],
       ["--mtn-near", near], ["--ground", ground], ["--cloud", cloud], ["--cloud-shade", mix(far, "#ffffff", 0.35)], ["--cloud-top", mix("#ffffff", far, clamp((-e + 2) / 12) * 0.55)]].forEach(([k, v]) => st.setProperty(k, v));

      // Sun: warmer and bigger-glowing near the horizon.
      const sunFrac = (ms - today.rise) / (today.set - today.rise);
      const sunY = place(sun, sunFrac, e, today.peak, 84);
      const warm = clamp(1 - e / 14);
      sun.style.setProperty("--sun-a", mix("#fff1a8", "#ffd39a", warm));
      sun.style.setProperty("--sun-b", mix("#ffd46e", "#ff9f8a", warm));
      const sunVis = clamp((e + 4) / 5);
      sun.style.opacity = sunVis.toFixed(2);
      sun.style.display = sunVis > 0 ? "block" : "none";
      const sx = `calc(${clamp(sunFrac).toFixed(4)} * (100% - 92px) + 46px)`;
      glow.style.left = beams.style.left = sx;
      glow.style.top = beams.style.top = `${sunY.toFixed(1)}px`;
      glow.style.opacity = (clamp(1 - Math.abs(e - 1) / 12) * 0.95 + 0.2 * clamp(e / 20)).toFixed(2);
      beams.style.opacity = ((dark ? 0.25 : 0.5) * clamp((e - 4) / 10)).toFixed(2);
      rainbow.style.opacity = (0.35 * clamp((e - 8) / 10) * clamp((today.peak - e + 12) / 12)).toFixed(2);

      // Moon: crosses from sunset to the next sunrise, showing tonight's real phase.
      const night = clamp((-e - 1) / 6);
      let set = today.set, rise = sunDay(ms + 86400000).rise;
      if (ms < today.rise) { set = sunDay(ms - 86400000).set; rise = today.rise; }
      const mFrac = (ms - set) / (rise - set);
      place(moon, mFrac, Math.sin(Math.PI * clamp(mFrac)) * 50, 50, 70);
      moon.style.display = night > 0 ? "block" : "none";
      moon.style.opacity = night.toFixed(2);
      const p = moonPhase(ms);
      const k = clamp(p < 0.5 ? p / 0.5 : (1 - p) / 0.5, 0.2, 1); // 0 new .. 1 full (always a sliver)
      const dir = p < 0.5 ? -1 : 1; // waxing: lit on the right
      moon.querySelector("#phaseShadow").setAttribute("cx", (50 + dir * (14 + k * 76)).toFixed(1));
      moon.dataset.phase = p.toFixed(2);

      aurora.style.opacity = (night * 0.85).toFixed(2);
      stars.style.opacity = Math.max(0.32, clamp((-e + 1) / 9)).toFixed(2);
      return period;
    },
  };
  window.DaybreakSky.update();
  setInterval(() => { if (document.visibilityState === "visible") window.DaybreakSky.update(); }, 60000);
})();
