import { initThemeUI } from "./theme.js";
import { getFilteredSortedPosts } from "./filters.js";
import { renderApp } from "./render.js";
import { state, setState } from "./state.js";

async function loadPosts() {
  const res = await fetch("./data/threads.json");
  return await res.json();
}

async function main() {
  initThemeUI();

  const posts = await loadPosts();
  setState({ posts });

  const visible = getFilteredSortedPosts(state);
  setState({ visible });

  renderApp(state, onAction);
}

function onAction(action) {
  if (action.type === "SET_FILTERS") {
    setState(action.payload);
  }
  const visible = getFilteredSortedPosts(state);
  setState({ visible });

  renderApp(state, onAction);
}

main();
