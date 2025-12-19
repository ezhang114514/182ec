"""
Ed Stem Scraper for EECS182
Fetches all threads from Curiosity category with full content and attachments
"""
import os
import sys
import json
import re
from edapi import EdAPI
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

COURSE_ID = 84647
OUTPUT_FILE = "../data/articles.json"
BATCH_SIZE = 50

def extract_attachments(content_xml):
    """Extract file attachments from XML content"""
    attachments = []
    pattern = r'<file url="([^"]+)" filename="([^"]+)"\s*/>'
    matches = re.findall(pattern, content_xml)
    for url, filename in matches:
        attachments.append({"name": filename, "url": url})
    return attachments

def extract_links(content):
    """Extract various links from content"""
    links = {}
    chatgpt_pattern = r'https://chatgpt\.com/share/[a-zA-Z0-9\-]+'
    chatgpt_matches = re.findall(chatgpt_pattern, content)
    if chatgpt_matches:
        links['chatgpt'] = chatgpt_matches[0]
    github_pattern = r'https://github\.com/[a-zA-Z0-9\-_/]+'
    github_matches = re.findall(github_pattern, content)
    if github_matches:
        links['github'] = github_matches[0]
    return links

def fetch_all_threads(ed, course_id):
    all_threads = []
    offset = 0
    while True:
        print(f"[*] Fetching batch: offset={offset}, limit={BATCH_SIZE}...")
        batch = ed.list_threads(course_id=course_id, limit=BATCH_SIZE, offset=offset)
        if not batch:
            break
        all_threads.extend(batch)
        print(f"    Got {len(batch)} threads (total: {len(all_threads)})")
        if len(batch) < BATCH_SIZE:
            break
        offset += BATCH_SIZE
    return all_threads

def parse_ed_post(thread, ed):
    category = thread.get('category', '')
    if category.lower() != 'curiosity':
        return None
    thread_id = thread.get('id')
    try:
        full_thread = ed.get_thread(thread_id)
    except Exception as e:
        print(f"   [!] Could not get full content for {thread_id}: {e}")
        full_thread = thread
    post_id = f"ed-{thread_id}"
    title = full_thread.get('title', 'Untitled')
    content_xml = full_thread.get('content', '')
    content_text = full_thread.get('document', '')
    user = thread.get('user') or full_thread.get('user')
    author = ''
    if isinstance(user, dict):
        author = user.get('name', '')
    elif isinstance(user, str):
        author = user
        
    created_at = full_thread.get('created_at', '')
    subcategory = full_thread.get('subcategory', '') or 'General'
    try:
        date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        date = date_obj.strftime('%Y-%m-%d')
    except:
        date = created_at[:10] if created_at else ''
    attachments = extract_attachments(content_xml)
    extracted_links = extract_links(content_xml + ' ' + content_text)
    links = {"ed": f"https://edstem.org/us/courses/{COURSE_ID}/discussion/{thread_id}"}
    links.update(extracted_links)
    article = {
        "id": post_id,
        "category": category,
        "subcategory": subcategory,
        "title": title,
        "dek": content_text[:200] + "..." if len(content_text) > 200 else content_text,
        "student": author,
        "date": date,
        "tags": [],
        "links": links,
        "body_html": content_text,
        "attachments": attachments,
        "highlight": False
    }
    return article
def main():
    if not os.getenv('ED_API_TOKEN'):
        print("[X] Error: ED_API_TOKEN not found")
        return
    ed = EdAPI()
    ed.login()
    print("[OK] Logged in to Ed Stem\n")
    print(f"[*] Fetching ALL threads from course {COURSE_ID}...")
    all_threads = fetch_all_threads(ed, COURSE_ID)
    print(f"[OK] Found {len(all_threads)} total threads\n")
    print("[*] Processing Curiosity threads...")
    articles = []
    for i, thread in enumerate(all_threads, 1):
        article = parse_ed_post(thread, ed)
        if article:
            articles.append(article)
            att_info = f" ({len(article['attachments'])} files)" if article['attachments'] else ""
            print(f"   [{i}/{len(all_threads)}] {article['title'][:50]}...{att_info}")

    print(f"\n[OK] Processed {len(articles)} Curiosity threads")
    output_path = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    print(f"[OK] Saved to: {output_path}")
    total_attachments = sum(len(a['attachments']) for a in articles)
    threads_with_attachments = sum(1 for a in articles if a['attachments'])
    print(f"\n[*] Statistics:")
    print(f"    Total threads: {len(articles)}")
    print(f"    Total attachments: {total_attachments}")
    print(f"    Threads with attachments: {threads_with_attachments}")

if __name__ == "__main__":
    main()
