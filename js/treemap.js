// Treemap Layout using d3-hierarchy
// Creates a packed rectangular layout where tile area scales with tag frequency

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getTagIcon(tag) {
  // Deterministic icon selection based on tag hash
  const icons = ['🔬', '⚙️', '🧠', '📊', '💡', '🔧', '📚', '🎯', '🚀', '🔍', '💻', '📈', '🎨', '🔮', '⚡', '🌟'];
  const hash = simpleHash(tag);
  return icons[hash % icons.length];
}

function esc(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escAttr(s) {
  return esc(s).replaceAll('"', "&quot;");
}

function buildTagMap(articles) {
  const container = document.getElementById('tagMap');
  if (!container) return;
  
  // Count tag frequencies
  const tagCounts = new Map();
  for (const article of articles) {
    for (const tag of (article.tags || [])) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  
  if (tagCounts.size === 0) {
    container.innerHTML = '<p class="tag-map-empty">No tags available.</p>';
    return;
  }
  
  // Convert to array with values (using square root scale for better size differentiation)
  // Square root preserves more of the size differences than log, making big tags noticeably bigger
  const tagItems = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      value: Math.sqrt(count) // Square root scale: preserves more size differences than log
    }))
    .sort((a, b) => b.count - a.count);
  
  // Get container dimensions
  const updateTreemap = () => {
    const rect = container.getBoundingClientRect();
    const width = rect.width || 1400;
    const height = 900; // Increased height to make size differences more apparent
    
    // Check if d3 is available
    if (typeof d3 === 'undefined' || !d3.hierarchy || !d3.treemap) {
      // Fallback: simple grid layout if d3 not available
      renderSimpleLayout(container, tagItems, width, height);
      return;
    }
    
    // Create hierarchy for d3 treemap
    const root = d3.hierarchy({ children: tagItems })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    
    // Compute treemap layout
    const treemap = d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true);
    
    treemap(root);
    
    // Extract rectangles with minimum size enforcement
    const minWidth = 56;
    const minHeight = 36;
    const rectangles = [];
    
    root.each(node => {
      if (node.children) return; // Skip internal nodes
      
      const data = node.data;
      let x0 = node.x0;
      let y0 = node.y0;
      let x1 = node.x1;
      let y1 = node.y1;
      
      // Enforce minimum size
      const rectWidth = x1 - x0;
      const rectHeight = y1 - y0;
      
      if (rectWidth < minWidth) {
        x1 = x0 + minWidth;
      }
      if (rectHeight < minHeight) {
        y1 = y0 + minHeight;
      }
      
      rectangles.push({
        tag: data.tag,
        count: data.count,
        x: x0,
        y: y0,
        width: x1 - x0,
        height: y1 - y0
      });
    });
    
    // Calculate color tier based on count
    const maxCount = Math.max(...rectangles.map(r => r.count));
    const getColorTier = (count) => {
      const ratio = count / maxCount;
      if (ratio >= 0.8) return 'tier-5'; // Highest
      if (ratio >= 0.6) return 'tier-4';
      if (ratio >= 0.4) return 'tier-3';
      if (ratio >= 0.2) return 'tier-2';
      return 'tier-1'; // Lowest
    };
    
    // Render rectangles with staggered animation
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.innerHTML = rectangles.map((rect, index) => {
      const escapedTag = esc(rect.tag);
      const escapedTagAttr = escAttr(rect.tag);
      const colorTier = getColorTier(rect.count);
      const animationDelay = index * 15; // Stagger by 15ms per tile
      
      // For very small tiles, hide count
      const showCount = rect.width >= 80 && rect.height >= 50;
      
      return `
        <div 
          class="tag-map-tile ${colorTier}" 
          style="position: absolute; left: ${rect.x}px; top: ${rect.y}px; width: ${rect.width}px; height: ${rect.height}px; animation-delay: ${animationDelay}ms;"
          data-tag="${escapedTagAttr}"
          data-count="${rect.count}"
          data-tag-name="${escapedTagAttr}"
        >
          <span class="tag-map-label">${escapedTag}</span>
          ${showCount ? `<span class="tag-map-count">${rect.count}</span>` : ''}
        </div>
      `;
    }).join('');
    
    // Add tooltip container
    if (!document.getElementById('tag-map-tooltip')) {
      const tooltip = document.createElement('div');
      tooltip.id = 'tag-map-tooltip';
      tooltip.className = 'tag-map-tooltip';
      document.body.appendChild(tooltip);
    }
    
    const tooltip = document.getElementById('tag-map-tooltip');
    
    // Add hover and click handlers
    container.querySelectorAll('.tag-map-tile').forEach((tile, index) => {
      // Hover spotlight effect
      tile.addEventListener('mouseenter', (e) => {
        // Dim all other tiles
        container.querySelectorAll('.tag-map-tile').forEach(t => {
          if (t !== tile) {
            t.classList.add('dimmed');
          }
        });
        // Brighten hovered tile
        tile.classList.add('hovered');
        
        // Show tooltip
        const tagName = tile.dataset.tagName;
        const count = tile.dataset.count;
        showTooltip(tooltip, e, tagName, count);
      });
      
      tile.addEventListener('mouseleave', () => {
        // Restore all tiles
        container.querySelectorAll('.tag-map-tile').forEach(t => {
          t.classList.remove('dimmed', 'hovered');
        });
        hideTooltip(tooltip);
      });
      
      tile.addEventListener('mousemove', (e) => {
        updateTooltipPosition(tooltip, e);
      });
      
      // Click feedback and navigation
      tile.addEventListener('mousedown', () => {
        tile.classList.add('pressed');
      });
      
      tile.addEventListener('mouseup', () => {
        tile.classList.remove('pressed');
      });
      
      tile.addEventListener('click', (e) => {
        e.preventDefault();
        const tag = tile.dataset.tag;
        // Add click animation
        tile.classList.add('clicked');
        setTimeout(() => {
          window.location.href = `directory.html?tag=${encodeURIComponent(tag)}`;
        }, 150);
      });
    });
  };
  
  // Simple fallback layout (grid-based)
  function renderSimpleLayout(container, items, width, height) {
    const minWidth = 56;
    const minHeight = 36;
    const padding = 2;
    
    // Calculate total value for normalization
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    
    // Simple row-based packing
    const rectangles = [];
    let currentY = padding;
    let currentX = padding;
    let currentRowHeight = 0;
    let rowItems = [];
    let rowValue = 0;
    
    for (const item of items) {
      const itemArea = (item.value / totalValue) * (width * height);
      const itemHeight = Math.max(minHeight, Math.sqrt(itemArea * 2)); // Aim for 2:1 aspect
      const itemWidth = itemArea / itemHeight;
      
      if (currentX + itemWidth > width - padding) {
        // Start new row
        if (rowItems.length > 0) {
          // Distribute row items
          const rowWidth = width - (padding * 2);
          const rowTotalValue = rowValue;
          let xOffset = padding;
          
          for (const rowItem of rowItems) {
            const rowItemArea = (rowItem.value / rowTotalValue) * (rowWidth * currentRowHeight);
            const finalWidth = Math.max(minWidth, rowItemArea / currentRowHeight);
            
            rectangles.push({
              tag: rowItem.tag,
              count: rowItem.count,
              x: xOffset,
              y: currentY,
              width: finalWidth,
              height: currentRowHeight
            });
            
            xOffset += finalWidth + padding;
          }
          
          currentY += currentRowHeight + padding;
        }
        
        // Reset for new row
        currentX = padding;
        currentRowHeight = itemHeight;
        rowItems = [item];
        rowValue = item.value;
      } else {
        rowItems.push(item);
        rowValue += item.value;
        currentRowHeight = Math.max(currentRowHeight, itemHeight);
      }
    }
    
    // Handle last row
    if (rowItems.length > 0) {
      const rowWidth = width - (padding * 2);
      const rowTotalValue = rowValue;
      let xOffset = padding;
      
      for (const rowItem of rowItems) {
        const rowItemArea = (rowItem.value / rowTotalValue) * (rowWidth * currentRowHeight);
        const finalWidth = Math.max(minWidth, rowItemArea / currentRowHeight);
        
        rectangles.push({
          tag: rowItem.tag,
          count: rowItem.count,
          x: xOffset,
          y: currentY,
          width: finalWidth,
          height: currentRowHeight
        });
        
        xOffset += finalWidth + padding;
      }
    }
    
    // Render
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.innerHTML = rectangles.map(rect => {
      const escapedTag = esc(rect.tag);
      const escapedTagAttr = escAttr(rect.tag);
      const showCount = rect.width >= 80 && rect.height >= 50;
      
      return `
        <div 
          class="tag-map-tile" 
          style="position: absolute; left: ${rect.x}px; top: ${rect.y}px; width: ${rect.width}px; height: ${rect.height}px;"
          data-tag="${escapedTagAttr}"
          title="${escapedTag} (${rect.count} posts)"
        >
          <span class="tag-map-label">${escapedTag}</span>
          ${showCount ? `<span class="tag-map-count">${rect.count}</span>` : ''}
        </div>
      `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.tag-map-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const tag = tile.dataset.tag;
        window.location.href = `directory.html?tag=${encodeURIComponent(tag)}`;
      });
    });
  }
  
  // Initial render
  updateTreemap();
  
  // Update on resize
  let resizeTimeout;
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateTreemap, 100);
  });
  resizeObserver.observe(container);
}

// Tooltip functions
function showTooltip(tooltip, event, tagName, count) {
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <div class="tooltip-name">${esc(tagName)}</div>
      <div class="tooltip-count">${count} post${count !== 1 ? 's' : ''}</div>
      <div class="tooltip-hint">Click to view posts tagged "${esc(tagName)}"</div>
    </div>
  `;
  tooltip.style.display = 'block';
  updateTooltipPosition(tooltip, event);
}

function updateTooltipPosition(tooltip, event) {
  const rect = tooltip.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const offset = 12;
  
  // Position tooltip above and to the right of cursor
  let left = x + offset;
  let top = y - rect.height - offset;
  
  // Keep tooltip within viewport
  if (left + rect.width > window.innerWidth) {
    left = x - rect.width - offset;
  }
  if (top < 0) {
    top = y + offset;
  }
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip(tooltip) {
  tooltip.style.display = 'none';
}

// Export for use in main.js
if (typeof window !== 'undefined') {
  window.buildTagMap = buildTagMap;
}
