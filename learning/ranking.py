"""Ranking and filtering of found content.

Score = weighted mix of relevance to the skill, source quality, recency,
length and format, plus a boost or penalty from "Was this useful?" votes.
Duplicates and off-topic items are removed.
"""
import re
from datetime import date

WEIGHTS = {"relevance": 0.4, "context": 0.15, "quality": 0.15, "recency": 0.1,
           "length": 0.1, "format": 0.1}

# How much we trust each source for leadership learning (0-1).
SOURCE_QUALITY = {"Open Library": 0.8, "Crossref": 0.7, "Wikipedia": 0.6, "YouTube": 0.6}

# Mixing formats gives a path with something to read, watch and look up.
FORMAT_FIT = {"book": 0.8, "article": 0.8, "video": 0.9, "primer": 0.6}

MIN_RELEVANCE = 0.5
MAX_PER_SOURCE = 2
STOPWORDS = {"and", "the", "of", "a", "an", "in", "for", "to", "on", "with", "under"}

# Word stems that show an item is about work and leading people.
WORKPLACE = ("leader", "manag", "execut", "business", "organi", "corporat", "ceo",
             "workplace", "team", "board", "strateg", "employ")
# Word stems that show an item is about another field, so we drop it.
OFF_TOPIC = ("nurs", "patient", "clinic", "adolescen", "child", "disorder", "student",
             "pupil", "school", "teacher", "classroom", "medical", "surgical")


def _words(text):
    return {w for w in re.findall(r"[a-z]+", (text or "").lower())
            if w not in STOPWORDS and len(w) > 1}


def relevance(item, skill):
    """Share of the skill-name words found in the item's title and snippet."""
    wanted = _words(skill["name"])
    if not wanted:
        return 0.0
    # A primer must be about the skill itself, so only its title counts.
    text = item["title"] if item["format"] == "primer" else item["title"] + " " + item.get("snippet", "")
    found = _words(text)
    # Light stemming so "negotiating" matches "negotiation".
    hits = sum(1 for w in wanted if any(f.startswith(w[:6]) for f in found))
    return hits / len(wanted)


def _has_stem(item, stems):
    words = _words(item["title"] + " " + item.get("snippet", ""))
    return any(w.startswith(s) for w in words for s in stems)


def context(item):
    return 1.0 if _has_stem(item, WORKPLACE) else 0.0


def off_topic(item):
    return _has_stem(item, OFF_TOPIC)


def recency(item, today=None):
    if not item.get("year"):
        return 0.5
    age = (today or date.today()).year - item["year"]
    return max(0.0, 1.0 - age / 30.0)


def length_fit(item):
    """Prefer things a busy leader can finish: under 1 hour best, books lowest."""
    minutes = item.get("length_minutes")
    if minutes is None:
        return 0.5
    if minutes <= 60:
        return 1.0
    if minutes <= 300:
        return 0.7
    return 0.4


def feedback_adjustment(votes):
    """votes = {"useful": n, "not_useful": n}. Each vote moves the score a little."""
    if not votes:
        return 0.0
    return 0.05 * votes.get("useful", 0) - 0.1 * votes.get("not_useful", 0)


def score(item, skill, votes=None, today=None):
    parts = {
        "relevance": relevance(item, skill),
        "context": context(item),
        "quality": SOURCE_QUALITY.get(item["source"], 0.5),
        "recency": recency(item, today),
        "length": length_fit(item),
        "format": FORMAT_FIT.get(item["format"], 0.5),
    }
    total = sum(WEIGHTS[k] * v for k, v in parts.items()) + feedback_adjustment(votes)
    return round(total, 3), parts


def _dedupe_key(item):
    return re.sub(r"[^a-z0-9]", "", item["title"].lower())[:60]


def rank(items, skill, feedback=None, today=None, limit=5):
    """Filter, dedupe and order items for one skill. feedback maps item_id -> votes."""
    feedback = feedback or {}
    seen_urls, seen_titles, ranked = set(), set(), []
    for item in items:
        key = _dedupe_key(item)
        if item["url"] in seen_urls or key in seen_titles:
            continue
        seen_urls.add(item["url"])
        seen_titles.add(key)
        total, parts = score(item, skill, feedback.get(item["item_id"]), today)
        if parts["relevance"] < MIN_RELEVANCE or off_topic(item):
            continue
        ranked.append(dict(item, score=total))
    ranked.sort(key=lambda i: -i["score"])
    # Keep a mix: at most MAX_PER_SOURCE items from any one source.
    per_source, mixed = {}, []
    for item in ranked:
        if per_source.get(item["source"], 0) < MAX_PER_SOURCE:
            per_source[item["source"]] = per_source.get(item["source"], 0) + 1
            mixed.append(item)
    return mixed[:limit]
