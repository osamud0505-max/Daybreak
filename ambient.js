/* Daybreak ambient music: one soft song for each part of the day, matched to the real sky.
   Fades in on your first tap (Chrome won't let a page start sound on its own),
   fades out when you leave the app, fades back in when you return,
   and cross-fades when the time of day changes. Songs loop with a soft cross-fade. */
(function () {
  "use strict";
  // Songs you've made. Missing ones fall back to the nearest one that exists.
  const TRACKS = {
    morning: "ambient/morning.m4a",
    midday: "ambient/midday.m4a",
    golden: "ambient/golden.m4a",
    night: "ambient/night.m4a",
    late: "ambient/late.m4a",
  };
  const ORDER = ["morning", "midday", "golden", "night", "late"];
  const VOLUME = 0.45, FADE_IN = 3000, FADE_OUT = 900, XFADE = 5000, LOOP_XFADE = 6;
  const KEY = "daybreak-music";
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch { /* storage blocked */ }

  // Which song fits right now, from the real sun (sky.js) and the clock.
  function slot() {
    const now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    const S = window.DaybreakSky;
    const e = S ? S.sunElev(Date.now()) : (h > 7 && h < 17 ? 20 : -20);
    if (h >= 22.5 || h < 4) return "late";
    if (e < -6) return "night";
    if (h >= 12 && e < 12) return "golden";
    if (h < 11.5) return "morning";
    return "midday";
  }
  function pick(want) {
    if (TRACKS[want]) return want;
    const i = ORDER.indexOf(want);
    for (let d = 1; d < ORDER.length; d++) {
      for (const j of [i - d, i + d]) if (ORDER[j] && TRACKS[ORDER[j]]) return ORDER[j];
    }
    return null;
  }

  // Each "deck" is an audio element with its own smooth volume ramp.
  function deck(src) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0;
    let raf = 0;
    const ramp = (to, ms, then) => {
      cancelAnimationFrame(raf);
      const from = a.volume, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        a.volume = Math.max(0, Math.min(1, from + (to - from) * (k * k * (3 - 2 * k))));
        if (k < 1) raf = requestAnimationFrame(step); else if (then) then();
      };
      raf = requestAnimationFrame(step);
    };
    return { a, ramp };
  }

  let name = null, cur = null, unlocked = false, looping = null;
  function startTrack(n, fadeMs) {
    const old = cur;
    name = n;
    cur = deck(TRACKS[n]);
    cur.a.play().then(() => cur.ramp(VOLUME, fadeMs)).catch(() => {});
    watchLoop(cur);
    if (old) old.ramp(0, fadeMs, () => { old.a.pause(); old.a.src = ""; });
  }
  // Seamless loop: shortly before the end, start the same song again and cross-fade.
  function watchLoop(d) {
    d.a.addEventListener("timeupdate", () => {
      if (d !== cur || !d.a.duration || d.a.currentTime < d.a.duration - LOOP_XFADE) return;
      if (looping === d) return;
      looping = d;
      startTrack(name, LOOP_XFADE * 1000);
    });
  }
  function play() {
    if (!enabled || !unlocked || document.visibilityState !== "visible") return;
    const n = pick(slot());
    if (!n) return;
    if (cur && name === n && !cur.a.paused) return;
    if (cur && name === n) { cur.a.play().then(() => cur.ramp(VOLUME, FADE_IN)).catch(() => {}); return; }
    startTrack(n, cur ? XFADE : FADE_IN);
  }
  function pause(ms = FADE_OUT) {
    if (!cur) return;
    const d = cur;
    d.ramp(0, ms, () => d.a.pause());
  }

  // First tap anywhere unlocks sound, then music fades in.
  const unlock = () => { unlocked = true; play(); };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  document.addEventListener("visibilitychange", () => (document.visibilityState === "visible" ? play() : pause(400)));
  window.addEventListener("pagehide", () => pause(200));
  setInterval(() => { if (enabled && unlocked && document.visibilityState === "visible" && cur && pick(slot()) !== name) play(); }, 60000);

  // Music on/off switch in the footer (Me tab), next to "Sounds on".
  const btn = document.getElementById("musicBtn");
  if (btn) {
    const label = () => btn.setAttribute("aria-checked", String(enabled));
    label();
    btn.addEventListener("click", () => {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch { /* storage blocked */ }
      label();
      if (enabled) { unlocked = true; play(); } else pause(800);
    });
  }

  window.DaybreakAmbient = { slot, tracks: TRACKS, play, pause };
})();
