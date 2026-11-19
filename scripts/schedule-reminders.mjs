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
for (const t of globalThis.DaybreakSchedule.pushesFor(routine, dateKey)) {
  const at = zoned(+today.year, +today.month, +today.day, Math.floor(t.min / 60), t.min % 60);
  if (at < now + 60_000) continue; // already passed
  const body = t.body;
  const headers = {
    Title: t.title,
    At: String(Math.floor(at / 1000)),
    Click: appUrl,
    // Daybreak's own icon on every reminder (no emoji tags).
    Icon: new URL("icons/icon-192.png", appUrl.endsWith("/") ? appUrl : appUrl + "/").href,
    Priority: "default",
  };
  if (dryRun) {
    console.log(`[dry run] ${new Date(at).toLocaleString("en-CA", { timeZone: tz })}  ${t.title}: ${body}`);
    sent++;
    continue;
  }
  const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`ntfy refused "${t.title}": ${res.status} ${await res.text()}`);
  console.log(`Scheduled ${globalThis.DaybreakSchedule.toHHMM(t.min)} ${t.title}`);
  sent++;
}
console.log(`${sent} reminders scheduled for ${today.year}-${today.month}-${today.day} (${tz}).`);
