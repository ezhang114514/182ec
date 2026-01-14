#!/usr/bin/env node
/**
 * Extract external links from articles and add them to the articles.json file.
 * Only adds external_links field if the article has external links.
 */

const fs = require('fs');
const path = require('path');

function extractExternalLinks(html, text) {
  const links = new Set();
  
  // Extract from HTML (if present)
  if (html) {
    // Extract from anchor tags
    const anchorPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = anchorPattern.exec(html)) !== null) {
      let url = match[1].trim().replace(/[.,;:!?]+$/, '');
      if (url) links.add(url);
    }
    
    // Extract plain URLs from text content (remove HTML tags first)
    const textContent = html.replace(/<[^>]+>/g, '');
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?]/gi;
    let urlMatch;
    while ((urlMatch = urlPattern.exec(textContent)) !== null) {
      let url = urlMatch[0].trim().replace(/[.,;:!?]+$/, '');
      if (url) links.add(url);
    }
  }
  
  // Extract from plain text (if provided separately)
  if (text) {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?]/gi;
    let urlMatch;
    while ((urlMatch = urlPattern.exec(text)) !== null) {
      let url = urlMatch[0].trim().replace(/[.,;:!?]+$/, '');
      if (url) links.add(url);
    }
  }
  
  // Filter out internal/edstem URLs (keep only truly external)
  const externalLinks = [];
  for (const url of Array.from(links).sort()) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      // Exclude edstem.org and static.us.edusercontent.com (these are internal)
      if (!hostname.includes('edstem.org') && !hostname.includes('static.us.edusercontent.com')) {
        externalLinks.push(url);
      }
    } catch (e) {
      // If URL parsing fails, include it anyway (better safe than sorry)
      externalLinks.push(url);
    }
  }
  
  return externalLinks;
}

function main() {
  // Get the project root directory (parent of scripts/)
  const scriptDir = __dirname;
  const projectRoot = path.join(scriptDir, '..');
  const articlesFile = path.join(projectRoot, 'data', 'articles.json');
  
  console.log(`Reading articles from ${articlesFile}...`);
  
  // Read articles
  const articles = JSON.parse(fs.readFileSync(articlesFile, 'utf-8'));
  
  console.log(`Processing ${articles.length} articles...`);
  
  // Process each article
  let articlesWithLinks = 0;
  let totalLinks = 0;
  
  for (const article of articles) {
    // Extract external links from body_html and summary
    const bodyHtml = article.body_html || '';
    const summary = article.summary || '';
    
    const externalLinks = extractExternalLinks(bodyHtml, summary);
    
    if (externalLinks.length > 0) {
      article.external_links = externalLinks;
      articlesWithLinks++;
      totalLinks += externalLinks.length;
      console.log(`  ${article.id || 'unknown'}: Found ${externalLinks.length} external link(s)`);
    }
  }
  
  // Write updated articles back
  console.log(`\nWriting updated articles to ${articlesFile}...`);
  fs.writeFileSync(articlesFile, JSON.stringify(articles, null, 2), 'utf-8');
  
  console.log(`\nDone!`);
  console.log(`  - Total articles: ${articles.length}`);
  console.log(`  - Articles with external links: ${articlesWithLinks}`);
  console.log(`  - Total external links found: ${totalLinks}`);
}

if (require.main === module) {
  main();
}

module.exports = { extractExternalLinks };

