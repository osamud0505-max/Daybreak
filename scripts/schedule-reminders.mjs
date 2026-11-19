// Schedules today's Daybreak reminders on ntfy.sh. Run once early each morning by GitHub Actions.
// ntfy holds each message and delivers it at the given time (the "At" header).
import { readFileSync } from "node:fs";
import "../schedule.js"; // defines globalThis.DaybreakSchedule

const topic = process.env.NTFY_TOPIC;
const dryRun = process.env.DRY_RUN === "1";
const appUrl = process.env.APP_URL || "https://osamud0505-max.github.io/Daybreak/";
if (!topic) throw new Error("NTFY_TOPIC is not set");

const routine = JSON.parse(readFileSync(new URL("../routine.json", import.meta.url), "utf8"));
const tz = routine.timezone || "America/Toronto";

// Offset (ms) between the time zone's wall clock and UTC at a given instant.
function tzOffset(ts) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ts)).map((x) => [x.type, x.value])
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ts;
}
// Wall-clock time in `tz` -> epoch ms.
function zoned(y, m, d, h, mi) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let ts = guess - tzOffset(guess);
  ts = guess - tzOffset(ts); // settle across DST changes
  return ts;
}

const now = Date.now();
const today = Object.fromEntries(
  new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(now)).map((x) => [x.type, x.value])
);

const dateKey = `${today.year}-${today.month}-${today.day}`;
let sent = 0;
for (const t of globalThis.DaybreakSchedule.tasksFor(routine, dateKey)) {
  if (!t.push || t.quiet) continue; // quiet steps are walked through in the app, not pushed
  const at = zoned(+today.year, +today.month, +today.day, Math.floor(t.min / 60), t.min % 60) + (t.pushDelay || 0) * 60000;
  if (at < now + 60_000) continue; // already passed
  let body = t.push;
  // At lights out, say when to set tomorrow's alarm if the wake time moves.
  if (t.anchor === "lightsOut" && t.offset === 0) {
    const tm = new Date(Date.UTC(+today.year, +today.month - 1, +today.day + 1));
    const tomorrowKey = tm.toISOString().slice(0, 10);
    const S = globalThis.DaybreakSchedule;
    const wakeT = S.sleepFor(routine, tomorrowKey).wake, wakeN = S.sleepFor(routine, dateKey).wake;
    if (wakeT !== wakeN) {
      const h = Math.floor(wakeT / 60), mm = String(wakeT % 60).padStart(2, "0");
      body += ` Tomorrow you wake at ${((h + 11) % 12) + 1}:${mm} ${h < 12 ? "AM" : "PM"}, so move your alarm.`;
    }
  }
  const headers = {
    Title: t.dur ? `${t.name} · ${t.dur >= 60 ? `${Math.floor(t.dur / 60)} h${t.dur % 60 ? ` ${t.dur % 60} min` : ""}` : `${t.dur} min`}` : t.name,
    At: String(Math.floor(at / 1000)),
    Click: appUrl,
    Tags: "sunrise",
    Priority: ["max", "high"].includes(t.priority) ? t.priority : "default",
  };
  if (dryRun) {
    console.log(`[dry run] ${new Date(at).toLocaleString("en-CA", { timeZone: tz })}  ${t.name}: ${body}`);
    sent++;
    continue;
  }
  const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`ntfy refused "${t.name}": ${res.status} ${await res.text()}`);
  console.log(`Scheduled ${t.time} ${t.name}`);
  sent++;
}
console.log(`${sent} reminders scheduled for ${today.year}-${today.month}-${today.day} (${tz}).`);
