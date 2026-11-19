/* Daybreak's own icon set: soft, rounded line drawings on a 24px grid.
   Each icon is the inner SVG markup; icon(name) wraps it. */
(function (root) {
  "use strict";
  const P = {
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1"/>',
    sunrise: '<path d="M4 18h16M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 8v3M6.2 10.7l1.4 1.4M17.8 10.7l-1.4 1.4M3.5 14.5h1.6M18.9 14.5h1.6"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    star: '<path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7z"/>',
    toothbrush: '<rect x="4" y="13" width="16" height="3.2" rx="1.6"/><path d="M6.5 13V9.5M9 13V9M11.5 13V9.5"/>',
    bubbles: '<circle cx="9" cy="13" r="4"/><circle cx="16.5" cy="8" r="2.5"/><circle cx="17" cy="16" r="1.6"/><path d="M7.4 11.6a1.8 1.8 0 0 1 1.6-.9"/>',
    bed: '<path d="M3.5 18.5V8M3.5 15h17v3.5M20.5 15v-2.5a2.5 2.5 0 0 0-2.5-2.5h-7v5"/><circle cx="7.3" cy="12" r="1.6"/>',
    stretch: '<circle cx="12" cy="5" r="1.8"/><path d="M5 9.5l7 1.5 7-1.5M12 11v4M12 15l-3.5 4.5M12 15l3.5 4.5"/>',
    shoe: '<path d="M4 16.5V9.5l3.5.5 1.8 2.5 4.2 1 4.8 1.2a2 2 0 0 1 1.7 2v.3H4z"/><path d="M4 19h16"/>',
    bowl: '<path d="M4 11.5h16a8 8 0 0 1-16 0z"/><path d="M9 8c0-1.2 1-1.4 1-2.6M13 8c0-1.2 1-1.4 1-2.6"/>',
    book: '<path d="M12 7c-2-1.4-4.6-1.8-7.5-1.5v12c2.9-.3 5.5.1 7.5 1.5 2-1.4 4.6-1.8 7.5-1.5v-12C16.6 5.2 14 5.6 12 7z"/><path d="M12 7v11.5"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    apple: '<path d="M12 8.5c-1.5-1-5-1.2-6 2.3-1 3.4 1.2 8.2 3.6 8.2 1 0 1.4-.5 2.4-.5s1.4.5 2.4.5c2.4 0 4.6-4.8 3.6-8.2-1-3.5-4.5-3.3-6-2.3z"/><path d="M12 8.5c0-2 .8-3.4 2.5-4"/>',
    pot: '<path d="M5 10.5h14v5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 15.5z"/><path d="M3 10.5h18M10 7.5h4M9 5c.6.6.6 1.4 0 2M15 5c.6.6.6 1.4 0 2"/>',
    pencil: '<path d="M15.5 5.5l3 3L9 18l-4 1 1-4z"/><path d="M13.5 7.5l3 3"/>',
    dumbbell: '<path d="M8 12h8"/><rect x="4.5" y="8" width="3.5" height="8" rx="1.4"/><rect x="16" y="8" width="3.5" height="8" rx="1.4"/><path d="M3 10.5v3M21 10.5v3"/>',
    gamepad: '<path d="M7.5 8h9a4.5 4.5 0 0 1 4.3 5.8l-.9 3a2.3 2.3 0 0 1-3.9.9L14.2 15H9.8l-1.8 2.7a2.3 2.3 0 0 1-3.9-.9l-.9-3A4.5 4.5 0 0 1 7.5 8z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".9"/><circle cx="17.2" cy="12.8" r=".9"/>',
    pill: '<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.9 9 14.1 15"/><circle cx="18.5" cy="18.5" r="1.6"/>',
    drop: '<path d="M12 4s5.5 6 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 10 12 4 12 4z"/><path d="M9.6 14a2.4 2.4 0 0 0 2.4 2.4"/>',
    cloud: '<path d="M7.5 18h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7 1A3 3 0 0 0 7.5 18z"/>',
    thought: '<path d="M8 15h8a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.7.8A2.6 2.6 0 0 0 8 15z"/><circle cx="7" cy="18.5" r="1.1"/><circle cx="4.8" cy="20.6" r=".7"/>',
    phoneoff: '<rect x="7" y="3.5" width="10" height="17" rx="2.5"/><path d="M11 17.5h2M4 4l16 16"/>',
    heart: '<path d="M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 1.8C19 14.7 12 19 12 19z"/>',
    bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20.5h4"/>',
    flower: '<ellipse cx="12" cy="6.6" rx="2.3" ry="3.1" transform="rotate(0 12 10.5)"/><ellipse cx="12" cy="6.6" rx="2.3" ry="3.1" transform="rotate(72 12 10.5)"/><ellipse cx="12" cy="6.6" rx="2.3" ry="3.1" transform="rotate(144 12 10.5)"/><ellipse cx="12" cy="6.6" rx="2.3" ry="3.1" transform="rotate(216 12 10.5)"/><ellipse cx="12" cy="6.6" rx="2.3" ry="3.1" transform="rotate(288 12 10.5)"/><circle cx="12" cy="10.5" r="1.4"/>',
    tulip: '<path d="M7.5 6.5l2.2 2 2.3-3 2.3 3 2.2-2v4a4.5 4.5 0 0 1-9 0z"/><path d="M12 15v6M12 18.5c-1.6-1.6-3.5-1.8-5-1.5M12 19.5c1.4-1.3 3-1.5 4.3-1.2"/>',
    daisy: '<circle cx="12" cy="12" r="2.4"/><path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3M6.7 6.7l2.1 2.1M15.2 15.2l2.1 2.1M6.7 17.3l2.1-2.1M15.2 8.8l2.1-2.1"/>',
    pan: '<circle cx="10" cy="13" r="5.5"/><path d="M15.5 13h5.5"/><circle cx="10" cy="13" r="1.8"/>',
    sprout: '<path d="M12 20v-7"/><path d="M12 13c0-3.5-2.5-5.5-6.5-5.5 0 3.5 2.5 5.5 6.5 5.5zM12 11c0-3 2-5 5.5-5 0 3-2 5-5.5 5z"/>',
    flame: '<path d="M12 20a5.5 5.5 0 0 0 5.5-5.5c0-4-4-5.5-4-9.5-2.5 1.5-4 4-4 6-1.2-.6-1.8-1.8-2-2.8-1 1.3-1 3.3-1 4.3A5.5 5.5 0 0 0 12 20z"/>',
    rainbow: '<path d="M4 17a8 8 0 0 1 16 0M7.5 17a4.5 4.5 0 0 1 9 0"/>',
    sleep: '<path d="M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9z"/><path d="M14 4.5h3l-3 3h3"/>',
    sparkle: '<path d="M12 3.5c.6 4.4 2.6 6.6 7 7.5-4.4.9-6.4 3.1-7 7.5-.6-4.4-2.6-6.6-7-7.5 4.4-.9 6.4-3.1 7-7.5z"/>',
  };
  const icon = (name, cls = "") =>
    `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.sparkle}</svg>`;
  root.DaybreakIcons = { icon, names: Object.keys(P) };
})(typeof globalThis !== "undefined" ? globalThis : this);
