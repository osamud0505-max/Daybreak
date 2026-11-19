/* Daybreak music: mood playlists you fill with your own songs (made with ElevenLabs).
   Songs are saved on this phone only (IndexedDB), never uploaded anywhere. */
(function () {
  "use strict";
  const I = (n) => window.DaybreakIcons.icon(n);
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); kids.forEach((k) => e.append(k)); return e; };

  // Each mood is one playlist. `prompt` is ready to paste into ElevenLabs Music.
  const MOODS = [
    { id: "calm", name: "Calm", icon: "cloud", tint: "sky",
      prompt: "Soft ambient instrumental with warm felt piano, airy synth pads and gentle chimes. Slow 60 BPM, peaceful and spacious, like quiet morning light through a window. No vocals, no drums. Smooth, loopable ending." },
    { id: "dreamy", name: "Dreamy", icon: "sparkle", tint: "lilac",
      prompt: "Dreamy, magical lo-fi instrumental with music box, celesta, harp glissandos and soft shimmering pads, light vinyl crackle. 70 BPM, enchanted fairytale forest at twilight, gentle and whimsical. No vocals." },
    { id: "focused", name: "Focused", icon: "star", tint: "mint",
      prompt: "Minimal lo-fi study beat with mellow Rhodes chords, soft brushed drums and a warm round bass. Steady 80 BPM, calm and unobtrusive, made for deep concentration while reading or writing. No vocals, no sudden changes, loopable." },
    { id: "happy", name: "Happy", icon: "sun", tint: "butter",
      prompt: "Bright, cheerful indie-pop instrumental with ukulele, glockenspiel, light handclaps and a bouncy bass. 112 BPM, sunny and carefree, like a walk through the park on a clear day. Pastel, cute and uplifting. No vocals." },
    { id: "energized", name: "Energized", icon: "flame", tint: "pink",
      prompt: "Upbeat dreamy synthwave workout track with punchy drums, sparkly synth arpeggios and a driving bass. 128 BPM, confident and motivating but still pretty and pastel, building energy in waves. Instrumental, no vocals." },
    { id: "gentle", name: "Low day", icon: "heart", tint: "peach",
      prompt: "Tender, comforting instrumental with soft fingerpicked acoustic guitar, warm strings and a quiet piano melody. Slow 66 BPM, hopeful and kind, like a warm blanket on a rainy evening. No vocals, no drums." },
  ];
  // Which moods to suggest first for each kind of task.
  const ORDER = {
    walk: ["happy", "calm", "dreamy", "energized", "gentle", "focused"],
    read: ["calm", "dreamy", "focused", "gentle", "happy", "energized"],
    write: ["focused", "dreamy", "calm", "gentle", "happy", "energized"],
    move: ["energized", "happy", "dreamy", "calm", "focused", "gentle"],
  };
  const KIND = { "walk-am": "walk", walk: "walk", read: "read", write: "write", gym: "move", stretch: "move", "stretch-am": "move", "gym-prep": "move", room: "move", gaming: "move" };

  // ---------- storage ----------
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open("daybreak-music", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("tracks", { keyPath: "id", autoIncrement: true });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction("tracks", mode);
      const out = fn(t.objectStore("tracks"));
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  const allMeta = async () => {
    const d = await db();
    return new Promise((res) => {
      const out = [];
      const c = d.transaction("tracks").objectStore("tracks").openCursor();
      c.onsuccess = () => { const cur = c.result; if (!cur) return res(out); const { id, name, mood, added } = cur.value; out.push({ id, name, mood, added }); cur.continue(); };
      c.onerror = () => res(out);
    });
  };
  const getTrack = (id) => tx("readonly", (s) => s.get(id));

  // ---------- player ----------
  const audio = new Audio();
  audio.preload = "auto";
  let queue = [], qi = 0, mood = null, url = null;
  const bar = el("div", { className: "player", hidden: true });
  bar.innerHTML = `<span class="pl-icon"></span><span class="pl-text"><b class="pl-mood"></b><span class="pl-name"></span></span>
    <button type="button" class="pl-btn" data-a="toggle" aria-label="Play or pause"></button>
    <button type="button" class="pl-btn" data-a="next" aria-label="Next song">${I("next")}</button>
    <button type="button" class="pl-btn" data-a="stop" aria-label="Stop music">${I("close")}</button>`;
  document.body.append(bar);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function paint() {
    const m = MOODS.find((x) => x.id === mood);
    bar.hidden = !m;
    document.body.classList.toggle("has-player", !!m);
    if (!m) return;
    bar.dataset.tint = m.tint;
    bar.querySelector(".pl-icon").innerHTML = I(m.icon);
    bar.querySelector(".pl-mood").textContent = m.name;
    bar.querySelector(".pl-name").textContent = queue[qi] ? queue[qi].name : "";
    bar.querySelector('[data-a="toggle"]').innerHTML = I(audio.paused ? "play" : "pause");
  }
  async function playAt(i) {
    if (!queue.length) return;
    qi = (i + queue.length) % queue.length;
    const t = await getTrack(queue[qi].id);
    if (!t) return;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(t.blob);
    audio.src = url;
    try { await audio.play(); } catch { /* needs a tap first */ }
    const m = MOODS.find((x) => x.id === mood);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: `Daybreak · ${m.name}`, album: m.name,
        artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
    }
    paint();
  }
  async function playMood(id) {
    const tracks = (await allMeta()).filter((t) => t.mood === id);
    if (!tracks.length) return false;
    mood = id; queue = shuffle(tracks);
    await playAt(0);
    return true;
  }
  function stop() { audio.pause(); audio.removeAttribute("src"); if (url) URL.revokeObjectURL(url); url = null; mood = null; queue = []; paint(); }
  audio.addEventListener("ended", () => playAt(qi + 1));
  audio.addEventListener("play", paint);
  audio.addEventListener("pause", paint);
  bar.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]");
    if (!a) return;
    if (a.dataset.a === "toggle") audio.paused ? audio.play() : audio.pause();
    if (a.dataset.a === "next") playAt(qi + 1);
    if (a.dataset.a === "stop") stop();
  });
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => audio.play());
    navigator.mediaSession.setActionHandler("pause", () => audio.pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => playAt(qi + 1));
    navigator.mediaSession.setActionHandler("previoustrack", () => playAt(qi - 1));
  }

  // ---------- mood picker sheet ----------
  const sheet = el("div", { className: "sheet", hidden: true });
  sheet.innerHTML = `<div class="sheet-card card" role="dialog" aria-modal="true" aria-label="Pick a mood">
      <p class="label"><span class="emo">${I("music")}</span>How are you feeling?</p>
      <div class="moods"></div>
      <button type="button" class="link sheet-close">Not now</button></div>`;
  document.body.append(sheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest(".sheet-close")) sheet.hidden = true; });
  async function openPicker(taskId) {
    const kind = KIND[taskId] || "walk";
    const counts = {};
    (await allMeta()).forEach((t) => (counts[t.mood] = (counts[t.mood] || 0) + 1));
    const box = sheet.querySelector(".moods");
    box.innerHTML = "";
    ORDER[kind].forEach((id) => {
      const m = MOODS.find((x) => x.id === id);
      const n = counts[id] || 0;
      const b = el("button", { type: "button", className: `mood${n ? "" : " empty"}` });
      b.dataset.tint = m.tint;
      b.innerHTML = `<span class="mood-icon">${I(m.icon)}</span><span class="mood-name">${m.name}</span><span class="mood-n">${n ? `${n} song${n === 1 ? "" : "s"}` : "No songs yet"}</span>`;
      b.onclick = async () => {
        if (!n) { sheet.hidden = true; window.dispatchEvent(new CustomEvent("daybreak:go", { detail: "me" })); document.querySelector(".music")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        sheet.hidden = true; await playMood(id);
      };
      box.append(b);
    });
    sheet.hidden = false;
  }

  // ---------- library card (Me tab) ----------
  const card = el("section", { className: "card music" });
  card.dataset.tab = "me";
  card.innerHTML = `<p class="label"><span class="emo">${I("music")}</span>Mood playlists</p>
    <p class="hint">Make songs in ElevenLabs Music with the prompt for each mood, download them, then tap Add songs. They stay on this phone.</p>
    <div class="mood-list"></div>
    <input type="file" accept="audio/*" multiple hidden class="music-file">`;
  const anchor = document.querySelector(".card.focus");
  if (anchor) anchor.before(card); else document.querySelector("main")?.append(card);
  const file = card.querySelector(".music-file");
  let addingTo = null;
  file.addEventListener("change", async () => {
    const files = addingTo ? [...file.files] : [];
    for (const f of files) {
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
      await tx("readwrite", (s) => s.add({ name, mood: addingTo, blob: f, added: Date.now() }));
    }
    file.value = "";
    if (files.length && window.DaybreakSound) window.DaybreakSound.play("done");
    renderLibrary(addingTo);
  });
  async function renderLibrary(openId) {
    const tracks = await allMeta();
    const list = card.querySelector(".mood-list");
    list.innerHTML = "";
    MOODS.forEach((m) => {
      const mine = tracks.filter((t) => t.mood === m.id);
      const row = el("details", { className: "mood-row" });
      row.dataset.tint = m.tint;
      if (m.id === openId) row.open = true;
      row.innerHTML = `<summary><span class="mood-icon">${I(m.icon)}</span><span class="mood-name">${m.name}</span><span class="mood-n">${mine.length || "No"} song${mine.length === 1 ? "" : "s"}</span></summary>
        <div class="mood-body">
          <p class="meal-h">ElevenLabs prompt</p>
          <p class="prompt"></p>
          <div class="mood-actions">
            <button type="button" class="btn soft-btn" data-a="copy">${I("copy")} Copy prompt</button>
            <button type="button" class="btn" data-a="add">${I("plus")} Add songs</button>
          </div>
          <ul class="tracks"></ul>
          ${mine.length ? `<button type="button" class="link" data-a="play">${I("play")} Play ${m.name}</button>` : ""}
        </div>`;
      row.querySelector(".prompt").textContent = m.prompt;
      const ul = row.querySelector(".tracks");
      mine.forEach((t) => {
        const li = el("li", {}, el("span", { textContent: t.name }));
        const del = el("button", { type: "button", className: "link del", innerHTML: I("close"), title: "Remove song" });
        del.setAttribute("aria-label", `Remove ${t.name}`);
        del.onclick = async () => { await tx("readwrite", (s) => s.delete(t.id)); renderLibrary(m.id); };
        li.append(del); ul.append(li);
      });
      row.addEventListener("click", async (e) => {
        const a = e.target.closest("[data-a]");
        if (!a) return;
        if (a.dataset.a === "copy") {
          try { await navigator.clipboard.writeText(m.prompt); a.lastChild.textContent = " Copied"; setTimeout(() => (a.lastChild.textContent = " Copy prompt"), 1600); } catch { /* clipboard blocked */ }
        }
        if (a.dataset.a === "add") { addingTo = m.id; file.click(); }
        if (a.dataset.a === "play") playMood(m.id);
      });
      list.append(row);
    });
  }
  renderLibrary();

  window.DaybreakMusic = { KIND, open: openPicker, playMood, stop, moods: MOODS };
})();
