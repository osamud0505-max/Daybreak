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
    out.gain.value = 0.4;
    // Low-pass keeps everything round and muffled, with no bright edges.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.3;
    out.connect(lp);
    lp.connect(ctx.destination);
    return ctx;
  }

  // A soft hum: a pure low sine that swells in slowly and fades out slowly.
  // No sharp start and no overtones, so it never "dings".
  function hum(freq, when = 0, vol = 0.1, length = 1.6) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + length + 0.1);
  }

  // Low, warm notes (around middle C), soft and spaced out.
  const N = { G3: 196, A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392 };
  const SOUNDS = {
    done: () => { hum(N.C4, 0, 0.09, 1.4); hum(N.G4, 0.16, 0.05, 1.6); },
    undo: () => {},
    block: () => [N.C4, N.E4, N.G4].forEach((f, i) => hum(f, i * 0.22, 0.07, 1.8)),
    all: () => [N.G3, N.C4, N.E4, N.G4].forEach((f, i) => hum(f, i * 0.3, 0.07, 2.4)),
    sky: () => hum(N.E4, 0, 0.05, 1.2),
    start: () => { hum(N.G3, 0, 0.07, 2.6); hum(N.D4, 0.3, 0.04, 2.6); },
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
