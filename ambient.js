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

  // Music plays through Web Audio, not an <audio> element. That way Chrome treats it as
  // app sound, not "media": no player notification, no lock-screen controls, and it can't
  // keep going after you leave. Leaving the app suspends the whole sound engine at once.
  let ctx = null, master = null;
  const buffers = new Map(); // track name -> Promise<AudioBuffer>; only the current ones are kept
  function engine() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "playback" });
    master = ctx.createGain();
    master.gain.value = target();
    master.connect(ctx.destination);
    return ctx;
  }
  function load(n) {
    if (!buffers.has(n)) {
      const p = fetch(TRACKS[n]).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b));
      p.catch(() => buffers.delete(n));
      buffers.set(n, p);
    }
    return buffers.get(n);
  }
  // One playing copy of a song, with its own fade.
  function voice(buf, fadeSec, at = 0) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeSec);
    g.connect(master);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g);
    src.start(0, at);
    return { src, g, startedAt: ctx.currentTime }; // ctx time stands still while suspended
  }
  function fadeOut(v, sec) {
    const t = ctx.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(v.g.gain.value, t);
    v.g.gain.linearRampToValueAtTime(0, t + sec);
    try { v.src.stop(t + sec + 0.05); } catch { /* already stopped */ }
    setTimeout(() => { try { v.src.disconnect(); v.g.disconnect(); } catch { /* gone */ } }, sec * 1000 + 300);
  }

  let name = null, cur = null, loopTimer = 0, unlocked = false, token = 0;
  // Seamless loop: a little before the end, start the song again and cross-fade.
  function scheduleLoop(buf) {
    clearTimeout(loopTimer);
    const left = buf.duration - (ctx.currentTime - cur.startedAt) - LOOP_XFADE;
    loopTimer = setTimeout(() => {
      if (!cur || ctx.state !== "running") return;
      const old = cur;
      cur = voice(buf, LOOP_XFADE);
      fadeOut(old, LOOP_XFADE);
      scheduleLoop(buf);
    }, Math.max(1000, left * 1000));
  }
  async function startTrack(n, fadeSec) {
    const my = ++token;
    let buf;
    try { buf = await load(n); } catch { return; }
    if (my !== token || ctx.state !== "running") return;
    const old = cur;
    name = n;
    cur = voice(buf, fadeSec);
    scheduleLoop(buf);
    if (old) fadeOut(old, fadeSec);
    for (const k of buffers.keys()) if (k !== n) buffers.delete(k); // free memory
  }
  async function play() {
    if (!enabled || !unlocked || document.visibilityState !== "visible") return;
    const n = pick(slot());
    if (!n || !engine()) return;
    if (ctx.state === "running" && cur && name === n) return; // already playing this song
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    if (ctx.state !== "running") { try { await ctx.resume(); } catch { return; } }
    // Coming back: fade the whole mix up again.
    master.gain.setValueAtTime(cur && name === n ? 0 : master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(target(), ctx.currentTime + FADE_IN / 1000);
    if (cur && name === n) { resumeLoop(); return; }
    startTrack(n, (cur ? XFADE : FADE_IN) / 1000);
  }
  function pause(ms = FADE_OUT) {
    if (!ctx || !cur) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + ms / 1000);
    const v = cur; cur = null; name = null; token++;
    clearTimeout(loopTimer);
    fadeOut(v, ms / 1000);
  }
  // Leaving the app: freeze all sound instantly.
  function hush() {
    if (!ctx) return;
    clearTimeout(loopTimer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    ctx.suspend().catch(() => {});
  }
  function resumeLoop() {
    if (cur && buffers.has(name)) buffers.get(name).then((b) => { if (cur) scheduleLoop(b); });
  }

  // First tap anywhere unlocks sound, then music fades in.
  const unlock = () => { unlocked = true; play(); };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") play(); else hush();
  });
  window.addEventListener("pagehide", hush);
  setInterval(() => { if (enabled && unlocked && document.visibilityState === "visible" && cur && pick(slot()) !== name) startTrack(pick(slot()), XFADE / 1000); }, 60000);

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
      if (ctx && cur && ctx.state === "running") {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(target(), ctx.currentTime, 0.05);
      } else if (enabled) { unlocked = true; play(); }
    });
  }

  window.DaybreakAmbient = { slot, tracks: TRACKS, play, pause, hush, get playing() { return !!(ctx && cur && ctx.state === "running"); }, get track() { return name; } };
})();
