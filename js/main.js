const state = {
  all: [],
  filterCat: "all",
  filterSubcat: "all",
  selectedTags: new Set(), // Multi-select tags for catalog layout
  sortBy: "date-desc",
  query: "",
  similarPosts: null, // Cached similarity map {[id]: similarArticles[]}
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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

  // Category filter (for overview page)
  if (!isDirectoryPage()) {
  const catOk = state.filterCat === "all" || a.category === state.filterCat;
  if (!catOk) return false;
  }

  // Subcategory filter (categories in catalog layout)
  const subcatOk = state.filterSubcat === "all" || (a.subcategory || "Other") === state.filterSubcat;
  if (!subcatOk) return false;

  // Tag filter (multi-select: article must have ALL selected tags)
  if (isDirectoryPage() && state.selectedTags.size > 0) {
    const articleTags = new Set((a.tags || []).map(t => t.trim()));
    for (const selectedTag of state.selectedTags) {
      if (!articleTags.has(selectedTag)) {
        return false;
      }
    }
  }

  // Search query
  if (!q) return true;

  const hay = [
    a.title, a.dek, a.student,
    ...(a.tags || []),
    a.subcategory,
    a.body_html ? stripHtml(a.body_html) : ""
  ].filter(Boolean).join(" ").toLowerCase();

  return hay.includes(q);
}

function sortItems(items) {
  const sorted = [...items];

  switch(state.sortBy) {
    case "date-desc":
      sorted.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      break;
    case "date-asc":
      sorted.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      break;
    case "student":
      sorted.sort((a, b) => (a.student || "").localeCompare(b.student || ""));
      break;
    case "title":
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "attachments":
      sorted.sort((a, b) => (b.attachments?.length || 0) - (a.attachments?.length || 0));
      break;
  }

  return sorted;
}

function stripHtml(html){
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// Extract external URLs from HTML or text content
function extractExternalLinks(html, text) {
  const links = new Set();
  
  // Extract from HTML (if present)
  if (html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const anchorTags = tempDiv.querySelectorAll("a[href]");
    anchorTags.forEach(a => {
      const href = a.getAttribute("href");
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        // Clean up URL (remove trailing punctuation that might not be part of URL)
        let cleanUrl = href.trim();
        // Remove common trailing punctuation
        cleanUrl = cleanUrl.replace(/[.,;:!?]+$/, '');
        links.add(cleanUrl);
      }
    });
    
    // Also extract plain URLs from text content (including those not in anchor tags)
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    // Improved regex to match URLs more accurately
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?]/gi;
    const matches = textContent.match(urlRegex);
    if (matches) {
      matches.forEach(url => {
        // Clean up URL
        let cleanUrl = url.trim();
        // Remove trailing punctuation that's likely not part of URL
        cleanUrl = cleanUrl.replace(/[.,;:!?]+$/, '');
        if (cleanUrl.length > 0) {
          links.add(cleanUrl);
        }
      });
    }
  }
  
  // Extract from plain text (if provided separately)
  if (text) {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?]/gi;
    const matches = text.match(urlRegex);
    if (matches) {
      matches.forEach(url => {
        let cleanUrl = url.trim();
        cleanUrl = cleanUrl.replace(/[.,;:!?]+$/, '');
        if (cleanUrl.length > 0) {
          links.add(cleanUrl);
        }
      });
    }
  }
  
  // Return unique, sorted URLs
  return Array.from(links).sort();
}

function render(){
  const items = state.all.filter(matches);
  const sorted = sortItems(items);

  // Results count (only on Directory page)
  const resultsMeta = $("#resultsMeta");
  if (resultsMeta) {
    resultsMeta.textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;
  }
  
  // Show active filter indicator (only on Directory page)
  const activeFilter = $("#activeFilter");
  if (activeFilter && isDirectoryPage()) {
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get('tag');
    if (tagParam) {
      const tag = decodeURIComponent(tagParam);
      activeFilter.style.display = 'flex';
      activeFilter.innerHTML = `
        <span class="active-filter__label">Active filter:</span>
        <span class="active-filter__tag">${esc(tag)}</span>
        <button class="active-filter__clear">×</button>
      `;
      // Attach click handler to the clear button
      const clearBtn = activeFilter.querySelector('.active-filter__clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', clearTagFilter);
      }
    } else {
      activeFilter.style.display = 'none';
    }
  }

  // Hero (only on Overview page) - now static, no dynamic content needed

  // Results list - catalog layout for Directory page
  const feed = $("#feed");
  const emptyState = $("#emptyState");
  if (feed) {
  feed.innerHTML = "";

    if (sorted.length === 0) {
      if (emptyState) emptyState.style.display = "block";
    } else {
      if (emptyState) emptyState.style.display = "none";
      
      for (const a of sorted) {
    const el = document.createElement("article");
        el.className = "result-item";

        // Build preview text - use summary if available, otherwise dek, otherwise truncated body
        // Display full overview content without truncation
        let previewText = "";
        if (a.summary) {
          previewText = a.summary;
        } else if (a.dek) {
          previewText = a.dek;
        } else {
          previewText = stripHtml(a.body_html || "").substring(0, 200);
        }
        // Show full preview text without truncation
        const preview = previewText;

        // Build tags display
        const tagsHTML = (a.tags && a.tags.length > 0)
          ? `<div class="result-item__tags">${a.tags.map(tag => `<span class="article-tag">${esc(tag)}</span>`).join('')}</div>`
          : '<div class="result-item__tags"></div>';

    // Attachment indicator
    const attachmentBadge = a.attachments?.length
          ? `<div class="result-item__attachment-badge">📎 ${a.attachments.length} file${a.attachments.length > 1 ? 's' : ''}</div>`
          : '';

        // Similar articles
        let similarHTML = '';
        if (state.similarPosts && state.similarPosts.has(a.id)) {
          const similar = state.similarPosts.get(a.id).slice(0, 3);
          if (similar.length > 0) {
            similarHTML = `
              <div class="similar-articles">
                <div class="similar-articles__title">Similar articles</div>
                <div class="similar-articles__list">
                  ${similar.map(sim => `
                    <a href="#" class="similar-article" data-open="${escAttr(sim.id)}">
                      <span class="similar-article__title">${esc(cleanTitle(sim.title) || "")}</span>
                      <span class="similar-article__category">${esc(sim.subcategory || sim.category || "")}</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }
        }

    el.innerHTML = `
          <h2 class="result-item__title">
        <a href="#" data-open="${escAttr(a.id)}">${esc(cleanTitle(a.title) || "")}</a>
          </h2>
          <p class="result-item__preview">${esc(preview)}</p>
          <div class="result-item__meta">${esc(fmtMeta(a))}</div>
          <div class="result-item__footer">
            ${tagsHTML}
        ${attachmentBadge}
          </div>
          ${similarHTML}
    `;

    feed.appendChild(el);
        
        // Render LaTeX/MathJax in preview text after element is added
        const previewEl = el.querySelector('.result-item__preview');
        if (previewEl) {
          renderMathJax(previewEl);
        }
      }
    }
  }

  // Highlights (optional, if present)
  const highlights = $("#highlights");
  if (highlights) {
    highlights.innerHTML = "";
    for (const a of state.all.filter(x => x.highlight).slice(0, 8)) {
      const div = document.createElement("div");
      div.className = "mini-item";
      div.innerHTML = `
        <a href="#" data-open="${escAttr(a.id)}">${esc(cleanTitle(a.title) || "")}</a>
        <span>${esc(fmtMeta(a))}</span>
      `;
      highlights.appendChild(div);
    }
  }
}

function setHero(a){
  const heroKicker = $("#heroKicker");
  const heroTitle = $("#heroTitle");
  const heroDek = $("#heroDek");
  const heroMeta = $("#heroMeta");
  const btn = $("#heroOpen");
  
  if (heroKicker) heroKicker.textContent = `Featured • Category ${a.category}${a.subcategory ? ` • ${a.subcategory}` : ""}`;
  if (heroTitle) heroTitle.textContent = cleanTitle(a.title) || "";
  if (heroDek) heroDek.textContent = a.dek || "";
  if (heroMeta) heroMeta.textContent = fmtMeta(a);
  if (btn) {
  btn.disabled = false;
  btn.onclick = () => openReader(a.id);
  }
}

function openReader(id){
  const a = state.all.find(x => x.id === id);
  if (!a) return;

  // Store current URL state before opening modal (for back button)
  const currentUrl = window.location.href;
  if (window.readerPreviousUrl === undefined) {
    window.readerPreviousUrl = currentUrl;
  }

  // Left Column: Metadata
  $("#rTitle").textContent = cleanTitle(a.title) || "";
  $("#rAuthor").textContent = a.student || "Unknown";
  $("#rDate").textContent = a.date || "Unknown";
  $("#rCategory").textContent = a.subcategory || a.category || "Uncategorized";

  // Tags
  const tagsRow = $("#rTagsRow");
  const tagsContainer = $("#rTags");
  if (a.tags && a.tags.length > 0) {
    tagsRow.style.display = "flex";
    tagsContainer.innerHTML = a.tags.map(tag => 
      `<span class="article-tag">${esc(tag)}</span>`
    ).join("");
  } else {
    tagsRow.style.display = "none";
    tagsContainer.innerHTML = "";
  }

  // Links
  const links = a.links || {};
  const linkBits = [];
  for (const [k,v] of Object.entries(links)) {
    if (!v) continue;
    const icon = k === 'ed' ? '🔗' : k === 'chatgpt' ? '🤖' : k === 'github' ? '💻' : '🌐';
    linkBits.push(`<a href="${escAttr(v)}" target="_blank" rel="noreferrer" class="link-badge">${icon} ${esc(k.toUpperCase())}</a>`);
  }
  $("#rLinks").innerHTML = linkBits.join(" ") || "";

  // Right Column: Accordion Sections
  
  // Overview section - use summary if available, otherwise dek, otherwise truncated body
  const overview = $("#rOverview");
  if (overview) {
    let overviewText = "";
    if (a.summary) {
      overviewText = a.summary;
    } else if (a.dek) {
      overviewText = a.dek;
    } else if (a.body_html) {
      overviewText = stripHtml(a.body_html).substring(0, 300) + "...";
    } else {
      overviewText = "No overview available.";
    }
    overview.innerHTML = `<p>${esc(overviewText)}</p>`;
    
    // Render LaTeX/MathJax in overview
    renderMathJax(overview);
  }

  // Full content section
  $("#rBody").innerHTML = a.body_html || `<p>${esc(a.dek || "No content available.")}</p>`;

  // Render LaTeX/MathJax after content is loaded
  renderMathJax($("#rBody"));

  // External Links section - use external_links field if available, otherwise extract from body_html and summary
  let externalLinks = a.external_links || [];
  if (externalLinks.length === 0) {
    // Fallback: extract from content if external_links field is not present
    externalLinks = extractExternalLinks(a.body_html, a.summary);
  }
  const externalLinksSection = $("#rExternalLinksSection");
  if (externalLinks.length > 0) {
    externalLinksSection.style.display = "block";
    const externalLinksHTML = `
      <div class="attachments-section">
        <div class="attachment-grid">
          ${externalLinks.map(url => {
            // Try to determine a friendly name from the URL
            let displayName = url;
            try {
              const urlObj = new URL(url);
              // Use domain + path for display, but truncate if too long
              displayName = urlObj.hostname.replace('www.', '') + urlObj.pathname;
              if (displayName.length > 60) {
                displayName = displayName.substring(0, 57) + '...';
              }
            } catch (e) {
              // If URL parsing fails, just truncate the original URL
              if (displayName.length > 60) {
                displayName = displayName.substring(0, 57) + '...';
              }
            }
            
            // Determine icon based on domain
            let icon = '🔗';
            try {
              const urlObj = new URL(url);
              const hostname = urlObj.hostname.toLowerCase();
              if (hostname.includes('github')) icon = '💻';
              else if (hostname.includes('claude') || hostname.includes('chatgpt') || hostname.includes('openai')) icon = '🤖';
              else if (hostname.includes('youtube') || hostname.includes('youtu.be')) icon = '▶️';
              else if (hostname.includes('colab') || hostname.includes('jupyter')) icon = '📓';
              else if (hostname.includes('vercel') || hostname.includes('netlify') || hostname.includes('github.io')) icon = '🌐';
            } catch (e) {
              // Keep default icon
            }
            
            return `
              <a href="${escAttr(url)}" target="_blank" rel="noreferrer" class="attachment-card">
                <span class="attachment-icon">${icon}</span>
                <span class="attachment-name">${esc(displayName)}</span>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    `;
    $("#rExternalLinks").innerHTML = externalLinksHTML;
  } else {
    externalLinksSection.style.display = "none";
    $("#rExternalLinks").innerHTML = "";
  }

  // Attachments section
  const at = a.attachments || [];
  const attachmentsSection = $("#rAttachmentsSection");
  if (at.length > 0) {
    attachmentsSection.style.display = "block";
    const attachmentHTML = `
      <div class="attachments-section">
        <div class="attachment-grid">
          ${at.map(x => {
            const ext = x.name.split('.').pop().toLowerCase();
            const icon = ext === 'pdf' ? '📄' : ext === 'py' ? '🐍' : ext === 'ipynb' ? '📓' : '📁';
            return `
              <a href="${escAttr(x.url)}" target="_blank" rel="noreferrer" class="attachment-card">
                <span class="attachment-icon">${icon}</span>
                <span class="attachment-name">${esc(x.name)}</span>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    `;
    $("#rAttachments").innerHTML = attachmentHTML;
  } else {
    attachmentsSection.style.display = "none";
    $("#rAttachments").innerHTML = "";
  }

  // Initialize accordions
  initAccordions();

  // Setup back button handler (only on directory page)
  const backBtn = $("#backBtn");
  if (backBtn && isDirectoryPage()) {
    // Remove inline onclick and set up proper handler
    backBtn.removeAttribute('onclick');
    backBtn.onclick = (e) => {
      e.preventDefault();
      // Close the modal
      const reader = $("#reader");
      if (reader) {
        reader.close();
      }
      // Restore URL to directory page without article parameter
      const url = new URL(window.location);
      url.searchParams.delete('article');
      window.history.replaceState({}, '', url);
      // Clear stored URL
      window.readerPreviousUrl = undefined;
    };
  }

  $("#reader").showModal();
}

function initAccordions() {
  // Close all accordions except the default open one (Full Content)
  const sections = document.querySelectorAll('.accordion-section');
  sections.forEach(section => {
    const header = section.querySelector('.accordion-header');
    const content = section.querySelector('.accordion-content');
    const isContentSection = section.dataset.section === 'content';
    
    if (isContentSection) {
      header.setAttribute('aria-expanded', 'true');
      content.classList.add('active');
    } else {
      header.setAttribute('aria-expanded', 'false');
      content.classList.remove('active');
    }

    // Add click handler
    header.onclick = () => {
      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', !isExpanded);
      if (!isExpanded) {
        content.classList.add('active');
        // Re-render MathJax when accordion opens
        renderMathJax(content);
      } else {
        content.classList.remove('active');
      }
    };
  });
}

// Helper function to render MathJax with proper error handling
function renderMathJax(element) {
  if (!element) return;
  
  // Wait for MathJax to be ready
  if (window.MathJax) {
    if (window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([element]).catch((err) => {
        console.warn('MathJax rendering error:', err);
      });
    } else {
      // MathJax not fully loaded yet, wait a bit
      setTimeout(() => renderMathJax(element), 100);
    }
  }
}

function buildSubcategoryFilters(all) {
  // Build catalog layout sidebar filters
  if (isDirectoryPage() && $("#categoryFilters")) {
    buildCatalogCategoryFilters(all);
    buildCatalogTagFilters(all);
    return;
  }

  // Original layout (fallback)
  const subcats = new Map();
  for (const a of all) {
    const s = a.subcategory || "Other";
    subcats.set(s, (subcats.get(s) || 0) + 1);
  }

  const sorted = [...subcats.entries()].sort((a,b) => b[1] - a[1]);

  const container = $("#subcatFilters");
  if (!container) return;

  container.innerHTML = `
    <button class="filter-chip active" data-subcat="all">All (${all.length})</button>
    ${sorted.map(([s, c]) =>
      `<button class="filter-chip" data-subcat="${escAttr(s)}">${esc(s)} (${c})</button>`
    ).join("")}
  `;

  // Wire up click handlers
  container.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.filterSubcat = btn.dataset.subcat;
      container.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateURL();
      render();
    });
  });

  // If URL has subcategory parameter, activate the matching chip
  const urlParams = new URLSearchParams(window.location.search);
  const subcategoryParam = urlParams.get('subcategory');
  if (subcategoryParam) {
    const decodedParam = decodeURIComponent(subcategoryParam);
    const matchingChip = container.querySelector(`[data-subcat="${escAttr(decodedParam)}"]`);
    if (matchingChip) {
      container.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
      matchingChip.classList.add("active");
      state.filterSubcat = decodedParam;
    }
  }
}

function buildCatalogCategoryFilters(all) {
  const subcats = new Map();
  for (const a of all) {
    const s = (a.subcategory || "Other").trim();
    subcats.set(s, (subcats.get(s) || 0) + 1);
  }

  const sorted = [["All", all.length], ...[...subcats.entries()].sort((a, b) => b[1] - a[1])];

  const container = $("#categoryFilters");
  if (!container) return;

  container.innerHTML = sorted.map(([s, c]) => {
    const id = `cat-${s === "All" ? "all" : s.toLowerCase().replace(/\s+/g, "-")}`;
    const isActive = (s === "All" && state.filterSubcat === "all") || (s !== "All" && state.filterSubcat === s);
    return `
      <div class="filter-item ${isActive ? 'active' : ''}">
        <input type="radio" id="${id}" name="category" value="${s === "All" ? "all" : escAttr(s)}" ${isActive ? 'checked' : ''}>
        <label for="${id}">
          <span>${esc(s)}</span>
          <span class="filter-item__count">(${c})</span>
        </label>
      </div>
    `;
  }).join("");

  // Wire up change handlers
  container.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) {
        state.filterSubcat = e.target.value;
        container.querySelectorAll(".filter-item").forEach(item => item.classList.remove("active"));
        e.target.closest(".filter-item").classList.add("active");
        updateClearFiltersButton();
        updateURL();
        render();
      }
    });
  });
}

function buildCatalogTagFilters(all) {
  // Assign tags to articles that don't have them
  all.forEach(article => {
    if (!article.tags || article.tags.length === 0) {
      article.tags = assignTagsToArticle(article);
    }
  });
  
  const counts = new Map();
  for (const a of all) {
    for (const t of (a.tags || [])) {
      const normalizedTag = t.trim();
      if (normalizedTag) {
        counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1);
      }
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const container = $("#tagFilters");
  if (!container) return;

  container.innerHTML = sorted.map(([t, c]) => {
    const id = `tag-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const isChecked = state.selectedTags.has(t);
    return `
      <div class="filter-item ${isChecked ? 'active' : ''}">
        <input type="checkbox" id="${id}" value="${escAttr(t)}" ${isChecked ? 'checked' : ''}>
        <label for="${id}">
          <span>${esc(t)}</span>
          <span class="filter-item__count">(${c})</span>
        </label>
      </div>
    `;
  }).join("");
  
  // Add change handlers
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener("change", (e) => {
      const tag = e.target.value;
      if (e.target.checked) {
        state.selectedTags.add(tag);
      } else {
        state.selectedTags.delete(tag);
      }
      e.target.closest(".filter-item").classList.toggle("active", e.target.checked);
      updateClearFiltersButton();
      updateURL();
      render();
    });
  });
  
  updateClearFiltersButton();
}

function updateClearFiltersButton() {
  const clearBtn = $("#clearFilters");
  if (clearBtn) {
    const hasFilters = state.filterSubcat !== "all" || state.selectedTags.size > 0 || state.query.trim() !== "";
    clearBtn.style.display = hasFilters ? "block" : "none";
  }
}

function clearAllFilters() {
  state.filterSubcat = "all";
  state.selectedTags.clear();
  state.query = "";
  const searchInput = $("#searchInput");
  if (searchInput) searchInput.value = "";
  updateURL();
  render();
  // Update UI
  const categoryContainer = $("#categoryFilters");
  if (categoryContainer) {
    categoryContainer.querySelectorAll(".filter-item").forEach(item => item.classList.remove("active"));
    const allRadio = categoryContainer.querySelector('input[value="all"]');
    if (allRadio) {
      allRadio.checked = true;
      allRadio.closest(".filter-item").classList.add("active");
    }
  }
  const tagContainer = $("#tagFilters");
  if (tagContainer) {
    tagContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.closest(".filter-item").classList.remove("active");
    });
  }
  updateClearFiltersButton();
}

function clearTagFilter() {
  const url = new URL(window.location);
  url.searchParams.delete('tag');
  window.history.replaceState({}, '', url);
  state.selectedTags.clear();
  updateURL();
  updateClearFiltersButton();
  if (isDirectoryPage()) {
    buildCatalogTagFilters(state.all);
  }
  render();
}

function updateURL() {
  const params = new URLSearchParams();
  if (state.filterSubcat !== "all") {
    params.set("subcategory", state.filterSubcat);
  }
  if (state.selectedTags.size > 0) {
    params.set("tags", Array.from(state.selectedTags).join(","));
  }
  if (state.query.trim()) {
    params.set("q", state.query.trim());
  }
  const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", newURL);
}

// Tag assignment function
function assignTagsToArticle(article) {
  // If tags already exist and are not empty, use them
  if (article.tags && article.tags.length > 0) {
    return article.tags;
  }
  
  const tags = new Set();
  const availableTags = {
    "optimization": ["optimization", "optimizer", "optimize", "optimizing", "gradient descent"],
    "SGD": ["SGD", "stochastic gradient descent", "vanilla sgd"],
    "momentum": ["momentum", "momentum-based", "momentum sgd", "momentum optimizer"],
    "implicit regularization": ["implicit regularization", "implicit regulariz", "implicit bias"],
    "Adam": ["Adam", "adam optimizer", "adamw", "adaptive moment"],
    "features/representation": ["features", "representation", "feature learning", "representations"],
    "optimizer comparisons": ["optimizer comparison", "compare optimizers", "optimizer vs", "sgd vs", "adam vs"],
    "induced matrix norms": ["induced matrix norm", "matrix norm", "induced norm", "frobenius", "spectral norm"],
    "μP (maximal update parameterization)": ["μP", "muP", "maximal update", "parameterization", "mup"],
    "MuON": ["MuON", "muon", "second-order", "second order"],
    "CNNs": ["CNN", "CNNs", "convolutional", "conv net", "convolutional neural network"],
    "pooling/downsampling": ["pooling", "downsampling", "max pool", "average pool", "downsample"],
    "data augmentation": ["data augmentation", "augment", "augmentation", "augmented data"],
    "normalization layers": ["normalization", "batch norm", "layer norm", "instance norm", "group norm", "normalization layer"],
    "dropout": ["dropout", "drop out"],
    "ResNets": ["ResNet", "ResNets", "residual network", "residual connection", "skip connection"],
    "fully convolutional networks (FCNs)": ["FCN", "FCNs", "fully convolutional", "fully convolutional network"],
    "U-Nets": ["U-Net", "U-Nets", "unet", "unets", "u-net"],
    "GNNs": ["GNN", "GNNs", "graph neural network", "graph neural", "graph network"],
    "DiffPool": ["DiffPool", "diffpool", "differentiable pooling"],
    "RNNs": ["RNN", "RNNs", "recurrent neural network", "recurrent", "lstm", "gru"],
    "self-supervision": ["self-supervision", "self-supervised", "self supervision", "self supervised"],
    "state-space models (SSMs)": ["SSM", "SSMs", "state space", "state-space", "state space model"],
    "attention": ["attention", "attention mechanism", "attention layer", "self-attention", "self attention"],
    "Transformers": ["Transformer", "Transformers", "transformer", "transformer model", "transformer architecture"],
    "in-context learning (ICL)": ["in-context learning", "ICL", "in context learning", "few-shot", "few shot"],
    "prompting": ["prompt", "prompting", "prompts", "prompt engineering"],
    "PEFT": ["PEFT", "parameter efficient", "parameter-efficient"],
    "soft prompting": ["soft prompt", "soft prompting", "learnable prompt"],
    "LoRA": ["LoRA", "lora", "low-rank adaptation", "low rank"],
    "transfer learning": ["transfer learning", "transfer", "fine-tuning", "fine tuning", "finetuning"],
    "meta-learning": ["meta-learning", "meta learning", "learn to learn", "maml"],
    "generative models": ["generative", "generation", "generative model", "VAE", "GAN", "diffusion", "autoregressive"],
    "post-training": ["post-training", "post training", "posttrain", "alignment", "RLHF"]
  };
  
  const textContent = [
    article.title || '',
    article.dek || '',
    stripHtml(article.body_html || '')
  ].join(' ').toLowerCase();
  
  for (const [tag, keywords] of Object.entries(availableTags)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textContent)) {
        tags.add(tag);
        break;
      }
    }
  }
  
  return Array.from(tags).sort();
}

function buildTagChips(all){
  // If catalog layout, use buildCatalogTagFilters instead
  if (isDirectoryPage() && $("#tagFilters") && $("#tagFilters").classList.contains("filter-list")) {
    buildCatalogTagFilters(all);
    return;
  }

  // Original layout (fallback)
  // Assign tags to articles that don't have them
  all.forEach(article => {
    if (!article.tags || article.tags.length === 0) {
      article.tags = assignTagsToArticle(article);
    }
  });
  
  const counts = new Map();
  for (const a of all) {
    for (const t of (a.tags || [])) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 20);

  const container = $("#tagFilters");
  if (!container) return;

  container.innerHTML = top.map(([t, c]) =>
    `<button class="filter-chip" data-tag="${escAttr(t)}">${esc(t)} <span class="chip-count">(${c})</span></button>`
  ).join("");
  
  // Add click handlers
  container.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      const searchInput = $("#searchInput");
      if (searchInput) {
        searchInput.value = tag;
        state.query = tag;
        updateURL();
        render();
      }
    });
  });
}

function buildFeaturedCarousel(all) {
  const grid = $("#featuredExamplesGrid");
  if (!grid) return;

  // Featured post IDs (in order from the image)
  const featuredIds = [
    "ed-7363141", // Jason Trinh - AI Assisted Annotations
    "ed-7406979", // Elizabeth Weaver - Socratic Tutor
    "ed-7392001", // Mihir Rao - Gemini + Manim
    "ed-7389324", // Ken Zheng - Enhanced Lecture to Note Transcription Pipeline
  ];

  // Find the featured posts
  const featuredPosts = featuredIds.map(id => all.find(a => a.id === id)).filter(Boolean);

  if (featuredPosts.length === 0) {
    console.error('[Featured Examples] No featured posts found. Check IDs:', featuredIds);
    return;
  }

  // Build grid items (one post per card)
  grid.innerHTML = featuredPosts.map((post) => {
    const edLink = post.links?.ed || '#';
    const title = cleanTitle(post.title) || "Untitled";
    const author = post.student || "Anonymous";
    const category = post.subcategory || "Other";
    const description = post.dek || post.summary || "No description available.";
    
    return `
      <div class="featured-card" data-article-id="${escAttr(post.id)}">
        <div class="featured-card__badge">${esc(category)}</div>
        <h3 class="featured-card__title">${esc(title)}</h3>
        <p class="featured-card__author">By ${esc(author)}</p>
        <p class="featured-card__description">${esc(description)}</p>
        <div class="featured-card__actions">
          <button class="featured-card__link featured-card__link--primary" data-article-id="${escAttr(post.id)}">
            View Details →
          </button>
          <a href="${escAttr(edLink)}" target="_blank" rel="noopener noreferrer" class="featured-card__link featured-card__link--secondary" onclick="event.stopPropagation()">
            Open in Ed →
          </a>
        </div>
      </div>
    `;
  }).join("");

  // Add click handlers to cards to open reader modal
  grid.querySelectorAll('.featured-card').forEach(card => {
    const articleId = card.dataset.articleId;
    if (articleId) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on a link
        if (e.target.closest('.featured-card__link--secondary')) {
          return;
        }
        // Open reader modal
        openReader(articleId);
      });
    }
  });

  // Also handle the "View Details" button click
  grid.querySelectorAll('.featured-card__link--primary').forEach(btn => {
    const articleId = btn.dataset.articleId;
    if (articleId) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openReader(articleId);
      });
    }
  });
}

function buildCategoriesCarousel(all) {
  const container = $("#categoriesCarousel");
  if (!container) return;

  // Get subcategories with counts
  const subcats = new Map();
  for (const a of all) {
    const s = a.subcategory || "Other";
    subcats.set(s, (subcats.get(s) || 0) + 1);
  }

  // Custom category order
  const categoryOrder = [
    "Learning Tools & Tutors",
    "Understanding Concepts",
    "Visualizations",
    "Cheatsheets & Notes",
    "Generating Questions",
    "New Content Creation",
    "Other"
  ];
  
  // Sort: first by custom order, then by count for categories not in order
  const sorted = [...subcats.entries()].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a[0]);
    const bIndex = categoryOrder.indexOf(b[0]);
    
    // If both are in the custom order, sort by order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only one is in the order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    // If neither is in the order, sort by count (descending)
    return b[1] - a[1];
  });

  // Category image placeholders/icons (can be extended with real images via categoryImages map)
  const categoryIcons = {
    "Learning Tools & Tutors": "📚",
    "Understanding Concepts": "💡",
    "Cheatsheets & Notes": "📝",
    "Generating Questions": "❓",
    "New Content Creation": "✨",
    "Visualizations": "📊",
    "Other": "📂"
  };

  // Category descriptions/subtitles template
  const getCategoryDescription = (subcat, count) => {
    const descriptions = {
      "Learning Tools & Tutors": `${count} AI-powered learning aids`,
      "Understanding Concepts": `${count} conceptual explanations`,
      "Cheatsheets & Notes": `${count} study resources`,
      "Generating Questions": `${count} practice materials`,
      "New Content Creation": `${count} creative projects`,
      "Visualizations": `${count} interactive visuals`,
      "Other": `${count} submissions`
    };
    return descriptions[subcat] || `${count} items`;
  };

  // Optional: Map of subcategory names to image URLs
  // To add real images later, populate this object:
  // const categoryImages = {
  //   "Learning Tools & Tutors": "./assets/images/category-tutors.jpg",
  //   ...
  // };
  const categoryImages = {
    "Learning Tools & Tutors": "./assets/images/Learning tools.png",
    "Understanding Concepts": "./assets/images/Understanding Concepts.png",
    "Cheatsheets & Notes": "./assets/images/Cheatsheets & Notes.png",
    "Generating Questions": "./assets/images/Generating Questions.png",
    "New Content Creation": "./assets/images/New Ideas.png",
    "Visualizations": "./assets/images/Visualizations.png",
    "Other": "./assets/images/Other.png"
  };

  container.innerHTML = sorted.map(([subcat, count]) => {
    const icon = categoryIcons[subcat] || "📂";
    const categoryParam = encodeURIComponent(subcat);
    const imageSrc = categoryImages[subcat];
    
    const imageHTML = imageSrc
      ? `<img src="${escAttr(imageSrc)}" alt="${esc(subcat)}" />`
      : `<div class="category-card__image-placeholder">${icon}</div>`;
    
    return `
      <a href="./directory.html?subcategory=${categoryParam}" class="category-card">
        <h3 class="category-card__title">${esc(subcat)}</h3>
        <div class="category-card__image">
          ${imageHTML}
        </div>
        <div class="category-card__button">
          Browse this category
        </div>
      </a>
    `;
  }).join("");
  
  // REQUIREMENT 2 & 3: Add scroll tracking for gradient fades and dots indicator
  const wrapper = container.closest('.categories-section__carousel-wrapper');
  if (wrapper) {
    const dotsContainer = document.getElementById('carouselDots');
    
    // Calculate number of visible cards and create dots
    let numDots = 1;
    const cardWidth = 280; // Match CSS flex: 0 0 280px
    const gap = 24; // Match CSS gap: 24px
    const totalCards = container.children.length;
    
    const createDots = () => {
      if (!dotsContainer) return;
      
      const containerWidth = container.clientWidth;
      const cardsPerView = Math.floor((containerWidth - 120) / (cardWidth + gap)); // Account for padding
      numDots = Math.max(1, Math.ceil(totalCards / Math.max(1, cardsPerView)));
      
      // Create dots if carousel is scrollable
      if (container.scrollWidth > container.clientWidth && numDots > 1) {
        dotsContainer.innerHTML = '';
        dotsContainer.style.display = 'flex';
        for (let i = 0; i < numDots; i++) {
          const dot = document.createElement('button');
          dot.className = 'carousel-dots__dot';
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', `Go to page ${i + 1}`);
          dot.setAttribute('aria-selected', 'false');
          if (i === 0) {
            dot.classList.add('active');
            dot.setAttribute('aria-selected', 'true');
          }
          
          // Click handler to scroll to that section
          dot.addEventListener('click', () => {
            const maxScroll = container.scrollWidth - container.clientWidth;
            const scrollPosition = numDots > 1 ? (i / (numDots - 1)) * maxScroll : 0;
            container.scrollTo({
              left: scrollPosition,
              behavior: 'smooth'
            });
          });
          
          dotsContainer.appendChild(dot);
        }
      } else {
        // Hide dots if not scrollable
        dotsContainer.style.display = 'none';
      }
    };
    
    // Create dots initially
    createDots();
    
    const updateCarouselState = () => {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const maxScroll = scrollWidth - clientWidth;
      
      // Update gradient fade visibility
      if (scrollLeft <= 5) {
        wrapper.classList.add('scrolled-start');
        wrapper.classList.remove('scrolled-end');
      } else if (scrollLeft >= maxScroll - 5) {
        wrapper.classList.add('scrolled-end');
        wrapper.classList.remove('scrolled-start');
      } else {
        wrapper.classList.remove('scrolled-start', 'scrolled-end');
      }
      
      // Update active dot
      if (dotsContainer && numDots > 1) {
        const dots = dotsContainer.querySelectorAll('.carousel-dots__dot');
        if (dots.length > 0) {
          const currentDotIndex = Math.min(
            Math.floor((scrollLeft / maxScroll) * (numDots - 1)),
            numDots - 1
          );
          
          dots.forEach((dot, index) => {
            if (index === currentDotIndex) {
              dot.classList.add('active');
              dot.setAttribute('aria-selected', 'true');
            } else {
              dot.classList.remove('active');
              dot.setAttribute('aria-selected', 'false');
            }
          });
        }
      }
    };
    
    // Initial state
    updateCarouselState();
    
    // Update on scroll
    container.addEventListener('scroll', updateCarouselState);
    
    // Update on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        createDots(); // Recreate dots on resize
        updateCarouselState();
      }, 100);
    });
  }
  
  // REQUIREMENT 4: One-time nudge animation (only if carousel is scrollable)
  const checkAndNudge = () => {
    if (container.scrollWidth > container.clientWidth) {
      // Carousel is scrollable, add class to trigger nudge animation
      container.classList.add('scrollable');
      // Remove class after animation completes to prevent replay
      setTimeout(() => {
        container.classList.remove('scrollable');
      }, 2000);
    }
  };
  
  // Check after a brief delay to ensure layout is complete
  setTimeout(checkAndNudge, 100);
}

function wireUI(){
  const searchInput = $("#searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.query = e.target.value;
      updateClearFiltersButton();
      updateURL();
      render();
    });
  }

  // Clear filters button
  const clearBtn = $("#clearFilters");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearAllFilters);
  }

  // Sort selector
  const sortSelect = $("#sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      render();
    });
  }

  // Top category bar
  $$(".topnav__link[data-filter]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.filterCat = a.dataset.filter;
      $$(".topnav__link").forEach(x => x.classList.remove("is-active"));
      a.classList.add("is-active");
      render();
    });
  });

  // Optional dropdown items
  $$(".topnav__item[data-filter]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.filterCat = a.dataset.filter;
      $$(".topnav__link").forEach(x => x.classList.remove("is-active"));
      render();
      a.closest("details")?.removeAttribute("open");
    });
  });

  // Dropdown "Sections" links
  $$(".nav__item").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.filterCat = a.dataset.filter;
      $$(".nav__link").forEach(x => x.classList.remove("is-active"));
      $('.nav__link[data-filter="all"]')?.classList.remove("is-active");
      render();
    });
  });

  // Click handlers for article links
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-open]");
    if (link) {
      e.preventDefault();
      openReader(link.dataset.open);
    }
  });
}

function showError(msg){
  const box = $("#errorBox");
  box.hidden = false;
  box.textContent = msg;
}

function esc(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function escAttr(s){ return esc(s).replaceAll('"',"&quot;"); }

// Remove "Special Participation E:" prefix from titles
function cleanTitle(title) {
  if (!title) return title;
  // Remove various forms of the prefix: "Special Participation E:", "Special Participation E", "Special Participation E2", etc.
  return title.replace(/^Special\s+Participation\s+E\s*:?\s*/i, '').trim();
}

// Detect which page we're on
function isDirectoryPage() {
  return document.body.classList.contains("page-directory") || 
         document.getElementById("feed") !== null ||
         document.getElementById("subcatFilters") !== null ||
         document.getElementById("categoryFilters") !== null;
}

async function main(){
  try {
    const res = await fetch("./data/articles.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ./data/articles.json (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("articles.json must be an array of article objects");

    // Assign tags to articles that don't have them
    state.all = data.map(article => {
      if (!article.tags || article.tags.length === 0) {
        article.tags = assignTagsToArticle(article);
      }
      return article;
    });
    
    // Compute similar posts asynchronously (cached, computed once)
    if (window.computeSimilarities && state.all.length > 0) {
      console.log('[Main] Computing similar posts...');
      // Compute in next tick to avoid blocking UI
      setTimeout(() => {
        state.similarPosts = window.computeSimilarities(state.all);
        console.log('[Main] Similar posts computed');
        // Re-render to show similar articles
        if (isDirectoryPage()) {
          render();
        }
      }, 100);
    }
    
    // Build Tag Map on Overview page
    if (!isDirectoryPage() && window.buildTagMap) {
      buildTagMap(state.all);
    }
    
    // Only build directory UI on Directory page
    if (isDirectoryPage()) {
      // Check for URL parameters to set initial filters BEFORE building UI
      const urlParams = new URLSearchParams(window.location.search);
      const subcategoryParam = urlParams.get('subcategory');
      if (subcategoryParam) {
        state.filterSubcat = decodeURIComponent(subcategoryParam);
      }
      const tagsParam = urlParams.get('tags');
      if (tagsParam) {
        state.selectedTags = new Set(tagsParam.split(',').map(t => decodeURIComponent(t.trim())));
      }
      // Handle single tag parameter (from Tag Map navigation)
      const tagParam = urlParams.get('tag');
      if (tagParam) {
        state.selectedTags = new Set([decodeURIComponent(tagParam)]);
      }
      const queryParam = urlParams.get('q');
      if (queryParam) {
        state.query = decodeURIComponent(queryParam);
        const searchInput = $("#searchInput");
        if (searchInput) searchInput.value = state.query;
      }
      buildCatalogCategoryFilters(state.all);
      buildCatalogTagFilters(state.all);
    } else {
      // Build featured carousel and categories carousel on Overview page
      buildFeaturedCarousel(state.all);
      buildCategoriesCarousel(state.all);
    }
    
    wireUI();
    render();
  } catch (err) {
    console.error(err);
    showError(
      `Could not load data. Open DevTools Console (F12). ` +
      `Most common causes: not running a local server, or wrong JSON path. ` +
      `Error: ${err.message}`
    );
    const heroTitle = $("#heroTitle");
    if (heroTitle) {
      heroTitle.textContent = "Data not loaded";
    }
    const heroDek = $("#heroDek");
    if (heroDek) {
      heroDek.textContent = "Fix the error above, then refresh.";
    }
  }
}

main();
