// router.js — tiny hash router. No build step required.

const routes = {};

export function registerRoute(pattern, handler) {
  // pattern like "/grammar/:topicId"
  routes[pattern] = handler;
}

function matchRoute(path) {
  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let matched = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: routes[pattern], params };
  }
  return null;
}

export function navigate(path) {
  window.location.hash = path;
}

export function startRouter(rootEl, notFoundHandler) {
  async function render() {
    const full = window.location.hash.slice(1) || "/";
    const [path, queryString] = full.split("?");
    const query = new URLSearchParams(queryString || "");
    const match = matchRoute(path);
    rootEl.innerHTML = "";
    rootEl.scrollTop = 0;
    window.scrollTo(0, 0);
    if (match) {
      await match.handler(rootEl, match.params, query);
    } else if (notFoundHandler) {
      await notFoundHandler(rootEl);
    }
    highlightActiveNav(path);
  }

  function highlightActiveNav(path) {
    const base = "/" + (path.split("/").filter(Boolean)[0] || "");
    document.querySelectorAll("[data-nav-link]").forEach((el) => {
      const target = el.getAttribute("data-nav-link");
      el.classList.toggle("nav-active", target === base || (target === "/" && path === "/"));
    });
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
}
