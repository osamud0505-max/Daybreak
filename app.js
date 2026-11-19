/* Daybreak: a quiet discipline log. Everything is stored on this device (localStorage). */
(() => {
  "use strict";

  const KEY = "daily-discipline-v1";
  const MAX_HABITS = 8;
  const NO_PHONE = "nophone";

  const DEFAULT = {
    habits: [
      { id: "wake", name: "Up on time" },
      { id: "walk", name: "Walk" },
      { id: "school", name: "School work" },
      { id: "tesol", name: "TESOL course" },
      { id: "meal", name: "Cooked something nourishing" },
      { id: "read", name: "Read" },
      { id: "write", name: "Write" },
      { id: NO_PHONE, name: "No-phone time" },
    ],
    log: {},   // "YYYY-MM-DD": { done: [], plan, well, fix, focusMin }
    timer: null, // { start, minutes }
  };

  // ---------- storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...structuredClone(DEFAULT), ...JSON.parse(raw) } : structuredClone(DEFAULT);
    } catch {
      return structuredClone(DEFAULT);
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }
  let state = load();

  // Ask the browser not to clear our data under storage pressure.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- dates ----------
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  const day = (k) => (state.log[k] ||= { done: [] });
  const isDone = (id, k) => (state.log[k]?.done || []).includes(id);

  function streak(id) {
    let d = new Date();
    if (!isDone(id, keyOf(d))) d = shift(d, -1);
    let n = 0;
    while (isDone(id, keyOf(d))) { n++; d = shift(d, -1); }
    return n;
  }

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    kids.forEach((k) => n.append(k));
    return n;
  };
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const LEAF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/></svg>';

  // ---------- sky + header ----------
  function renderSky() {
    const h = new Date().getHours();
    const period = h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 17 ? "day" : h >= 17 && h < 21 ? "dusk" : "night";
    document.body.dataset.period = period;
    $("greeting").textContent =
      { dawn: "Good morning", day: "Good day", dusk: "Good evening", night: "Rest well" }[period];
    // Orb arcs across the sky between 5:00 and 21:00.
    const t = Math.min(1, Math.max(0, (h + new Date().getMinutes() / 60 - 5) / 16));
    const orb = $("orb");
    orb.style.right = `${8 + t * 70}%`;
    orb.style.top = `${30 + Math.pow(2 * t - 1, 2) * 100}px`;
  }

  function renderHeader() {
    const now = new Date();
    $("date").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const total = state.habits.length;
    const done = state.habits.filter((h) => isDone(h.id, todayKey())).length;
    $("count").textContent = `${done} / ${total}`;
    $("bar").style.width = total ? `${(done / total) * 100}%` : "0";
  }

  // ---------- intention ----------
  function renderPlan() {
    const plan = state.log[todayKey()]?.plan;
    $("planForm").hidden = !!plan;
    $("planText").hidden = !plan;
    $("planText").textContent = plan || "";
  }
  $("planForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("planInput").value.trim();
    if (!v) return;
    day(todayKey()).plan = v;
    save(); renderPlan();
  });
  $("planText").addEventListener("click", () => {
    $("planInput").value = state.log[todayKey()]?.plan || "";
    $("planForm").hidden = false; $("planText").hidden = true;
    $("planInput").focus();
  });

  // ---------- habits ----------
  function renderHabits() {
    const list = $("habits");
    list.replaceChildren();
    const tk = todayKey();
    const week = Array.from({ length: 7 }, (_, i) => shift(new Date(), i - 6));
    state.habits.forEach((h) => {
      const done = isDone(h.id, tk);
      const s = streak(h.id);
      const btn = el("button", { type: "button", className: `habit${done ? " done" : ""}` });
      btn.setAttribute("aria-pressed", String(done));
      const check = el("span", { className: "check", innerHTML: CHECK_SVG });
      const name = el("span", { className: "habit-name", textContent: h.name });
      const dots = el("span", { className: "week" });
      week.forEach((d) => {
        const k = keyOf(d);
        dots.append(el("i", { className: `${isDone(h.id, k) ? "on" : ""}${k === tk ? " today" : ""}` }));
      });
      const main = el("span", { className: "habit-main" }, name, dots);
      const st = el("span", { className: `streak${s ? " on" : ""}`, innerHTML: `${LEAF_SVG}${s}` });
      st.title = `${s} day streak`;
      btn.append(check, main, st);
      btn.addEventListener("click", () => {
        const d = day(tk);
        d.done = d.done.includes(h.id) ? d.done.filter((x) => x !== h.id) : [...d.done, h.id];
        if (navigator.vibrate) navigator.vibrate(8);
        save(); renderAll();
      });
      list.append(el("li", {}, btn));
    });
  }

  // ---------- editor ----------
  let editing = false;
  $("editBtn").addEventListener("click", () => {
    editing = !editing;
    $("editBtn").textContent = editing ? "Done" : "Edit";
    $("habits").hidden = editing;
    $("editor").hidden = !editing;
    if (editing) renderEditor(); else renderAll();
  });
  function renderEditor() {
    const ul = $("editList");
    ul.replaceChildren();
    state.habits.forEach((h) => {
      const input = el("input", { type: "text", value: h.name, maxLength: 40 });
      input.addEventListener("change", () => { h.name = input.value.trim() || h.name; save(); });
      const rm = el("button", { type: "button", className: "icon-btn", textContent: "×" });
      rm.setAttribute("aria-label", `Remove ${h.name}`);
      rm.addEventListener("click", () => {
        state.habits = state.habits.filter((x) => x.id !== h.id);
        save(); renderEditor();
      });
      ul.append(el("li", { className: "edit-row" }, input, rm));
    });
    const full = state.habits.length >= MAX_HABITS;
    $("addInput").disabled = full;
    $("addInput").placeholder = full ? "8 is the limit. Remove one first." : "Add a habit";
  }
  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("addInput").value.trim();
    if (!v || state.habits.length >= MAX_HABITS) return;
    state.habits.push({ id: `h${Date.now()}`, name: v });
    $("addInput").value = "";
    save(); renderEditor();
  });

  // ---------- no-phone timer ----------
  let tick = null;
  const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  function stopTimer(completed) {
    const t = state.timer;
    if (!t) return;
    const k = keyOf(new Date(t.start));
    const d = day(k);
    const mins = Math.min(t.minutes, Math.floor((Date.now() - t.start) / 60000));
    d.focusMin = (d.focusMin || 0) + mins;
    if (completed && state.habits.some((h) => h.id === NO_PHONE) && !d.done.includes(NO_PHONE)) d.done.push(NO_PHONE);
    state.timer = null;
    save(); renderAll();
  }
  function renderFocus() {
    const t = state.timer;
    const mins = state.log[todayKey()]?.focusMin || 0;
    $("focusTotal").textContent = mins ? `· ${mins} min today` : "";
    $("focusIdle").hidden = !!t;
    $("focusRun").hidden = !t;
    clearInterval(tick);
    if (!t) return;
    const update = () => {
      const left = t.start + t.minutes * 60000 - Date.now();
      $("timeLeft").textContent = fmt(left);
      if (left <= 0) stopTimer(true);
    };
    update();
    tick = setInterval(update, 1000);
  }
  document.querySelectorAll("[data-min]").forEach((b) =>
    b.addEventListener("click", () => {
      state.timer = { start: Date.now(), minutes: Number(b.dataset.min) };
      save(); renderFocus();
    })
  );
  $("stopBtn").addEventListener("click", () => stopTimer(false));

  // ---------- evening ----------
  let eveningOpened = false;
  function renderEvening() {
    const d = state.log[todayKey()] || {};
    const isEvening = new Date().getHours() >= 17;
    const hasEntry = !!(d.well || d.fix);
    const show = isEvening || hasEntry || eveningOpened;
    $("eveningBody").hidden = !show;
    $("eveningEarly").hidden = show;
    if (document.activeElement !== $("well")) $("well").value = d.well || "";
    if (document.activeElement !== $("fix")) $("fix").value = d.fix || "";
  }
  $("eveningEarly").addEventListener("click", () => { eveningOpened = true; renderEvening(); });
  $("saveEvening").addEventListener("click", () => {
    const d = day(todayKey());
    d.well = $("well").value.trim();
    d.fix = $("fix").value.trim();
    save();
    $("savedNote").hidden = false;
    setTimeout(() => ($("savedNote").hidden = true), 1600);
  });

  // ---------- month ----------
  function renderMonth() {
    const m = $("month");
    m.replaceChildren();
    const total = state.habits.length || 1;
    const tk = todayKey();
    for (let i = 27; i >= 0; i--) {
      const d = shift(new Date(), -i);
      const k = keyOf(d);
      const n = state.habits.filter((h) => isDone(h.id, k)).length;
      const pct = Math.round((n / total) * 85);
      const cell = el("div", { className: `d${k === tk ? " today" : ""}`, textContent: d.getDate() });
      if (n) {
        cell.style.background = `color-mix(in srgb, var(--sage) ${pct}%, transparent)`;
        if (pct > 50) cell.style.color = "var(--bg)";
      }
      cell.title = `${k}: ${n} of ${total}`;
      m.append(cell);
    }
  }

  // ---------- backup ----------
  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `daybreak-backup-${todayKey()}.json` });
    document.body.append(a); a.click(); a.remove();
  });
  $("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.habits) || typeof data.log !== "object") throw new Error("bad file");
      state = { ...structuredClone(DEFAULT), ...data };
      save(); renderAll();
    } catch {
      $("importFile").value = "";
    }
  });

  // ---------- go ----------
  function renderAll() {
    renderSky(); renderHeader(); renderPlan(); renderHabits(); renderFocus(); renderEvening(); renderMonth();
  }
  renderAll();

  // Refresh when the app comes back to the foreground (new day, timer done, sky moved).
  let lastDay = todayKey();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (todayKey() !== lastDay) { lastDay = todayKey(); eveningOpened = false; }
    renderAll();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
