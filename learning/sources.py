"""Content search: look up external training content for a skill.

Each source returns items in one shape:
    {item_id, title, url, source, format, year, length_minutes, snippet}

Sources with no API key run by default. YouTube runs only when
YOUTUBE_API_KEY is set. Which sources we keep (and their cost and terms)
is an open decision for kickoff.
"""
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

USER_AGENT = "LeadershipSkillsApp/0.1 (learning-path prototype)"
TIMEOUT = 10
RETRIES = 2


def _get_json(url):
    """GET with a short back-off when a free API says we are going too fast."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return json.load(resp)
        except (urllib.error.HTTPError, urllib.error.URLError) as exc:
            # Only retry "slow down" and server errors; a refused connection won't fix itself.
            retryable = getattr(exc, "code", None) in (429, 500, 502, 503)
            if attempt == RETRIES or not retryable:
                raise
            time.sleep(2 * (attempt + 1))


def _item_id(url):
    return hashlib.sha1(url.encode()).hexdigest()[:12]


def _strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def _item(title, url, source, fmt, year=None, length_minutes=None, snippet=""):
    return {
        "item_id": _item_id(url),
        "title": title.strip(),
        "url": url,
        "source": source,
        "format": fmt,
        "year": year,
        "length_minutes": length_minutes,
        "snippet": snippet[:300],
    }


def search_openlibrary(query, limit=8):
    params = urllib.parse.urlencode({
        "q": query, "limit": limit,
        "fields": "key,title,author_name,first_publish_year,number_of_pages_median",
    })
    data = _get_json("https://openlibrary.org/search.json?" + params)
    items = []
    for doc in data.get("docs", []):
        pages = doc.get("number_of_pages_median")
        authors = ", ".join(doc.get("author_name", [])[:2])
        items.append(_item(
            doc["title"], "https://openlibrary.org" + doc["key"], "Open Library", "book",
            year=doc.get("first_publish_year"),
            # About 2 minutes per page.
            length_minutes=pages * 2 if pages else None,
            snippet="by " + authors if authors else "",
        ))
    return items


def search_crossref(query, limit=8):
    params = urllib.parse.urlencode({
        "query.bibliographic": query, "rows": limit,
        "filter": "from-pub-date:2010,type:journal-article",
        "select": "title,URL,issued,abstract,container-title",
    })
    data = _get_json("https://api.crossref.org/works?" + params)
    items = []
    for work in data.get("message", {}).get("items", []):
        if not work.get("title"):
            continue
        year = (work.get("issued", {}).get("date-parts") or [[None]])[0][0]
        journal = (work.get("container-title") or [""])[0]
        items.append(_item(
            work["title"][0], work["URL"], "Crossref", "article", year=year,
            length_minutes=20,
            snippet=_strip_html(work.get("abstract")) or journal,
        ))
    return items


def search_wikipedia(query, limit=3):
    params = urllib.parse.urlencode({
        "action": "query", "list": "search", "srsearch": query,
        "format": "json", "srlimit": limit,
    })
    data = _get_json("https://en.wikipedia.org/w/api.php?" + params)
    items = []
    for hit in data.get("query", {}).get("search", []):
        title = hit["title"]
        url = "https://en.wikipedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))
        items.append(_item(
            title, url, "Wikipedia", "primer",
            # About 200 words per minute.
            length_minutes=max(1, hit.get("wordcount", 0) // 200),
            snippet=_strip_html(hit.get("snippet")),
        ))
    return items


def search_youtube(query, limit=5):
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        return []
    params = urllib.parse.urlencode({
        "part": "snippet", "q": query, "type": "video", "maxResults": limit,
        "videoDuration": "medium", "relevanceLanguage": "en", "key": key,
    })
    data = _get_json("https://www.googleapis.com/youtube/v3/search?" + params)
    items = []
    for hit in data.get("items", []):
        snip = hit["snippet"]
        items.append(_item(
            snip["title"], "https://www.youtube.com/watch?v=" + hit["id"]["videoId"],
            "YouTube", "video", year=int(snip["publishedAt"][:4]),
            length_minutes=12, snippet=snip.get("description", ""),
        ))
    return items


SOURCES = [search_openlibrary, search_crossref, search_wikipedia, search_youtube]


# Skill names that search badly as written.
QUERY_OVERRIDES = {
    "financial-acumen": "financial acumen for managers",
    "stakeholder-board": "board of directors stakeholder management",
    "industry-expertise": "industry analysis strategy executives",
}


def query_for(skill):
    """Turn a taxonomy skill into a search query."""
    if skill["skill_id"] in QUERY_OVERRIDES:
        return QUERY_OVERRIDES[skill["skill_id"]]
    name = skill["name"].replace("&", " ").replace("/", " ")
    return " ".join(name.split()) + " leadership"


def search_skill(skill):
    """Run every source for one skill. A failing source is skipped, not fatal."""
    query = query_for(skill)
    items, errors = [], []
    for source in SOURCES:
        try:
            items.extend(source(query))
        except Exception as exc:  # network errors, bad JSON, rate limits
            errors.append("%s: %s" % (source.__name__, exc))
    return items, errors
