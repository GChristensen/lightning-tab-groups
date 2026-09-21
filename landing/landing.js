/* Lightning Tab Groups landing page.
 * Theme switching: the page follows the system theme until the visitor picks one;
 * the choice is kept in localStorage. Colors live in landing.css as tokens and
 * respond to the data-theme attribute set here.
 */
(() => {
  const STORAGE_KEY = "ltg-theme";
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function readStored() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    }
    catch (e) {
      return null;
    }
  }

  function store(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    catch (e) {
      // storage may be blocked, the choice then lasts until the page is closed
    }
  }

  function isDark() {
    return root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches;
  }

  // apply a saved choice before first paint to avoid a flash of the wrong theme
  const saved = readStored();
  if (saved)
    root.dataset.theme = saved;

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");

    if (!button)
      return;

    const sync = () => {
      button.setAttribute("aria-pressed", String(isDark()));
    };

    button.hidden = false;
    sync();

    button.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      root.dataset.theme = next;
      store(next);
      sync();
    });

    // while no explicit choice is made, keep the button state in step with the system
    systemDark.addEventListener("change", sync);
  });

  // ---- iframe-aware link handling ----
  // When embedded in an iframe, links open in a new tab; standalone, they
  // navigate normally in the same tab.
  function isEmbedded() {
    try {
      return window.self !== window.top;
    } catch (e) {
      // cross-origin parent access throws, which itself implies embedding
      return true;
    }
  }

  if (isEmbedded()) {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      links[i].target = "_blank";
      links[i].rel = "noopener noreferrer";
    }
  }

})();
