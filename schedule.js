/* Daybreak schedule math, shared by the app (browser) and the reminder script (Node).
   Works out each task's clock time for a given date, including the gradual sleep shift. */
(function (root) {
  "use strict";

  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const toHHMM = (m) => {
    const x = ((Math.round(m) % 1440) + 1440) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  };
  // Whole days between two YYYY-MM-DD strings.
  const daysBetween = (a, b) => Math.round((Date.UTC(...b.split("-").map((n, i) => n - (i === 1))) -
    Date.UTC(...a.split("-").map((n, i) => n - (i === 1)))) / 86400000);

  // Wake and lights-out (minutes after midnight) for a date. Lights-out may exceed 1440 (after midnight).
  function sleepFor(routine, dateKey) {
    const s = routine.sleep;
    const wake0 = toMin(s.startWake), wake1 = toMin(s.targetWake);
    const out0 = toMin(s.startLightsOut), out1 = toMin(s.targetLightsOut);
    const maxSteps = Math.ceil((wake0 - wake1) / s.stepMinutes);
    const steps = Math.max(0, Math.min(maxSteps, Math.floor(daysBetween(s.start, dateKey) / s.everyDays)));
    const f = maxSteps ? steps / maxSteps : 1;
    const wake = Math.max(wake1, wake0 - steps * s.stepMinutes);
    const out = Math.round((out0 + (out1 - out0) * f) / 5) * 5;
    const reachedOn = (() => {
      const [y, m, d] = s.start.split("-").map(Number);
      const t = new Date(Date.UTC(y, m - 1, d + maxSteps * s.everyDays));
      return t.toISOString().slice(0, 10);
    })();
    return { wake, lightsOut: out, steps, maxSteps, reachedOn };
  }

  // Aligner tray worn on a date. A tray is changed on the night before the next one starts,
  // so the change night belongs to the old tray. Tray 1 starts on firstDay.
  function alignerFor(routine, dateKey) {
    const a = routine.aligners;
    if (!a) return null;
    const days = daysBetween(a.firstDay, dateKey);
    if (days < 0) return null;
    const tray = Math.floor(days / a.daysPerTray) + 1;
    const dayOfTray = (days % a.daysPerTray) + 1;
    const finished = tray > a.totalTrays;
    return {
      tray: Math.min(tray, a.totalTrays), next: tray + 1, total: a.totalTrays, dayOfTray,
      daysPerTray: a.daysPerTray, daysLeft: a.daysPerTray - dayOfTray, changeTonight: dayOfTray === a.daysPerTray && tray < a.totalTrays,
      round: Math.ceil(Math.min(tray, a.totalTrays) / (a.traysPerRound || 1)), rounds: Math.ceil(a.totalTrays / (a.traysPerRound || 1)),
      finished, finalDay: (() => { const [y, m, d] = a.firstDay.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + a.totalTrays * a.daysPerTray - 1)).toISOString().slice(0, 10); })(),
      wearHours: a.wearHours,
    };
  }
  const fill = (text, al) => text && al ? text.replace(/\{(tray|next|total)\}/g, (_, k) => al[k]) : text;

  // Tasks for a date, with resolved "time" (HH:MM), filtered by weekday, sorted.
  function tasksFor(routine, dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const { wake, lightsOut } = sleepFor(routine, dateKey);
    const al = alignerFor(routine, dateKey);
    return routine.tasks
      .filter((t) => !t.days || t.days.includes(weekday))
      .filter((t) => !t.aligner || (al && al.changeTonight))
      .map((t) => (t.aligner ? { ...t, name: fill(t.name, al), push: fill(t.push, al) } : t))
      .map((t) => {
        let min = t.time ? toMin(t.time) : t.anchor === "wake" ? wake + (t.offset || 0) : lightsOut + (t.offset || 0);
        return { ...t, min, time: toHHMM(min) };
      })
      .sort((a, b) => a.min - b.min);
  }

  root.DaybreakSchedule = { sleepFor, tasksFor, alignerFor, toMin, toHHMM };
})(typeof globalThis !== "undefined" ? globalThis : this);
