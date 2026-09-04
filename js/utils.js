// utils.js — small shared helpers used across views.

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") el.className = value;
    else if (key === "html") el.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (typeof value === "boolean") {
      if (value) el.setAttribute(key, "");
    } else if (value !== null && value !== undefined) {
      el.setAttribute(key, value);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  kids.forEach((child) => {
    if (child === null || child === undefined) return;
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return el;
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function levelBadgeClass(level) {
  return `badge badge-${level.toLowerCase()}`;
}

// SVG shape icon used for grammar topics (Bauhaus-style geometric markers).
export function shapeIcon(shape, size = 22) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`;
  const shapes = {
    circle: `<svg ${common}><circle cx="12" cy="12" r="9"/></svg>`,
    square: `<svg ${common}><rect x="3.5" y="3.5" width="17" height="17"/></svg>`,
    triangle: `<svg ${common}><polygon points="12,3 21,20 3,20"/></svg>`,
    diamond: `<svg ${common}><polygon points="12,2 22,12 12,22 2,12"/></svg>`,
  };
  const wrapper = document.createElement("span");
  wrapper.innerHTML = shapes[shape] || shapes.circle;
  return wrapper.firstChild;
}
