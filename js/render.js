import { uniqueValues } from "./filters.js";

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tabButton(label, value, active) {
  return `<button class="tab ${active ? "active" : ""}" data-tab="${value}">${label}</button>`;
}

function themeButton(label, value, active) {
  return `<button class="pill ${active ? "active" : ""}" data-theme="${value}">${label}</button>`;
}

export function renderApp(s, onAction) {
  const app = document.getElementById("app");
  if (!app) return;

  const posts = s.visible ?? [];
  const homeworks = uniqueValues(s.posts, "homework");
  const models = uniqueValues(s.posts, "model");

  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="logo-dot"></div>
        <div>
          <div class="title">Special Participation A Explorer</div>
          <div class="subtitle">Filter and explore posts from a JSON export.</div>
        </div>
      </div>

      <div class="appearance">
        <div class="appearance-label">Appearance</div>
        <div class="pill-group">
          ${themeButton("Auto", "auto", s.theme === "auto")}
          ${themeButton("Light", "light", s.theme === "light")}
          ${themeButton("Dark", "dark", s.theme === "dark")}
        </div>
      </div>
    </header>

    <div class="shell">
      <aside class="sidebar card">
        <div class="side-title">EXPLORE POSTS</div>

        <label class="field">
          <div class="field-label">Homework</div>
          <select id="hwSelect">
            <option>All homeworks</option>
            ${homeworks.map(h => `<option ${h===s.homework ? "selected":""}>${escapeHtml(h)}</option>`).join("")}
          </select>
        </label>

        <label class="field">
          <div class="field-label">Model</div>
          <select id="modelSelect">
            <option>All models</option>
            ${models.map(m => `<option ${m===s.model ? "selected":""}>${escapeHtml(m)}</option>`).join("")}
          </select>
        </label>

        <label class="field">
          <div class="field-label">Search</div>
          <input id="qInput" placeholder="Search title or body text..." value="${escapeHtml(s.query)}" />
        </label>

        <label class="field">
          <div class="field-label">Sort by</div>
          <select id="sortSelect">
            ${["Newest first","Oldest first","Homework (A→Z)","Model (A→Z)"]
              .map(opt => `<option ${opt===s.sort ? "selected":""}>${opt}</option>`).join("")}
          </select>
        </label>
      </aside>

      <main class="main">
        <div class="tabs">
          ${tabButton("Overview", "overview", s.tab==="overview")}
          ${tabButton("Homework insights", "homework", s.tab==="homework")}
          ${tabButton("Model insights", "model", s.tab==="model")}
        </div>

        ${renderTabContent(s, posts)}
      </main>
    </div>
  `;

  // wire up events
  document.getElementById("hwSelect")?.addEventListener("change", (e) => {
    onAction({ type: "SET_FILTERS", payload: { homework: e.target.value } });
  });

  document.getElementById("modelSelect")?.addEventListener("change", (e) => {
    onAction({ type: "SET_FILTERS", payload: { model: e.target.value } });
  });

  document.getElementById("sortSelect")?.addEventListener("change", (e) => {
    onAction({ type: "SET_FILTERS", payload: { sort: e.target.value } });
  });

  document.getElementById("qInput")?.addEventListener("input", (e) => {
    onAction({ type: "SET_FILTERS", payload: { query: e.target.value } });
  });

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => onAction({ type: "SET_FILTERS", payload: { tab: btn.dataset.tab } }));
  });

  document.querySelectorAll("[data-theme]").forEach(btn => {
    btn.addEventListener("click", () => window.__setTheme?.(btn.dataset.theme));
  });
}

function renderTabContent(s, posts) {
  if (s.tab === "overview") {
    return `
      <section class="section">
        <h2>Overview</h2>
        <p class="muted">
          This page loads <code>data/threads.json</code>, then lets you filter by homework/model, search, sort, and browse cards.
        </p>

        <div class="info card">
          <div class="info-col">
            <h3>Data</h3>
            <ul>
              <li>One row per post in your JSON.</li>
              <li>Includes title, body, author, timestamps, tags, links.</li>
            </ul>
          </div>
          <div class="info-col">
            <h3>Metrics (summary)</h3>
            <ul>
              <li><b>Homework</b>: which HW the post is about.</li>
              <li><b>Model</b>: which model/tool is evaluated.</li>
              <li>Filters + sorting update the list below.</li>
            </ul>
          </div>
        </div>

        ${renderList(posts)}
      </section>
    `;
  }

  if (s.tab === "homework") {
    const counts = countBy(posts, "homework");
    return `
      <section class="section">
        <h2>Homework insights</h2>
        <p class="muted">Counts (after filters):</p>
        <div class="card">
          ${Object.entries(counts).map(([k,v]) => `<div class="row"><span>${escapeHtml(k)}</span><b>${v}</b></div>`).join("") || "<div class='muted'>No posts.</div>"}
        </div>
        ${renderList(posts)}
      </section>
    `;
  }

  const counts = countBy(posts, "model");
  return `
    <section class="section">
      <h2>Model insights</h2>
      <p class="muted">Counts (after filters):</p>
      <div class="card">
        ${Object.entries(counts).map(([k,v]) => `<div class="row"><span>${escapeHtml(k)}</span><b>${v}</b></div>`).join("") || "<div class='muted'>No posts.</div>"}
      </div>
      ${renderList(posts)}
    </section>
  `;
}

function renderList(posts) {
  const header = `<div class="muted small">Showing ${posts.length} posts</div>`;
  const cards = posts.map(renderCard).join("");
  return `<div class="list">${header}${cards || `<div class="card muted">No posts match your filters.</div>`}</div>`;
}

function renderCard(p) {
  const t = new Date(p.timestamp);
  const time = isNaN(t.getTime()) ? escapeHtml(p.timestamp) : t.toLocaleString();

  return `
    <article class="post card">
      <h3>${escapeHtml(p.title)}</h3>
      <div class="meta">
        <span>${escapeHtml(time)}</span>
        <span>by ${escapeHtml(p.author)}</span>
        ${p.edUrl ? `<a href="${escapeHtml(p.edUrl)}" target="_blank" rel="noreferrer">View on Ed</a>` : ""}
      </div>

      <div class="tags">
        ${p.homework ? `<span class="tag">${escapeHtml(p.homework)}</span>` : ""}
        ${p.model ? `<span class="tag tag2">${escapeHtml(p.model)}</span>` : ""}
      </div>

      ${p.pdfUrl ? `<a class="btn" href="${escapeHtml(p.pdfUrl)}" target="_blank" rel="noreferrer">Open PDF ↗</a>` : ""}

      <div class="stats muted">
        ${p.wordCount ?? 0} words · ${p.views ?? 0} views · ${p.replies ?? 0} replies
      </div>

      ${p.body ? `<details><summary>Show full write-up</summary><pre class="body">${escapeHtml(p.body)}</pre></details>` : ""}
    </article>
  `;
}

function countBy(posts, key) {
  const map = {};
  for (const p of posts) {
    const k = p[key] ?? "(none)";
    map[k] = (map[k] || 0) + 1;
  }
  // sort by count desc
  return Object.fromEntries(Object.entries(map).sort((a,b) => b[1]-a[1]));
}
