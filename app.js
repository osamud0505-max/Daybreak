/* Daybreak: a quiet discipline log. Everything you tick is stored on this device (localStorage).
   The routine (times and pushes) lives in routine.json, recipes in recipes.json. */
(() => {
  "use strict";

  const KEY = "daily-discipline-v1";
  const MEAL_TASK = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner" };

  // ---------- storage ----------
  const blank = () => ({ log: {}, timer: null, firstDay: null, meal: {} });
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
    } catch { return blank(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }
  let state = load();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const S = window.DaybreakSchedule;
  let routine = null;
  let tasks = [];
  let recipes = { breakfast: [], lunch: [], dinner: [] };
  let workouts = null;
  const tasksOn = (k) => (routine ? S.tasksFor(routine, k) : []);
  const loadTasks = () => { tasks = tasksOn(todayKey()); };

  // ---------- dates ----------
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  const day = (k) => (state.log[k] ||= { done: [] });
  const isDone = (id, k) => (state.log[k]?.done || []).includes(id);
  const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const fmtTime = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  const blockOf = (t) => { const m = t.min; return m < 660 ? "Morning" : m < 1020 ? "Day" : m < 1260 ? "Evening" : "Night"; };

  // Is this task on the schedule for that date? (Gym nights, home-stretch nights.)
  const scheduledOn = (t, d) => !t.days || t.days.includes(d.getDay());

  // Streak counts scheduled days only, so a rest night doesn't break the gym streak.
  function streak(t) {
    let d = new Date();
    if (!scheduledOn(t, d) || !isDone(t.id, keyOf(d))) d = shift(d, -1);
    let n = 0;
    for (let i = 0; i < 400; i++, d = shift(d, -1)) {
      if (!scheduledOn(t, d)) continue;
      if (!isDone(t.id, keyOf(d))) break;
      n++;
    }
    return n;
  }
  // "Never miss twice": only judge days since you started using the app.
  const yesterdayKey = () => keyOf(shift(new Date(), -1));
  const countsYesterday = () => state.firstDay && yesterdayKey() >= state.firstDay;
  // Tag a task only when yesterday broke a habit you actually had going (done on its previous scheduled day).
  function missedYesterday(t) {
    const y = shift(new Date(), -1);
    if (!countsYesterday() || !scheduledOn(t, y) || isDone(t.id, keyOf(y))) return false;
    let d = shift(y, -1);
    for (let i = 0; i < 7 && !scheduledOn(t, d); i++) d = shift(d, -1);
    return isDone(t.id, keyOf(d));
  }

  function toggle(id) {
    const d = day(todayKey());
    d.done = d.done.includes(id) ? d.done.filter((x) => x !== id) : [...d.done, id];
    if (navigator.vibrate) navigator.vibrate(8);
    save(); renderAll();
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
    const t = Math.min(1, Math.max(0, (h + new Date().getMinutes() / 60 - 5) / 16));
    const orb = $("orb");
    orb.style.right = `${6 + t * 26}%`;
    orb.style.top = `${2 + Math.pow(2 * t - 1, 2) * 26}px`;
  }

  function renderHeader() {
    $("date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const total = tasks.length;
    const done = tasks.filter((t) => isDone(t.id, todayKey())).length;
    $("count").textContent = `${done} / ${total}`;
    $("bar").style.width = total ? `${(done / total) * 100}%` : "0";

    // Never miss twice banner
    const banner = $("banner");
    const yTasks = tasksOn(yesterdayKey());
    if (countsYesterday() && yTasks.length) {
      const y = yTasks.filter((t) => isDone(t.id, yesterdayKey())).length / yTasks.length;
      banner.hidden = y >= 0.5;
      banner.textContent = "Yesterday slipped. That's allowed once. Today's rule: never miss twice. Start with the next small thing.";
    } else banner.hidden = true;
  }

  // ---------- right now ----------
  function renderNow() {
    const tk = todayKey();
    const n = nowMins();
    const due = tasks.filter((t) => t.min <= n && !isDone(t.id, tk));
    const next = tasks.find((t) => t.min > n && !isDone(t.id, tk));
    const current = due[due.length - 1];
    const doneBtn = $("nowDone");
    const card = $("now");
    card.classList.toggle("calm", !current);

    if (current) {
      const late = n - current.min;
      $("nowLabel").textContent = late > 30 ? "Overdue" : "Right now";
      $("nowTask").textContent = current.name;
      const earlier = due.length - 1;
      $("nowSub").textContent =
        (late > 30 ? `Was due at ${fmtTime(current.time)}. Do it now, small is fine.` : `Due ${fmtTime(current.time)}.`) +
        (earlier ? ` ${earlier} earlier ${earlier === 1 ? "task is" : "tasks are"} still open.` : "");
      doneBtn.hidden = false;
      doneBtn.onclick = () => toggle(current.id);
    } else if (!tasks.length) {
      $("nowLabel").textContent = "Right now";
      $("nowTask").textContent = "Loading your routine…";
      $("nowSub").textContent = "";
      doneBtn.hidden = true;
    } else if (next) {
      const first = tasks[0].min;
      $("nowLabel").textContent = n < first ? "Sleep" : "On track";
      $("nowTask").textContent = n < first ? "Your day starts later." : "Nothing overdue.";
      $("nowSub").textContent = n < first ? "Put the phone down and rest." : "Use the gap well, or start the next thing early.";
      doneBtn.hidden = true;
    } else {
      $("nowLabel").textContent = "Done";
      $("nowTask").textContent = "That's the whole day.";
      $("nowSub").textContent = "Phone across the room. Lights out.";
      doneBtn.hidden = true;
    }
    $("nowNext").textContent = next ? `Up next: ${next.name} at ${fmtTime(next.time)}` : "";
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
    const d = day(todayKey());
    d.plan = v;
    if (!d.done.includes("plan") && tasks.some((t) => t.id === "plan")) d.done.push("plan");
    save(); renderAll();
  });
  $("planText").addEventListener("click", () => {
    $("planInput").value = state.log[todayKey()]?.plan || "";
    $("planForm").hidden = false; $("planText").hidden = true;
    $("planInput").focus();
  });

  // ---------- meals ----------
  const mealNow = () => { const m = nowMins(); return m < 630 ? "breakfast" : m < 930 ? "lunch" : "dinner"; };
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  function currentRecipe() {
    const meal = mealNow();
    const list = recipes[meal] || [];
    if (!list.length) return { meal, recipe: null };
    const k = `${todayKey()}-${meal}`;
    const idx = (hash(k) + (state.meal[k] || 0)) % list.length;
    return { meal, recipe: list[idx], key: k };
  }
  function renderMeal() {
    const { meal, recipe } = currentRecipe();
    $("meal").hidden = !recipe;
    if (!recipe) return;
    $("mealLabel").textContent = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Tonight's dinner" }[meal];
    $("mealTime").textContent = `· ${recipe.time}`;
    $("mealName").textContent = recipe.name;
    $("mealIngredients").replaceChildren(...recipe.ingredients.map((i) => el("li", { textContent: i })));
    $("mealSteps").replaceChildren(...recipe.steps.map((s) => el("li", { textContent: s })));
    const made = isDone(MEAL_TASK[meal], todayKey());
    $("mealMade").textContent = made ? "Made it ✓" : "I made it";
    $("mealMade").disabled = made;
  }
  $("mealName").addEventListener("click", () => {
    const open = $("mealBody").hidden;
    $("mealBody").hidden = !open;
    $("mealName").setAttribute("aria-expanded", String(open));
  });
  $("mealAnother").addEventListener("click", () => {
    const { key } = currentRecipe();
    if (!key) return;
    state.meal[key] = (state.meal[key] || 0) + 1;
    save(); renderMeal();
  });
  $("mealMade").addEventListener("click", () => {
    const id = MEAL_TASK[mealNow()];
    if (!isDone(id, todayKey())) toggle(id);
  });

  // ---------- movement ----------
  function currentWorkout() {
    if (!workouts) return null;
    const d = new Date();
    if (nowMins() < 840) {
      const list = workouts.morning;
      return { task: "stretch-am", label: "Morning stretch", w: list[hash(todayKey()) % list.length] };
    }
    const gymTask = tasks.find((t) => t.id === "gym");
    if (gymTask) return { task: "gym", label: "Tonight's gym", w: workouts.gym[String(d.getDay())] };
    return { task: "stretch", label: "Tonight before bed", w: workouts.stretch[String(d.getDay())] };
  }
  function renderMove() {
    const c = currentWorkout();
    $("move").hidden = !c || !c.w;
    if (!c || !c.w) return;
    $("moveLabel").textContent = c.label;
    $("moveTime").textContent = `· ${c.w.time}`;
    $("moveName").textContent = c.w.name;
    $("moveSteps").replaceChildren(...c.w.steps.map((s) => el("li", { textContent: s })));
    const done = isDone(c.task, todayKey());
    $("moveDone").textContent = done ? "Done ✓" : "Done";
    $("moveDone").disabled = done;
    $("moveDone").onclick = () => { if (!isDone(c.task, todayKey())) toggle(c.task); };
  }
  $("moveName").addEventListener("click", () => {
    const open = $("moveBody").hidden;
    $("moveBody").hidden = !open;
    $("moveName").setAttribute("aria-expanded", String(open));
  });

  // ---------- sleep shift ----------
  function renderSleep() {
    if (!routine) { $("sleep").hidden = true; return; }
    const s = S.sleepFor(routine, todayKey());
    const target = S.toMin(routine.sleep.targetWake);
    $("sleep").hidden = false;
    $("sleepWake").textContent = fmtTime(S.toHHMM(s.wake));
    $("sleepOut").textContent = fmtTime(S.toHHMM(s.lightsOut));
    const reached = s.wake <= target;
    const by = new Date(s.reachedOn + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    $("sleepNote").textContent = reached
      ? "You've reached your target. Keep it steady, weekends too."
      : `Moving 15 min earlier every 3 days. ${fmtTime(routine.sleep.targetWake)} by ${by}.`;
  }

  // ---------- routine ----------
  const openBlocks = {};
  function renderRoutine() {
    const root = $("routine");
    root.replaceChildren();
    const tk = todayKey();
    const n = nowMins();
    const week = Array.from({ length: 7 }, (_, i) => shift(new Date(), i - 6));
    const blocks = {};
    tasks.forEach((t) => (blocks[blockOf(t)] ||= []).push(t));

    const nowBlock = blockOf({ min: n });
    Object.entries(blocks).forEach(([name, list]) => {
      const doneN = list.filter((t) => isDone(t.id, tk)).length;
      const head = el("summary", { className: "section-head" },
        el("h2", { textContent: name }),
        el("span", { className: "soft small", textContent: `${doneN} / ${list.length}${doneN === list.length ? " ✓" : ""}` }));
      const ul = el("ul", { className: "habits" });
      list.forEach((t) => {
        const done = isDone(t.id, tk);
        const late = !done && t.min + 30 < n;
        const s = streak(t);
        const btn = el("button", { type: "button", className: `habit${done ? " done" : ""}${late ? " late" : ""}` });
        btn.setAttribute("aria-pressed", String(done));
        const check = el("span", { className: "check", innerHTML: CHECK_SVG });
        const nameRow = el("span", { className: "habit-name" },
          el("span", { className: "time", textContent: fmtTime(t.time) }), t.name);
        const dots = el("span", { className: "week" });
        week.forEach((d) => {
          const k = keyOf(d);
          const off = !scheduledOn(t, d);
          dots.append(el("i", { className: `${isDone(t.id, k) ? "on" : ""}${off ? " off" : ""}${k === tk ? " today" : ""}` }));
        });
        const main = el("span", { className: "habit-main" }, nameRow, dots);
        if (!done && missedYesterday(t)) main.append(el("span", { className: "nmt", textContent: "Never miss twice" }));
        const st = el("span", { className: `streak${s ? " on" : ""}`, innerHTML: `${LEAF_SVG}${s}` });
        st.title = `${s} day streak`;
        btn.append(check, main, st);
        btn.addEventListener("click", () => toggle(t.id));
        ul.append(el("li", {}, btn));
      });
      const block = el("details", { className: "block" }, head, ul);
      const remembered = openBlocks[name];
      block.open = remembered !== undefined ? remembered : name === nowBlock;
      block.addEventListener("toggle", () => { openBlocks[name] = block.open; });
      root.append(block);
    });
  }

  // ---------- no-phone timer ----------
  let tick = null;
  const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  function stopTimer() {
    const t = state.timer;
    if (!t) return;
    const d = day(keyOf(new Date(t.start)));
    d.focusMin = (d.focusMin || 0) + Math.min(t.minutes, Math.floor((Date.now() - t.start) / 60000));
    state.timer = null;
    save(); renderAll();
  }
  function renderFocus() {
    const t = state.timer;
    const m = state.log[todayKey()]?.focusMin || 0;
    $("focusTotal").textContent = m ? `· ${m} min today` : "";
    $("focusIdle").hidden = !!t;
    $("focusRun").hidden = !t;
    clearInterval(tick);
    if (!t) return;
    const update = () => {
      const left = t.start + t.minutes * 60000 - Date.now();
      $("timeLeft").textContent = fmt(left);
      if (left <= 0) stopTimer();
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
  $("stopBtn").addEventListener("click", stopTimer);

  // ---------- evening ----------
  let eveningOpened = false;
  function renderEvening() {
    const d = state.log[todayKey()] || {};
    const show = new Date().getHours() >= 17 || !!(d.well || d.fix) || eveningOpened;
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
    const tk = todayKey();
    for (let i = 27; i >= 0; i--) {
      const d = shift(new Date(), -i);
      const k = keyOf(d);
      const dayTasks = tasksOn(k);
      const total = dayTasks.length || 1;
      const n = dayTasks.filter((t) => isDone(t.id, k)).length;
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

  // ---------- reminders setup ----------
  $("copyTopic").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("topic").textContent); $("copyTopic").textContent = "Copied"; }
    catch { $("copyTopic").textContent = "Press and hold to copy"; }
  });

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
      if (typeof data.log !== "object") throw new Error("bad file");
      state = { ...blank(), ...data };
      save(); renderAll();
    } catch { $("importFile").value = ""; }
  });

  // ---------- go ----------
  function renderAll() {
    renderSky(); renderHeader(); renderNow(); renderSleep(); renderPlan(); renderMeal(); renderMove();
    renderRoutine(); renderFocus(); renderEvening(); renderMonth();
  }

  async function boot() {
    if (!state.firstDay) { state.firstDay = todayKey(); save(); }
    renderAll();
    try {
      const [r, rc, wo] = await Promise.all([
        fetch("routine.json", { cache: "no-cache" }).then((x) => x.json()),
        fetch("recipes.json").then((x) => x.json()),
        fetch("workouts.json").then((x) => x.json()),
      ]);
      routine = r; recipes = rc; workouts = wo;
      loadTasks();
    } catch { /* offline with nothing cached yet */ }
    renderAll();
  }
  boot();

  // Refresh when the app comes back to the foreground, and every minute while open.
  let lastDay = todayKey();
  const refresh = () => {
    if (todayKey() !== lastDay) { lastDay = todayKey(); eveningOpened = false; loadTasks(); }
    renderSky(); renderHeader(); renderNow(); renderSleep(); renderMeal(); renderMove(); renderRoutine();
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
  setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
