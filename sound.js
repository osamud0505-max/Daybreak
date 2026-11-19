/* Daybreak sounds: soft "fairy dust" twinkles made on the fly with Web Audio. No audio files.
   Everything uses a major pentatonic scale, gentle (never clicky) attacks, a shimmering
   echo, and very low volume. */
(function () {
  "use strict";
  const KEY = "daybreak-sound";
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch { /* default on */ }
  let ctx = null, out = null;

  function audio() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 1.2;
    // Soften the very top, then add a light, airy echo so notes shimmer instead of ping.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4200;
    lp.Q.value = 0.2;
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2400;
    out.connect(lp);
    lp.connect(ctx.destination);
    lp.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(wet);
    wet.connect(ctx.destination);
    return ctx;
  }

  // One twinkle: a pure sine with a soft 15 ms swell (no click), a faint shimmer partner
  // a few cents sharp, a random spot in the stereo field, and a slow fade.
  function twinkle(freq, when = 0, vol = 0.03, length = 1.1) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + when;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) pan.pan.value = (Math.random() - 0.5) * 0.8;
    [[1, 1], [1.004, 0.5]].forEach(([mult, amt]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * amt, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + length);
      o.connect(g);
      if (pan) { g.connect(pan); } else g.connect(out);
      o.start(t); o.stop(t + length + 0.1);
    });
    if (pan) pan.connect(out);
  }
  // A warm, quiet bed under the bigger moments.
  function glow(freq, when = 0, vol = 0.04, length = 2) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + length + 0.1);
  }

  // High pentatonic notes: C6 D6 E6 G6 A6 C7 D7 E7.
  const HI = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];
  const pick = (from, to) => HI[from + Math.floor(Math.random() * (to - from + 1))];
  const run = (start, count, gap, vol, len) => {
    for (let i = 0; i < count; i++) twinkle(HI[Math.min(HI.length - 1, start + i)], i * gap + Math.random() * 0.012, vol, len);
  };

  const SOUNDS = {
    // Buttons: two tiny high notes, a little different every time.
    tap: () => { twinkle(pick(2, 5), 0, 0.016, 0.7); twinkle(pick(4, 7), 0.06, 0.011, 0.8); },
    // Ticking a task: a rising sprinkle of fairy dust over a warm hum.
    done: () => { glow(523.25, 0, 0.03, 1.6); run(Math.floor(Math.random() * 2), 5, 0.055, 0.022, 1.2); },
    undo: () => twinkle(HI[1], 0, 0.012, 0.6),
    // A finished block: a longer shimmer up, then a soft sparkle back down.
    block: () => {
      glow(392, 0, 0.035, 2.4); glow(523.25, 0.2, 0.025, 2.4);
      run(0, 8, 0.06, 0.02, 1.4);
      [7, 5, 3].forEach((n, i) => twinkle(HI[n], 0.6 + i * 0.12, 0.014, 1.6));
    },
    // The whole day: a slow, magical cascade.
    all: () => {
      glow(261.63, 0, 0.035, 3.2); glow(392, 0.3, 0.03, 3.2); glow(523.25, 0.6, 0.025, 3.2);
      for (let i = 0; i < 16; i++) twinkle(pick(0, 7), i * 0.09 + Math.random() * 0.05, 0.016, 1.6);
    },
    sky: () => run(3, 4, 0.07, 0.018, 1.2),
    start: () => { glow(392, 0, 0.035, 2.6); [5, 3, 2, 0].forEach((n, i) => twinkle(HI[n], i * 0.14, 0.016, 1.6)); },
  };

  window.DaybreakSound = {
    get enabled() { return enabled; },
    set(on) {
      enabled = on;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* ignore */ }
      if (on) SOUNDS.done();
    },
    play(name) { if (enabled && SOUNDS[name]) { try { SOUNDS[name](); } catch { /* audio blocked */ } } },
  };
})();
