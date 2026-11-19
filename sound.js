/* Daybreak sounds: soft, warm chimes made on the fly with Web Audio. No audio files.
   Notes come from a major pentatonic scale, so any combination sounds gentle. */
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
    // Master volume and a tiny echo to make it feel warm and roomy.
    out = ctx.createGain();
    out.gain.value = 0.55;
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.18;
    const fb = ctx.createGain();
    fb.gain.value = 0.25;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    out.connect(lp);
    lp.connect(ctx.destination);
    lp.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(ctx.destination);
    return ctx;
  }

  // A soft bell: sine fundamental plus a quiet octave, quick attack, long gentle fade.
  function bell(freq, when = 0, vol = 0.12, length = 1.4) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + when;
    [[1, 1], [2, 0.18], [3, 0.05]].forEach(([mult, amt]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * amt, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + length / mult);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + length + 0.1);
    });
  }

  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.5, G4: 392, A4: 440 };
  const SOUNDS = {
    tap: () => bell(N.G5, 0, 0.035, 0.35),
    done: () => { bell(N.E5, 0, 0.11); bell(N.A5, 0.09, 0.1); },
    undo: () => bell(N.A4, 0, 0.05, 0.6),
    block: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, i * 0.09, 0.09)),
    all: () => [N.C5, N.E5, N.G5, N.A5, N.C6, N.E6].forEach((f, i) => bell(f, i * 0.11, 0.09, 1.8)),
    sky: () => { bell(N.D6, 0, 0.06, 0.9); bell(N.A5, 0.07, 0.05, 0.9); },
    start: () => { bell(N.G4, 0, 0.08, 2.2); bell(N.D5, 0.25, 0.06, 2.2); },
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
