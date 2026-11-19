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
  const FADE_IN = 3000, FADE_OUT = 900, XFADE = 5000, LOOP_XFADE = 6;
  const KEY = "daybreak-music";
  const VOL_KEY = "daybreak-music-volume";
  let enabled = true, level = 45; // level is 0-100 from the Settings slider
  try {
    enabled = localStorage.getItem(KEY) !== "off";
    const v = parseInt(localStorage.getItem(VOL_KEY), 10);
    if (v >= 0 && v <= 100) level = v;
  } catch { /* storage blocked */ }
  // Ears hear loudness on a curve, so square the slider for an even feel.
  const target = () => Math.pow(level / 100, 2);

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
    const stop = () => cancelAnimationFrame(raf);
    const ramp = (to, ms, then) => {
      cancelAnimationFrame(raf);
      // Chrome freezes animation frames in the background, so never rely on them there.
      if (document.visibilityState !== "visible") { a.volume = Math.max(0, Math.min(1, to)); if (then) then(); return; }
      const from = a.volume, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        a.volume = Math.max(0, Math.min(1, from + (to - from) * (k * k * (3 - 2 * k))));
        if (k < 1) raf = requestAnimationFrame(step); else if (then) then();
      };
      raf = requestAnimationFrame(step);
    };
    const d = { a, ramp, stop };
    decks.add(d);
    return d;
  }
  const decks = new Set();
  function drop(d) { d.stop(); d.a.pause(); d.a.removeAttribute("src"); d.a.load(); decks.delete(d); }

  let name = null, cur = null, unlocked = false, looping = null;
  function startTrack(n, fadeMs) {
    const old = cur;
    name = n;
    cur = deck(TRACKS[n]);
    cur.a.play().then(() => cur.ramp(target(), fadeMs)).catch(() => {});
    watchLoop(cur);
    if (old) old.ramp(0, fadeMs, () => drop(old));
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
    if (cur && name === n) { cur.a.play().then(() => cur.ramp(target(), FADE_IN)).catch(() => {}); return; }
    startTrack(n, cur ? XFADE : FADE_IN);
  }
  function pause(ms = FADE_OUT) {
    if (!cur) return;
    const d = cur;
    d.ramp(0, ms, () => d.a.pause());
    for (const o of decks) if (o !== cur) drop(o);
  }
  // Leaving the app: silence everything right away, no fade (a fade can't run in the background).
  function hush() {
    for (const d of decks) { d.stop(); d.a.volume = 0; d.a.pause(); if (d !== cur) drop(d); }
    looping = null;
  }

  // First tap anywhere unlocks sound, then music fades in.
  const unlock = () => { unlocked = true; play(); };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  document.addEventListener("visibilitychange", () => (document.visibilityState === "visible" ? play() : hush()));
  window.addEventListener("pagehide", hush);
  window.addEventListener("blur", () => { if (document.visibilityState !== "visible") hush(); });
  // Stop Chrome from offering background playback controls for the music.
  if ("mediaSession" in navigator) {
    try { navigator.mediaSession.setActionHandler("play", () => { if (document.visibilityState === "visible") play(); }); } catch { /* unsupported */ }
    try { navigator.mediaSession.setActionHandler("pause", hush); } catch { /* unsupported */ }
  }
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

  // Volume slider in Settings.
  const slider = document.getElementById("musicVol");
  if (slider) {
    slider.value = level;
    const paint = () => slider.style.setProperty("--fill", level + "%");
    paint();
    slider.addEventListener("input", () => {
      level = +slider.value; paint();
      try { localStorage.setItem(VOL_KEY, String(level)); } catch { /* storage blocked */ }
      if (cur && !cur.a.paused) { cur.stop(); cur.a.volume = target(); }
      else if (enabled) { unlocked = true; play(); }
    });
  }

  window.DaybreakAmbient = { slot, tracks: TRACKS, play, pause, hush, get playing() { return [...decks].filter((d) => !d.a.paused).length; } };
})();
