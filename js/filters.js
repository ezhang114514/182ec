function normalize(s) {
    return String(s ?? "").toLowerCase();
  }
  
  export function getFilteredSortedPosts(s) {
    let out = [...(s.posts || [])];
  
    // filter: homework
    if (s.homework && s.homework !== "All homeworks") {
      out = out.filter(p => p.homework === s.homework);
    }
  
    // filter: model
    if (s.model && s.model !== "All models") {
      out = out.filter(p => p.model === s.model);
    }
  
    // filter: search query (title/body)
    if (s.query && s.query.trim()) {
      const q = normalize(s.query.trim());
      out = out.filter(p =>
        normalize(p.title).includes(q) || normalize(p.body).includes(q)
      );
    }
  
    // sort
    if (s.sort === "Newest first") {
      out.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (s.sort === "Oldest first") {
      out.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (s.sort === "Homework (A→Z)") {
      out.sort((a, b) => String(a.homework).localeCompare(String(b.homework)));
    } else if (s.sort === "Model (A→Z)") {
      out.sort((a, b) => String(a.model).localeCompare(String(b.model)));
    }
  
    return out;
  }
  
  export function uniqueValues(posts, key) {
    const set = new Set();
    for (const p of posts) set.add(p[key]);
    return Array.from(set).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
  }
  