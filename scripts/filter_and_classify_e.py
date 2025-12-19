import json
import re

INPUT_FILE = "../data/articles.json"
OUTPUT_FILE = "../data/articles.json"

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    all_articles = json.load(f)

print(f"Total articles: {len(all_articles)}")

e_articles = []
for article in all_articles:
    title = article.get('title', '').lower()
    body = article.get('body_html', '').lower()

    if 'special participation e' in title or 'participation e' in title:
        e_articles.append(article)

print(f"Special Participation E articles: {len(e_articles)}")

def classify_subcategory(article):
    title = article.get('title', '').lower()
    body = article.get('body_html', '').lower()
    content = title + ' ' + body

    categories = {
        'Generating Questions': ['quiz', 'question', 'practice problem', 'exam prep', 'test', 'worksheet', 'drill'],
        'Learning Tools & Tutors': ['tutor', 'chatgpt', 'study mode', 'learning', 'teach', 'explain', 'socratic', 'dialogue', 'notebooklm', 'gemini'],
        'Visualizations': ['visualiz', 'interactive', 'animation', 'graph', 'plot', 'diagram', 'explorer'],
        'Cheatsheets & Notes': ['cheatsheet', 'notes', 'summary', 'latex', 'pdf', 'transcript', 'lecture'],
        'Understanding Concepts': ['understand', 'intuition', 'concept', 'explain', 'clarify', 'compare', 'connection'],
        'New Content Creation': ['generated', 'create', 'build', 'tool', 'website', 'app', 'artifact']
    }

    scores = {}
    for cat, keywords in categories.items():
        score = sum(1 for kw in keywords if kw in content)
        if score > 0:
            scores[cat] = score

    if scores:
        return max(scores, key=scores.get)
    return 'Other'

for article in e_articles:
    if not article.get('subcategory') or article['subcategory'] == 'General':
        article['subcategory'] = classify_subcategory(article)

subcats = {}
for article in e_articles:
    subcat = article['subcategory']
    subcats[subcat] = subcats.get(subcat, 0) + 1

print(f"\nSubcategory distribution:")
for subcat, count in sorted(subcats.items(), key=lambda x: -x[1]):
    print(f"  {subcat}: {count}")

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(e_articles, f, indent=2, ensure_ascii=False)

print(f"\nSaved {len(e_articles)} Special Participation E articles to {OUTPUT_FILE}")
