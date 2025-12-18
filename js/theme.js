import { state, setState } from "./state.js";

function applyTheme(mode) {
  // mode: auto | light | dark
  document.documentElement.dataset.theme = mode;

  const isDark =
    mode === "dark" ||
    (mode === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
}

export function initThemeUI() {
  // default theme
  applyTheme(state.theme);

  // if system changes and we're on auto
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change", () => {
    if (state.theme === "auto") applyTheme("auto");
  });

  // global handler used by render.js
  window.__setTheme = (mode) => {
    setState({ theme: mode });
    applyTheme(mode);
  };
}
