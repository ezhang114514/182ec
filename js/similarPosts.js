// Similar Posts Computation Module
// Uses TF-IDF + tag overlap + category matching

// Stopwords for filtering
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if', 'up',
  'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'after',
  'words', 'long', 'than', 'first', 'been', 'call', 'who', 'oil', 'its',
  'now', 'find', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'
]);

function tokenize(text) {
  if (!text) return [];
  // Convert to lowercase, remove special chars except spaces, split
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function getNGrams(tokens, n = 1) {
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function buildSearchText(article) {
  // Title repeated 3x + summary/dek + truncated body
  const title = article.title || '';
  const summary = article.summary || article.dek || '';
  const body = stripHtml(article.body_html || '');
  const bodyTruncated = body.substring(0, 500);
  
  return `${title} ${title} ${title} ${summary} ${bodyTruncated}`.toLowerCase();
}

function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function computeTFIDF(articles) {
  // Build vocabulary from all articles
  const vocab = new Map();
  const docFreq = new Map();
  const docVectors = [];
  
  // First pass: build vocabulary and document frequencies
  articles.forEach((article, idx) => {
    const searchText = buildSearchText(article);
    const tokens = tokenize(searchText);
    const unigrams = getNGrams(tokens, 1);
    const bigrams = getNGrams(tokens, 2);
    const allTerms = [...unigrams, ...bigrams];
    
    const termFreq = new Map();
    allTerms.forEach(term => {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
      vocab.set(term, true);
    });
    
    docVectors.push(termFreq);
    
    // Update document frequency
    new Set(allTerms).forEach(term => {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    });
  });
  
  const vocabSize = vocab.size;
  const numDocs = articles.length;
  
  // Second pass: compute TF-IDF vectors
  const tfidfVectors = [];
  
  docVectors.forEach((termFreq, idx) => {
    const vector = new Map();
    const maxFreq = Math.max(...Array.from(termFreq.values()));
    
    termFreq.forEach((freq, term) => {
      const tf = freq / maxFreq;
      const df = docFreq.get(term) || 1;
      const idf = Math.log(numDocs / df);
      vector.set(term, tf * idf);
    });
    
    tfidfVectors.push(vector);
  });
  
  return tfidfVectors;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  const allTerms = new Set([...vecA.keys(), ...vecB.keys()]);
  
  allTerms.forEach(term => {
    const a = vecA.get(term) || 0;
    const b = vecB.get(term) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function computeSimilarities(articles) {
  console.log('[SimilarPosts] Computing similarities for', articles.length, 'articles...');
  const startTime = performance.now();
  
  // Compute TF-IDF vectors
  const tfidfVectors = computeTFIDF(articles);
  
  // Build tag sets for each article
  const tagSets = articles.map(a => new Set(a.tags || []));
  
  // Compute similarity matrix
  const similarities = new Map();
  
  for (let i = 0; i < articles.length; i++) {
    const scores = [];
    
    for (let j = 0; j < articles.length; j++) {
      if (i === j) continue; // Skip self
      
      // Cosine similarity from TF-IDF
      const cosine = cosineSimilarity(tfidfVectors[i], tfidfVectors[j]);
      
      // Tag overlap (Jaccard)
      const jaccard = jaccardSimilarity(tagSets[i], tagSets[j]);
      
      // Category match bonus
      const categoryMatch = (articles[i].subcategory === articles[j].subcategory) ? 1 : 0;
      
      // Combined score
      const score = 0.75 * cosine + 0.20 * jaccard + 0.05 * categoryMatch;
      
      scores.push({ id: articles[j].id, score, article: articles[j] });
    }
    
    // Sort by score and take top 3
    scores.sort((a, b) => b.score - a.score);
    const top3 = scores.slice(0, 3).map(s => s.article);
    
    similarities.set(articles[i].id, top3);
  }
  
  const endTime = performance.now();
  console.log(`[SimilarPosts] Computed similarities in ${(endTime - startTime).toFixed(2)}ms`);
  
  return similarities;
}

// Cached similarity map
let similarityCache = null;
let articlesCache = null;

function getSimilarPosts(articleId, articles) {
  // Check if cache is valid
  if (!similarityCache || articlesCache !== articles) {
    articlesCache = articles;
    similarityCache = computeSimilarities(articles);
  }
  
  return similarityCache.get(articleId) || [];
}

// Export for use in main.js
if (typeof window !== 'undefined') {
  window.getSimilarPosts = getSimilarPosts;
  window.computeSimilarities = computeSimilarities;
}

