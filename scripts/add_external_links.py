#!/usr/bin/env python3
"""
Extract external links from articles and add them to the articles.json file.
Only adds external_links field if the article has external links.
"""

import json
import re
from urllib.parse import urlparse
from pathlib import Path

def extract_external_links(html, text):
    """
    Extract external URLs from HTML or text content.
    Returns a sorted list of unique external URLs.
    """
    links = set()
    
    # Extract from HTML (if present)
    if html:
        # Extract from anchor tags
        anchor_pattern = r'<a[^>]+href=["\'](https?://[^"\']+)["\']'
        anchor_matches = re.findall(anchor_pattern, html, re.IGNORECASE)
        for url in anchor_matches:
            # Clean up URL (remove trailing punctuation)
            clean_url = url.strip().rstrip('.,;:!?')
            if clean_url:
                links.add(clean_url)
        
        # Extract plain URLs from text content (including those not in anchor tags)
        # Remove HTML tags first to get plain text
        text_content = re.sub(r'<[^>]+>', '', html)
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?]'
        url_matches = re.findall(url_pattern, text_content, re.IGNORECASE)
        for url in url_matches:
            clean_url = url.strip().rstrip('.,;:!?')
            if clean_url:
                links.add(clean_url)
    
    # Extract from plain text (if provided separately)
    if text:
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?]'
        url_matches = re.findall(url_pattern, text, re.IGNORECASE)
        for url in url_matches:
            clean_url = url.strip().rstrip('.,;:!?')
            if clean_url:
                links.add(clean_url)
    
    # Filter out internal/edstem URLs (keep only truly external)
    external_links = []
    for url in sorted(links):
        try:
            parsed = urlparse(url)
            hostname = parsed.netloc.lower()
            # Exclude edstem.org and static.us.edusercontent.com (these are internal)
            if 'edstem.org' not in hostname and 'static.us.edusercontent.com' not in hostname:
                external_links.append(url)
        except Exception:
            # If URL parsing fails, include it anyway (better safe than sorry)
            external_links.append(url)
    
    return external_links

def main():
    # Get the project root directory (parent of scripts/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    articles_file = project_root / 'data' / 'articles.json'
    
    print(f"Reading articles from {articles_file}...")
    
    # Read articles
    with open(articles_file, 'r', encoding='utf-8') as f:
        articles = json.load(f)
    
    print(f"Processing {len(articles)} articles...")
    
    # Process each article
    articles_with_links = 0
    total_links = 0
    
    for article in articles:
        # Extract external links from body_html and summary
        body_html = article.get('body_html', '')
        summary = article.get('summary', '')
        
        external_links = extract_external_links(body_html, summary)
        
        if external_links:
            article['external_links'] = external_links
            articles_with_links += 1
            total_links += len(external_links)
            print(f"  {article.get('id', 'unknown')}: Found {len(external_links)} external link(s)")
    
    # Write updated articles back
    print(f"\nWriting updated articles to {articles_file}...")
    with open(articles_file, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    print(f"\nDone!")
    print(f"  - Total articles: {len(articles)}")
    print(f"  - Articles with external links: {articles_with_links}")
    print(f"  - Total external links found: {total_links}")

if __name__ == '__main__':
    main()

