/* Daybreak's own notifications: subscribes this phone to the notification helper,
   so reminders arrive with Daybreak's name and icon instead of through ntfy. */
(function () {
  "use strict";
  const btn = document.getElementById("notifyBtn"), note = document.getElementById("notifyNote");
  if (!btn) return;
  const DEFAULT_NOTE = note.textContent;
  const say = (t) => (note.textContent = t);
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  async function helper() {
    for (const u of ["push-config.json", "https://raw.githubusercontent.com/osamud0505-max/Daybreak/main/push-config.json"]) {
      try {
        const r = await fetch(u + "?t=" + Date.now(), { cache: "no-store" });
        if (r.ok) { const j = await r.json(); if (j.worker) return j.worker.replace(/\/$/, ""); }
      } catch { /* try the next */ }
    }
    return null;
  }
  const post = (base, path, subscription) => fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription }),
  });
  const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const setOn = (on) => btn.setAttribute("aria-checked", String(on));

  async function current() {
    if (!supported) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  async function turnOn() {
    if (!supported) { say("This browser can't show Daybreak notifications. Use Chrome."); return; }
    btn.disabled = true; say("Setting up...");
    try {
      const base = await helper();
      if (!base) { say("Almost ready. The helper isn't set up yet."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { say("Notifications are blocked. Allow them for Daybreak in Chrome's site settings, then try again."); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { key } = await (await fetch(base + "/vapid")).json();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
      }
      const res = await (await post(base, "/test", sub.toJSON())).json();
      setOn(true);
      say(res.ok ? "On. A test notification is on its way." : "On, but the test didn't go through. Try again in a minute.");
      try { localStorage.setItem("daybreak-notify-sync", new Date().toDateString()); } catch { /* storage blocked */ }
    } catch (e) {
      say("Something went wrong. Check your connection and try again.");
    } finally { btn.disabled = false; }
  }

  async function turnOff() {
    btn.disabled = true;
    try {
      const sub = await current();
      if (sub) {
        const base = await helper();
        if (base) await post(base, "/unsubscribe", sub.toJSON()).catch(() => {});
        await sub.unsubscribe();
      }
      setOn(false); say(DEFAULT_NOTE);
    } finally { btn.disabled = false; }
  }

  btn.addEventListener("click", () => (btn.getAttribute("aria-checked") === "true" ? turnOff() : turnOn()));

  // Show the real state, and once a day remind the helper this phone still wants reminders.
  (async () => {
    if (!supported) { setOn(false); return; }
    const sub = await current();
    const on = !!sub && Notification.permission === "granted";
    setOn(on);
    if (on) say("On. Reminders come from Daybreak.");
    let last = null;
    try { last = localStorage.getItem("daybreak-notify-sync"); } catch { /* storage blocked */ }
    if (on && last !== new Date().toDateString()) {
      const base = await helper();
      if (base && (await post(base, "/subscribe", sub.toJSON()).catch(() => null))?.ok) {
        try { localStorage.setItem("daybreak-notify-sync", new Date().toDateString()); } catch { /* storage blocked */ }
      }
    }
  })();
})();
