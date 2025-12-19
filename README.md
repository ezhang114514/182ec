# EECS182 Special Participation E Website

A curated, searchable directory of Special Participation E submissions from COMPSCI C182, featuring a modern catalog-style interface with intelligent article recommendations.

## 🎯 Overview

This website displays **242 Special Participation E** submissions from EECS182, automatically categorized, tagged, and searchable. The site features a two-column catalog layout with sidebar filters, article recommendations, and full LaTeX rendering support.

## ✨ Key Features

### 📚 Catalog-Style Directory
- **Two-column layout**: Sticky sidebar filters + expanded results list
- **Sidebar filters**:
  - Categories (radio buttons) with counts
  - Tags (multi-select checkboxes) with counts
  - Search input
  - Clear filters button
- **Expanded article cards**: Show title, full summary, metadata, tags, and attachment count
- **Responsive design**: Filters collapse on mobile

### 🔍 Advanced Filtering
- **Category filtering**: Filter by subcategory (Learning Tools & Tutors, Understanding Concepts, etc.)
- **Multi-tag filtering**: Select multiple tags (AND logic)
- **Search**: Real-time search across title, content, tags, and metadata
- **URL state management**: Shareable filter links (`?subcategory=...&tags=...&q=...`)
- **Sort options**: Newest First, Oldest First, By Student, By Title, Most Attachments

### 📖 Article Detail View
- **Two-column layout**: Sticky metadata sidebar + accordion content sections
- **Metadata panel**:
  - Title, author, date, category
  - Tags display
  - Quick actions (Back, external links, Copy link)
- **Accordion sections**:
  - Overview (summary)
  - Full Content (main body)
  - Attachments (download links)
- **LaTeX rendering**: Full MathJax support for mathematical notation

### 🤖 Similar Articles
- **Intelligent recommendations**: TF-IDF + tag overlap + category matching
- **Top 3 suggestions**: Shown on each article card
- **Local computation**: No external APIs, runs entirely in browser
- **Fast performance**: Computed once and cached

### 🏷️ Automatic Tagging
- **34 predefined tags**: Optimization, SGD, Transformers, CNNs, etc.
- **Content-based assignment**: Tags automatically assigned based on article content
- **Keyword matching**: Uses word boundaries and case-insensitive matching

### 📝 Article Summaries
- **Complete summaries**: Full overview text (not truncated)
- **Smart fallback**: Uses summary → dek → truncated body
- **Visible in**: Catalog preview and article detail overview section

## 🚀 Getting Started

### Prerequisites
- Python 3.7+ (for local server)
- Modern web browser

### Quick Start

**Option 1: One-Click Launch (Windows)**
```bash
# Double-click one of these:
start.bat          # Full setup with options
quick-start.bat    # Quick launch
update-data.bat    # Update data only
```

**Option 2: Manual Launch**
```bash
# Navigate to project directory
cd my-static-website

# Start local server
python -m http.server 8000

# Open in browser
# http://localhost:8000
# http://localhost:8000/directory.html
```

**Option 3: Any Static Server**
- Deploy to any static hosting (GitHub Pages, Netlify, Vercel, etc.)
- No build step required - just upload files

## 📁 Project Structure

```
my-static-website/
├── index.html              # Overview page with category carousel
├── directory.html          # Catalog-style directory page
├── dashboard.html          # Statistics dashboard
├── css/
│   └── styles.css         # All styling
├── js/
│   ├── main.js            # Main application logic
│   └── similarPosts.js    # Similarity computation module
├── data/
│   └── articles.json      # 242 articles with metadata
├── assets/
│   └── images/            # Category images and hero graphics
└── scripts/
    ├── scrape_ed.py       # Ed Stem scraper
    └── filter_and_classify_e.py  # Classification script
```

## 🎨 Design Features

- **Catalog layout**: Two-column design with sticky sidebar
- **Light theme**: Clean, readable interface
- **Typography**: Serif fonts for headings, sans-serif for body
- **Hover effects**: Interactive filter items and article cards
- **Accessibility**: Keyboard navigation, ARIA labels, semantic HTML

## 🔧 Technical Details

### Similar Articles Algorithm
- **TF-IDF vectors**: Unigrams + bigrams with stopword removal
- **Cosine similarity**: Content-based matching
- **Tag overlap**: Jaccard similarity for tag sets
- **Category bonus**: Extra score for matching categories
- **Final score**: `0.75 * cosine + 0.20 * jaccard + 0.05 * categoryMatch`

### Tag Assignment
- **34 predefined tags** with keyword mappings
- **Automatic assignment**: Based on title, summary, and body content
- **Word boundary matching**: Prevents false positives
- **Case-insensitive**: Handles variations

### LaTeX Rendering
- **MathJax 3**: Full LaTeX support
- **Inline math**: `$...$` or `\(...\)`
- **Display math**: `$$...$$` or `\[...\]`
- **Auto-rendering**: Updates when content loads

## 📊 Data Statistics

- **Total Articles**: 242 Special Participation E posts
- **Categories**:
  - Learning Tools & Tutors: 82
  - Understanding Concepts: 50
  - Cheatsheets & Notes: 44
  - Generating Questions: 29
  - New Content Creation: 27
  - Visualizations: 9
  - Other: 1
- **Attachments**: 504 posts with files
- **Tags**: 34 predefined tags automatically assigned

## 📄 Data Format

Each article in `data/articles.json` contains:

```json
{
  "id": "ed-7476069",
  "category": "Curiosity",
  "subcategory": "Cheatsheets & Notes",
  "title": "Special Participation E: ...",
  "dek": "Short preview...",
  "summary": "Complete summary text...",
  "student": "Student Name",
  "date": "2025-12-17",
  "tags": ["optimization", "SGD", "CNNs"],
  "links": {
    "ed": "https://edstem.org/...",
    "chatgpt": "...",
    "github": "..."
  },
  "body_html": "Full HTML content...",
  "attachments": [
    {"name": "file.pdf", "url": "https://..."}
  ],
  "highlight": false
}
```

## 🎯 Features Breakdown

### Directory Page (`directory.html`)
- Catalog-style two-column layout
- Sidebar with categories, tags, and search
- Expanded article cards with full summaries
- Similar articles recommendations
- URL state management for shareable links

### Overview Page (`index.html`)
- Hero section with course information
- Category carousel with images
- Statistics dashboard
- Navigation to directory

### Article Detail View
- Modal dialog with two-column layout
- Sticky metadata sidebar
- Accordion sections for content
- LaTeX rendering support
- Quick actions (back, links, copy)

## 🔍 Search & Filter Capabilities

- **Text search**: Searches title, summary, body, tags, student name
- **Category filter**: Single-select radio buttons
- **Tag filter**: Multi-select checkboxes (AND logic)
- **Combined filtering**: All filters work together
- **Real-time updates**: Results update as you type/select
- **Result count**: Shows number of matching articles

## 🌐 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox
- Local Storage (for caching)

## 📦 Dependencies

- **MathJax 3**: LaTeX rendering (loaded from CDN)
- **Vanilla JavaScript**: No frameworks required
- **Python 3.7+**: Only for local development server

## 🚀 Deployment

This is a **static website** - ready to deploy anywhere:

1. **GitHub Pages**: Push to repository, enable Pages
2. **Netlify**: Drag and drop folder
3. **Vercel**: Connect repository
4. **Any static host**: Upload all files

No build step required - just upload the files!

## 🔄 Updating Data

To update articles from Ed Stem:

```bash
# Run the update script
python scripts/scrape_ed.py

# Or use the batch file (Windows)
update-data.bat
```

This will:
1. Fetch latest posts from Ed Stem API
2. Filter for Special Participation E
3. Classify into categories
4. Generate `data/articles.json`

## 🎓 Course Information

**COMPSCI C182** - Deep Learning  
Special Participation E submissions showcase AI-powered learning tools, visualizations, and content creation.

## 📝 Notes

- All articles include complete summaries for better preview
- Similar articles computed once on page load (cached)
- LaTeX rendering happens automatically when content loads
- Filter state persists in URL for sharing
- Mobile-responsive design

## 🤝 Contributing

This is a course project. For updates or improvements:
1. Update `data/articles.json` with new articles
2. Modify `js/main.js` for functionality changes
3. Update `css/styles.css` for styling

## 📄 License

Course project for EECS182 Fall 2025.

---

**Built with AI assistance** | *Red Team - Special Participation E*
