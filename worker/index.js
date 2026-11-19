// Daybreak's notification helper (Cloudflare Worker).
// - The app sends its push subscription here once (POST /subscribe).
// - Every minute a cron tick checks the routine and sends any reminder due this minute,
//   so notifications come from Daybreak itself, with its name and icon.
// It never sees period data: period steps are "quiet" in routine.json and are never pushed.
import "../schedule.js"; // defines globalThis.DaybreakSchedule
import { makeVapid, sendPush } from "./webpush.js";

const APP = "https://osamud0505-max.github.io/Daybreak/";
const SUBJECT = APP; // VAPID contact: the app's own page, no personal details
const MAX_SUBS = 10;

const cors = {
  "Access-Control-Allow-Origin": "https://osamud0505-max.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });

async function vapid(env) {
  let v = await env.DAYBREAK.get("vapid", "json");
  if (!v) { v = await makeVapid(); await env.DAYBREAK.put("vapid", JSON.stringify(v)); }
  return v;
}
const getSubs = async (env) => (await env.DAYBREAK.get("subs", "json")) || [];
const validSub = (s) => s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) &&
  s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string" && s.endpoint.length < 1000;

async function sendAll(env, data, only) {
  const v = await vapid(env);
  const subs = await getSubs(env);
  const keep = [];
  const results = [];
  for (const s of subs) {
    if (only && s.endpoint !== only) { keep.push(s); continue; }
    let st = 0;
    try { st = await sendPush(s, data, v, SUBJECT); } catch { st = -1; }
    results.push(st);
    if (st !== 404 && st !== 410) keep.push(s); // gone subscriptions are forgotten
  }
  if (keep.length !== subs.length) await env.DAYBREAK.put("subs", JSON.stringify(keep));
  return results;
}

// Toronto date + minute for an instant.
function wall(ts, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const prevDay = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10); };

async function routine() {
  const res = await fetch(APP + "routine.json", { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error("routine.json " + res.status);
  return res.json();
}

// Reminders due at this exact minute (including after-midnight ones from yesterday's plan).
export function dueAt(r, ts) {
  const S = globalThis.DaybreakSchedule;
  const { key, min } = wall(ts, r.timezone || "America/Toronto");
  return [
    ...S.pushesFor(r, key).filter((p) => p.min === min),
    ...S.pushesFor(r, prevDay(key)).filter((p) => p.min === min + 1440),
  ];
}

export default {
  async scheduled(event, env) {
    const subs = await getSubs(env);
    if (!subs.length) return;
    const due = dueAt(await routine(), event.scheduledTime);
    for (const p of due) {
      await sendAll(env, { title: p.title, body: p.body, tag: p.id, url: APP });
    }
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method === "GET" && url.pathname === "/vapid") return json({ key: (await vapid(env)).publicKey });
    if (req.method === "GET" && url.pathname === "/") return json({ ok: true, name: "Daybreak notifications" });

    if (req.method === "POST" && (url.pathname === "/subscribe" || url.pathname === "/unsubscribe" || url.pathname === "/test")) {
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const sub = body && body.subscription;
      if (!validSub(sub)) return json({ error: "bad subscription" }, 400);
      const clean = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
      let subs = (await getSubs(env)).filter((s) => s.endpoint !== clean.endpoint);
      if (url.pathname === "/unsubscribe") { await env.DAYBREAK.put("subs", JSON.stringify(subs)); return json({ ok: true }); }
      // /subscribe and /test both make sure this phone is on the list.
      subs = [...subs, clean].slice(-MAX_SUBS);
      await env.DAYBREAK.put("subs", JSON.stringify(subs));
      if (url.pathname === "/test") {
        const [status] = await sendAll(env, { title: "Daybreak reminders are on", body: "This is how your reminders will look.", tag: "test", url: APP }, clean.endpoint);
        return json({ ok: status === 201 || status === 200, status });
      }
      return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  },
};
