const state = {
  all: [],
  filterCat: "all",
  query: "",
};

const $ = (sel) => document.querySelector(sel);

function fmtMeta(a){
  const bits = [
    a.category ? `Category ${a.category}` : null,
    a.subcategory || null,
    a.student ? `By ${a.student}` : null,
    a.date || null,
  ].filter(Boolean);
  return bits.join(" • ");
}

function matches(a){
  const q = state.query.trim().toLowerCase();
  const catOk = state.filterCat === "all" || a.category === state.filterCat;
  if (!catOk) return false;
  if (!q) return true;

  const hay = [
    a.title, a.dek, a.student,
    ...(a.tags || []),
    a.subcategory,
    a.body_html ? stripHtml(a.body_html) : ""
  ].filter(Boolean).join(" ").toLowerCase();

  return hay.includes(q);
}

function stripHtml(html){
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function render(){
  const items = state.all.filter(matches);
  $("#resultsMeta").textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;

  // Hero
  const hero = items.find(x => x.highlight) || items[0] || null;
  if (hero) setHero(hero);

    // Feed (TEXT-ONLY GRID)
  const feed = $("#feed");
  feed.innerHTML = "";

  for (const a of items.slice(0, 80)) {
    const el = document.createElement("article");
    el.className = "textCard";

    el.innerHTML = `
      <h3 class="textTitle">
        <a href="#" data-open="${escAttr(a.id)}">${esc(a.title || "")}</a>
      </h3>
      <p class="textDek">${esc(a.dek || "")}</p>
      <div class="textMeta">${esc(fmtMeta(a))}</div>
    `;

    feed.appendChild(el);
  }


  // Highlights
  const highlights = $("#highlights");
  highlights.innerHTML = "";
  for (const a of state.all.filter(x => x.highlight).slice(0, 8)) {
    const div = document.createElement("div");
    div.className = "mini-item";
    div.innerHTML = `
      <a href="#" data-open="${escAttr(a.id)}">${esc(a.title || "")}</a>
      <span>${esc(fmtMeta(a))}</span>
    `;
    highlights.appendChild(div);
  }
}

function setHero(a){
  $("#heroKicker").textContent = `Featured • Category ${a.category}${a.subcategory ? ` • ${a.subcategory}` : ""}`;
  $("#heroTitle").textContent = a.title || "";
  $("#heroDek").textContent = a.dek || "";
  $("#heroMeta").textContent = fmtMeta(a);
  const btn = $("#heroOpen");
  btn.disabled = false;
  btn.onclick = () => openReader(a.id);
}

function openReader(id){
  const a = state.all.find(x => x.id === id);
  if (!a) return;

  $("#rKicker").textContent = `Category ${a.category}${a.subcategory ? ` • ${a.subcategory}` : ""}`;
  $("#rTitle").textContent = a.title || "";
  $("#rMeta").textContent = fmtMeta(a);

  // links
  const links = a.links || {};
  const linkBits = [];
  for (const [k,v] of Object.entries(links)) {
    if (!v) continue;
    linkBits.push(`<a href="${escAttr(v)}" target="_blank" rel="noreferrer">${esc(k.toUpperCase())}</a>`);
  }
  $("#rLinks").innerHTML = linkBits.join(" • ");

  // body
  $("#rBody").innerHTML = a.body_html || `<p>${esc(a.dek || "No content.")}</p>`;

  // attachments
  const at = a.attachments || [];
  $("#rAttachments").innerHTML = at.length
    ? `<h3>Attachments</h3><ul>${
        at.map(x => `<li><a href="${escAttr(x.url)}" target="_blank" rel="noreferrer">${esc(x.name)}</a></li>`).join("")
      }</ul>`
    : "";

  $("#reader").showModal();
}

function buildTagChips(all){
  const counts = new Map();
  for (const a of all) for (const t of (a.tags || [])) counts.set(t, (counts.get(t)||0)+1);
  const top = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 16);

  $("#chipRow").innerHTML = top.map(([t,c]) =>
    `<button class="chip" data-tag="${escAttr(t)}">${esc(t)} <span style="color:var(--muted)">(${c})</span></button>`
  ).join("");
}

function wireUI(){
  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });

  // Top category bar
  document.querySelectorAll(".topnav__link[data-filter]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.filterCat = a.dataset.filter;

      document.querySelectorAll(".topnav__link").forEach(x => x.classList.remove("is-active"));
      a.classList.add("is-active");
      render();
    });
  });

  // Optional dropdown items
  document.querySelectorAll(".topnav__item[data-filter]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.filterCat = a.dataset.filter;

      document.querySelectorAll(".topnav__link").forEach(x => x.classList.remove("is-active"));
      // Don’t mark More as active (or you can if you want)
      render();
      a.closest("details")?.removeAttribute("open");
    });
  });

  // Dropdown “Sections” links
  document.querySelectorAll(".nav__item").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.filterCat = a.dataset.filter;
      document.querySelectorAll(".nav__link").forEach(x => x.classList.remove("is-active"));
      document.querySelector('.nav__link[data-filter="all"]').classList.remove("is-active");
      render();
    });
  });
}

function showError(msg){
  const box = $("#errorBox");
  box.hidden = false;
  box.textContent = msg;
}

function esc(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function escAttr(s){ return esc(s).replaceAll('"',"&quot;"); }

async function main(){
  try {
    // IMPORTANT: use YOUR folder name: data/articles.json
    const res = await fetch("./data/articles.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ./data/articles.json (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("articles.json must be an array of article objects");

    state.all = data;
    buildTagChips(state.all);
    wireUI();
    render();
  } catch (err) {
    console.error(err);
    showError(
      `Could not load data. Open DevTools Console (Cmd+Option+J). ` +
      `Most common causes: not running a local server, or wrong JSON path. ` +
      `Error: ${err.message}`
    );
    $("#heroTitle").textContent = "Data not loaded";
    $("#heroDek").textContent = "Fix the error above, then refresh.";
  }
}

main();
