/* Daybreak: a quiet discipline log. Everything you tick is stored on this device (localStorage).
   The routine (times and pushes) lives in routine.json, recipes in recipes.json. */
(() => {
  "use strict";

  const KEY = "daily-discipline-v1";
  const MEAL_TASK = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner" };

  // ---------- storage ----------
  const blank = () => ({ log: {}, timer: null, firstDay: null, meal: {}, cycle: { days: {} } });
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
  const howLong = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
  const fmtRange = (t) => {
    if (!t.dur) return fmtTime(t.time);
    const a = fmtTime(t.time), b = fmtTime(t.endTime);
    return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
  };
  const took = (id) => {
    const x = state.log[todayKey()] && state.log[todayKey()].times && state.log[todayKey()].times[id];
    return x ? ` · took ${howLong(Math.max(1, Math.round((x.e - x.s) / 60000)))}` : "";
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

  let justDone = null;
  function toggle(id) {
    const d = day(todayKey());
    const adding = !d.done.includes(id);
    if (d.active && d.active.id === id) {
      if (adding) (d.times ||= {})[id] = { s: d.active.s, e: Date.now() };
      delete d.active;
    }
    if (adding && d.skip) d.skip = d.skip.filter((x) => x !== id);
    d.done = adding ? [...d.done, id] : d.done.filter((x) => x !== id);
    if (navigator.vibrate) navigator.vibrate(adding ? [8, 40, 8] : 8);
    justDone = adding ? id : null;
    const blockBefore = blockStatus();
    save(); renderAll();
    justDone = null;
    celebrateIfNeeded(adding, id, blockBefore);
  }
  // Sound + celebration when a block or the whole day gets finished.
  const sound = (n) => window.DaybreakSound && window.DaybreakSound.play(n);
  function blockStatus() {
    const tk = todayKey();
    const res = {};
    tasks.forEach((t) => { const b = blockOf(t); (res[b] ||= [0, 0]); res[b][1]++; if (isDone(t.id, tk)) res[b][0]++; });
    return res;
  }
  function celebrate(text) {
    const c = el("div", { className: "celebrate", textContent: text });
    document.body.append(c);
    setTimeout(() => c.remove(), 2500);
  }
  function celebrateIfNeeded(adding, id, before) {
    if (!adding) { sound("undo"); return; }
    const after = blockStatus();
    const all = Object.values(after).every(([d, n]) => d === n);
    const t = tasks.find((x) => x.id === id);
    const b = t && blockOf(t);
    if (all) { sound("all"); celebrate("The whole day, done. Proud of you."); }
    else if (b && after[b][0] === after[b][1] && before[b] && before[b][0] < before[b][1]) {
      sound("block");
      celebrate({ Morning: "Morning complete", Day: "Day block complete", Evening: "Evening complete", Night: "Night routine done. Sleep well." }[b]);
    } else sound("done");
  }

  const SPARK_COLORS = ["var(--pink-deep)", "var(--lilac-deep)", "var(--butter-deep)", "var(--mint-deep)", "var(--sky-deep)", "var(--peach-deep)"];
  const I = window.DaybreakIcons.icon;
  function sparkle(target) {
    const r = target.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
      const s = el("span", { className: "sparkle", innerHTML: I(i % 2 ? "sparkle" : "heart") });
      s.style.color = SPARK_COLORS[i % SPARK_COLORS.length];
      s.style.left = `${r.left + r.width / 2 - 7 + window.scrollX}px`;
      s.style.top = `${r.top + r.height / 2 - 9 + window.scrollY}px`;
      s.style.setProperty("--dx", `${Math.cos(a) * 34}px`);
      s.style.setProperty("--dy", `${Math.sin(a) * 34}px`);
      document.body.append(s);
      setTimeout(() => s.remove(), 750);
    }
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
    if (window.DaybreakSky) window.DaybreakSky.update();
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

  // ---------- right now: step-by-step flow ----------
  // Press Start, do the thing, press Done. Daybreak times it and hands you the next step.
  const LINKS = { breakfast: ["meals", "See the recipe"], lunch: ["meals", "See the recipe"], dinner: ["meals", "See the recipe"],
    "stretch-am": ["move", "See the stretches"], gym: ["move", "See tonight's plan"], stretch: ["move", "See tonight's routine"] };
  const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`; };
  // Your real average for a task, from the last 7 times you timed it.
  function usual(id) {
    const mins = Object.keys(state.log).sort().reverse()
      .map((k) => state.log[k].times && state.log[k].times[id]).filter(Boolean)
      .slice(0, 7).map((x) => (x.e - x.s) / 60000).filter((m) => m >= 0.5 && m < 300);
    return mins.length ? Math.max(1, Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)) : 0;
  }
  function pickCurrent(n) {
    const tk = todayKey();
    const skip = (state.log[tk] && state.log[tk].skip) || [];
    const open = tasks.filter((t) => !isDone(t.id, tk) && !skip.includes(t.id));
    // Oldest unfinished step first, so you go in order. Steps over 2 hours past their end drop off.
    const due = open.filter((t) => t.min <= n && (t.end ?? t.min) + 120 >= n);
    if (due.length) return { t: due[0], due: due.length, early: false };
    const next = open.find((t) => t.min > n);
    return next ? { t: next, due: 0, early: true, gap: next.min - n } : null;
  }
  function startTask(id) {
    const d = day(todayKey());
    d.active = { id, s: Date.now() };
    sound("start");
    save(); renderAll();
  }
  let overNotified = null;
  function tickNow() {
    const d = state.log[todayKey()];
    const act = d && d.active;
    const timer = $("nowTimer");
    if (!act) { timer.hidden = true; return; }
    const t = tasks.find((x) => x.id === act.id);
    const ms = Date.now() - act.s;
    timer.hidden = false;
    timer.textContent = mmss(ms);
    const plan = (t && t.dur) || 0;
    const over = plan && ms > plan * 60000;
    timer.classList.toggle("over", !!over);
    if (over && overNotified !== act.id + act.s && document.visibilityState === "visible") { overNotified = act.id + act.s; sound("sky"); }
  }
  function renderNow() {
    const tk = todayKey();
    const n = nowMins();
    const d = state.log[tk] || {};
    const doneBtn = $("nowDone");
    const card = $("now");
    const minor = $("nowMinor");
    const link = $("nowLink");
    const act = d.active && tasks.find((t) => t.id === d.active.id);
    if (d.active && !act) { delete d.active; save(); }
    const setLink = (t) => {
      const l = LINKS[t.id];
      link.hidden = !l;
      if (l) { link.textContent = `${l[1]} ›`; link.onclick = () => goTab(l[0]); }
    };
    card.classList.toggle("calm", false);
    card.classList.toggle("active", !!act);

    if (!tasks.length) {
      $("nowLabel").textContent = "Right now";
      $("nowTask").textContent = "Loading your routine…";
      $("nowSub").textContent = "";
      doneBtn.hidden = true; minor.hidden = true; link.hidden = true; $("nowNext").textContent = "";
      tickNow(); return;
    }

    if (act) {
      const u = usual(act.id);
      $("nowLabel").textContent = "Doing now";
      $("nowTask").textContent = act.name;
      $("nowEmoji").innerHTML = I(act.icon || "sun");
      $("nowSub").textContent = [act.dur ? `Planned about ${howLong(act.dur)}.` : "", u ? `You usually take ${howLong(u)}.` : ""].join(" ").trim();
      doneBtn.hidden = false;
      doneBtn.textContent = "Done";
      doneBtn.onclick = () => { sparkle(doneBtn); toggle(act.id); };
      minor.hidden = false;
      $("nowAlready").hidden = true;
      $("nowSkip").textContent = "Stop timer";
      $("nowSkip").onclick = () => { delete day(tk).active; save(); renderAll(); };
      setLink(act);
      const after = pickAfter(act.id);
      $("nowNext").textContent = after ? `Then: ${after.name}` : "";
      tickNow(); return;
    }

    const pick = pickCurrent(n);
    if (!pick || (pick.early && pick.gap > 15)) {
      // Nothing due: calm card, with the option to start the next thing early.
      card.classList.add("calm");
      const first = tasks[0].min;
      const asleep = n < first;
      const done = !pick;
      $("nowLabel").textContent = done ? "Done" : asleep ? "Sleep" : "On track";
      $("nowEmoji").innerHTML = I(done ? "moon" : asleep ? "sleep" : "rainbow");
      $("nowTask").textContent = done ? "That's the whole day." : asleep ? "Your day starts later." : "Nothing due right now.";
      $("nowSub").textContent = done ? "Phone across the room. Lights out." : asleep ? "Put the phone down and rest." : "Free time. Rest, or start the next thing early.";
      doneBtn.hidden = true; link.hidden = true;
      minor.hidden = done || asleep;
      if (!minor.hidden) {
        $("nowAlready").hidden = true;
        $("nowSkip").textContent = `Start "${pick.t.name}" now`;
        $("nowSkip").onclick = () => startTask(pick.t.id);
      }
      $("nowNext").textContent = pick ? `Up next: ${pick.t.name} at ${fmtTime(pick.t.time)}` : "";
      tickNow(); return;
    }

    const t = pick.t;
    const late = n - (t.end ?? t.min);
    const u = usual(t.id);
    $("nowLabel").textContent = pick.early ? "Up next" : late > 15 ? "Overdue" : "Right now";
    $("nowTask").textContent = t.name;
    $("nowEmoji").innerHTML = I(t.icon || "sun");
    const others = pick.due - 1;
    $("nowSub").textContent = [
      late > 15 ? `Planned ${fmtRange(t)}. You're behind, that's okay. Start it now.` : `${fmtRange(t)}${t.dur ? `, about ${howLong(t.dur)}` : ""}.`,
      u ? `You usually take ${howLong(u)}.` : "",
      others > 0 ? `${others} more ${others === 1 ? "step is" : "steps are"} waiting after this.` : "",
    ].filter(Boolean).join(" ");
    doneBtn.hidden = false;
    // Every real step gets Start so it can be timed; getting up and tiny steps just get Done.
    const timed = (t.dur || 0) >= 5 && t.id !== "wake";
    doneBtn.textContent = timed ? "Start" : "Done";
    doneBtn.onclick = () => { if (timed) startTask(t.id); else { sparkle(doneBtn); toggle(t.id); } };
    minor.hidden = false;
    $("nowAlready").hidden = !timed;
    $("nowAlready").onclick = () => toggle(t.id);
    $("nowSkip").textContent = "Skip today";
    $("nowSkip").onclick = () => { const dd = day(tk); dd.skip = [...(dd.skip || []), t.id]; save(); renderAll(); };
    setLink(t);
    const after = pickAfter(t.id);
    $("nowNext").textContent = after ? `Then: ${after.name}${after.min > n + 15 ? ` at ${fmtTime(after.time)}` : ""}` : "";
    tickNow();
  }
  // The step that comes after `id` (skipping finished or skipped ones).
  function pickAfter(id) {
    const tk = todayKey();
    const skip = (state.log[tk] && state.log[tk].skip) || [];
    const i = tasks.findIndex((t) => t.id === id);
    return tasks.slice(i + 1).find((t) => !isDone(t.id, tk) && !skip.includes(t.id));
  }
  setInterval(() => { if (document.visibilityState === "visible") tickNow(); }, 1000);

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
    $("mealMade").textContent = made ? "Made it" : "I made it";
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
    if (!isDone(id, todayKey())) { sparkle($("mealMade")); toggle(id); }
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
    const pDay = cyc().days[todayKey()] ? periodDayNumber(todayKey()) : 0;
    const heavy = pDay && (cyc().days[todayKey()].flow === "heavy" || (cyc().days[todayKey()].sym || []).includes("cramps"));
    $("moveNote").hidden = !(pDay && (pDay <= 2 || heavy));
    $("moveNote").textContent = c.task === "gym"
      ? "Period day: it's okay to swap tonight for an easy walk or the bedtime stretch. Showing up gently still counts."
      : "Period day: go slow, skip anything that hurts.";
    const done = isDone(c.task, todayKey());
    $("moveDone").textContent = done ? "Done, nice" : "Done";
    $("moveDone").disabled = done;
    $("moveDone").onclick = () => { if (!isDone(c.task, todayKey())) { sparkle($("moveDone")); toggle(c.task); } };
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

  // ---------- aligners ----------
  function renderAligners() {
    const al = routine && S.alignerFor(routine, todayKey());
    $("aligners").hidden = !al;
    $("alMeal").hidden = !al || al.finished;
    if (!al) return;
    const ends = new Date(al.finalDay + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const trays = $("trays");
    trays.replaceChildren(...Array.from({ length: al.total }, (_, i) =>
      el("i", { className: i + 1 < al.tray || al.finished ? "past" : i + 1 === al.tray ? "now" : "" })));
    $("alSwitch").hidden = true;
    if (al.finished) {
      $("alRound").textContent = "";
      $("alBig").textContent = `All ${al.total} trays done`;
      $("alSub").textContent = "Wear your retainers as your orthodontist told you.";
      return;
    }
    $("alRound").textContent = `· round ${al.round} of ${al.rounds}`;
    $("alBig").textContent = `Tray ${al.tray} of ${al.total}`;
    if (al.changeTonight) {
      const switched = isDone("aligner-change", todayKey());
      $("alSub").textContent = switched
        ? `Switched. Tray ${al.next} starts tomorrow. It may feel tight for a day or two, that's normal.`
        : `Tonight's the switch. Brush, then put in tray ${al.next} before bed. Keep tray ${al.tray} in its case.`;
      $("alSwitch").hidden = switched;
      $("alSwitch").textContent = `I switched to tray ${al.next}`;
      $("alSwitch").onclick = () => { sparkle($("alSwitch")); toggle("aligner-change"); };
    } else {
      const d = al.daysLeft;
      $("alSub").textContent = `Day ${al.dayOfTray} of ${al.daysPerTray}. Switch to tray ${al.next} ${d === 1 ? "tomorrow night" : `in ${d} days, Friday night`}. ` +
        `Wear them ${al.wearHours} hours a day. Last tray ends ${ends}.`;
    }
  }

  // ---------- cycle (stays on this phone only; never sent in reminders) ----------
  const FLOWS = [["spotting", "Spotting"], ["light", "Light"], ["medium", "Medium"], ["heavy", "Heavy"]];
  const SYMS = [["cramps", "Cramps"], ["tired", "Tired"], ["headache", "Headache"], ["bloated", "Bloated"],
    ["moody", "Moody"], ["cravings", "Cravings"], ["back", "Back pain"], ["fine", "Feeling fine"]];
  let cycleEditing = false;
  const cyc = () => (state.cycle ||= { days: {} });
  const isPeriod = (k) => !!cyc().days[k];
  const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const dayDiff = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

  function cycleStats() {
    const keys = Object.keys(cyc().days).sort();
    const starts = keys.filter((k) => !isPeriod(keyOf(shift(parseKey(k), -1))));
    const gaps = starts.slice(1).map((k, i) => dayDiff(starts[i], k)).filter((g) => g >= 18 && g <= 45);
    const avgCycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
    const lengths = starts.map((st) => { let n = 0; let d = parseKey(st); while (isPeriod(keyOf(d))) { n++; d = shift(d, 1); } return n; });
    const avgLen = lengths.length ? Math.max(3, Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)) : 5;
    const last = starts[starts.length - 1] || null;
    let next = last ? shift(parseKey(last), avgCycle) : null;
    while (next && keyOf(next) < todayKey() && !isPeriod(todayKey()) && dayDiff(keyOf(next), todayKey()) > 7) next = shift(next, avgCycle);
    return { starts, avgCycle, avgLen, last, next, learned: gaps.length };
  }
  function periodDayNumber(k) { let n = 0; let d = parseKey(k); while (isPeriod(keyOf(d))) { n++; d = shift(d, -1); } return n; }
  const predictedKeys = () => {
    const { next, avgLen } = cycleStats();
    if (!next) return new Set();
    return new Set(Array.from({ length: avgLen }, (_, i) => keyOf(shift(next, i))));
  };

  function renderCycle() {
    const tk = todayKey();
    const st = cycleStats();
    const today = cyc().days[tk];
    $("cycleToday").hidden = !today;
    if (today) {
      const n = periodDayNumber(tk);
      $("cycleBig").textContent = `Period day ${n}`;
      $("cycleSub").textContent = n <= 2
        ? "Be gentle with yourself. Warm drink, water, and a lighter workout is still a win."
        : "Keep drinking water. Light movement can ease cramps.";
      $("cycleToggle").textContent = "Not on my period today";
      const chips = (box, opts, isOn, onTap) => $(box).replaceChildren(...opts.map(([id, label]) => {
        const b = el("button", { type: "button", className: `chip${isOn(id) ? " on" : ""}`, textContent: label });
        b.addEventListener("click", () => { onTap(id); save(); renderCycle(); renderMove(); });
        return b;
      }));
      chips("flowChips", FLOWS, (id) => today.flow === id, (id) => { today.flow = today.flow === id ? null : id; });
      chips("symChips", SYMS, (id) => (today.sym || []).includes(id), (id) => {
        today.sym = (today.sym || []).includes(id) ? today.sym.filter((x) => x !== id) : [...(today.sym || []), id];
      });
    } else {
      $("cycleToggle").textContent = isPeriod(keyOf(shift(new Date(), -1))) ? "Still on my period" : "My period started";
      if (!st.next) {
        $("cycleBig").textContent = "Log your next period";
        $("cycleSub").textContent = "Tap the button on the day it starts. You can add past days with Edit past days, so predictions start sooner.";
      } else {
        const days = dayDiff(tk, keyOf(st.next));
        const when = st.next.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        $("cycleBig").textContent = days > 0 ? `Next period in about ${days} day${days === 1 ? "" : "s"}` : days === 0 ? "Period expected today" : `Period ${-days} day${days === -1 ? "" : "s"} late`;
        $("cycleSub").textContent = `Around ${when}. Based on ${st.learned ? `your average ${st.avgCycle}-day cycle` : "a typical 28-day cycle until you've logged two"}.` +
          (days > 0 && days <= 3 ? " Pack supplies in your bag." : "");
      }
    }
    $("cycleEdit").textContent = cycleEditing ? "Done" : "Edit past days";
    $("cycleEditHint").hidden = !cycleEditing;
  }
  $("cycleToggle").addEventListener("click", () => {
    const tk = todayKey();
    if (cyc().days[tk]) delete cyc().days[tk];
    else cyc().days[tk] = { flow: null, sym: [] };
    save(); renderCycle(); renderMonth(); renderMove();
  });
  $("cycleEdit").addEventListener("click", () => {
    cycleEditing = !cycleEditing;
    renderCycle(); renderMonth();
    if (cycleEditing) $("month").scrollIntoView({ behavior: "smooth", block: "center" });
  });

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
      const BLOCK_ICON = { Morning: "sunrise", Day: "daisy", Evening: "tulip", Night: "moon" };
      const h2 = el("h2", {}, el("span", { className: "emo", innerHTML: I(BLOCK_ICON[name]) }), name);
      const head = el("summary", { className: "section-head" },
        h2,
        el("span", { className: "pill", textContent: `${doneN} / ${list.length}${doneN === list.length ? " all done" : ""}` }));
      const ul = el("ul", { className: "habits" });
      list.forEach((t) => {
        const done = isDone(t.id, tk);
        const late = !done && (t.end ?? t.min) + (t.dur ? 0 : 30) < n;
        const s = streak(t);
        const btn = el("button", { type: "button", className: `habit${done ? " done" : ""}${late ? " late" : ""}` });
        btn.setAttribute("aria-pressed", String(done));
        const check = el("span", { className: "check", innerHTML: CHECK_SVG });
        const nameRow = el("span", { className: "habit-name" },
          el("span", { className: "time", textContent: fmtRange(t) + took(t.id) }), t.name);
        const icon = el("span", { className: "task-emo", innerHTML: I(t.icon) });
        const dots = el("span", { className: "week" });
        week.forEach((d) => {
          const k = keyOf(d);
          const off = !scheduledOn(t, d);
          dots.append(el("i", { className: `${isDone(t.id, k) ? "on" : ""}${off ? " off" : ""}${k === tk ? " today" : ""}` }));
        });
        const main = el("span", { className: "habit-main" }, nameRow, dots);
        if (!done && missedYesterday(t)) main.append(el("span", { className: "nmt", textContent: "Never miss twice" }));
        const st = el("span", { className: `streak${s ? " on" : ""}`, innerHTML: s ? `${I("flame")}${s}` : "" });
        st.title = `${s} day streak`;
        btn.append(icon, main, el("span", { className: "right" }, check, st));
        if (justDone === t.id) { btn.classList.add("pop"); requestAnimationFrame(() => sparkle(check)); }
        btn.addEventListener("click", () => toggle(t.id));
        ul.append(el("li", {}, btn));
      });
      const block = el("details", { className: "block" }, head, ul);
      block.dataset.block = name;
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
      if (left <= 0) { stopTimer(); sound("all"); celebrate("No-phone time complete"); }
    };
    update();
    tick = setInterval(update, 1000);
  }
  document.querySelectorAll("[data-min]").forEach((b) =>
    b.addEventListener("click", () => {
      state.timer = { start: Date.now(), minutes: Number(b.dataset.min) };
      sound("start");
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
    m.classList.toggle("editing", cycleEditing);
    const predicted = predictedKeys();
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
        cell.style.background = `color-mix(in srgb, var(--done) ${pct}%, var(--surface))`;
        cell.style.color = "var(--ink)";
        if (n === total) cell.innerHTML = I("flower");
      }
      cell.title = `${k}: ${n} of ${total}`;
      if (isPeriod(k)) cell.classList.add("period");
      else if (predicted.has(k)) cell.classList.add("predicted");
      if (cycleEditing) cell.addEventListener("click", () => {
        if (isPeriod(k)) delete cyc().days[k]; else cyc().days[k] = { flow: null, sym: [] };
        save(); renderMonth(); renderCycle();
      });
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
    renderAligners(); renderCycle(); renderRoutine(); renderFocus(); renderEvening(); renderMonth();
  }

  document.querySelectorAll("[data-icon]").forEach((n) => (n.innerHTML = I(n.dataset.icon)));

  // Every button gets a soft ripple; plain buttons also get a quiet tap note.
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn, .chip, .link");
    if (!b) return;
    if (b.classList.contains("btn")) {
      const r = b.getBoundingClientRect();
      b.style.setProperty("--rx", `${e.clientX - r.left}px`);
      b.style.setProperty("--ry", `${e.clientY - r.top}px`);
      b.classList.remove("rip"); void b.offsetWidth; b.classList.add("rip");
    }
    if (!b.matches("#nowDone, #moveDone, #mealMade, #alSwitch, #soundBtn, [data-min]")) sound("tap");
  });
  const soundLabel = () => ($("soundBtn").textContent = window.DaybreakSound && window.DaybreakSound.enabled ? "Sounds on" : "Sounds off");
  $("soundBtn").addEventListener("click", () => { window.DaybreakSound.set(!window.DaybreakSound.enabled); soundLabel(); });
  soundLabel();

  // ---------- tabs ----------
  function goTab(name, scroll = true) {
    document.body.dataset.active = name;
    document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.go === name));
    try { sessionStorage.setItem("daybreak-tab", name); } catch { /* ignore */ }
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => goTab(b.dataset.go)));
  let startTab = "today";
  try { startTab = sessionStorage.getItem("daybreak-tab") || "today"; } catch { /* ignore */ }
  goTab(startTab, false);

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
    renderSky(); renderHeader(); renderNow(); renderSleep(); renderAligners(); renderMeal(); renderMove(); renderRoutine();
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
  setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
