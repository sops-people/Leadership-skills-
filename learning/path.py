"""Learning path: turn a gap report into an ordered list of steps.

Gaps are ordered by priority (biggest first). Each gap gets its top-ranked
items, and only items whose link works are kept.
"""
import json
import os
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from . import ranking, sources

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

# A server that blocks robots (403/429) still works in a person's browser.
BLOCKED_BUT_LIVE = {401, 403, 429}


def load_json(name):
    with open(os.path.join(DATA_DIR, name)) as f:
        return json.load(f)


def link_works(url):
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method,
                                     headers={"User-Agent": sources.USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=8):
                return True
        except urllib.error.HTTPError as exc:
            if exc.code in BLOCKED_BUT_LIVE:
                return True
            if exc.code == 405:  # HEAD not allowed, try GET
                continue
            return False
        except Exception:
            return False
    return False


def _cache_usable(result):
    # Don't keep a result where a source failed; search again next time.
    return not result["errors"]


def _cached_search(skill, refresh=False):
    path = os.path.join(CACHE_DIR, skill["skill_id"] + ".json")
    if not refresh and os.path.exists(path):
        with open(path) as f:
            cached = json.load(f)
        if _cache_usable(cached):
            return cached
    items, errors = sources.search_skill(skill)
    with ThreadPoolExecutor(max_workers=3) as pool:
        alive = list(pool.map(link_works, [i["url"] for i in items]))
    result = {"items": [i for i, ok in zip(items, alive) if ok],
              "dead_links": sum(1 for ok in alive if not ok),
              "errors": errors}
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(result, f, indent=2)
    return result


def build_path(gap_report, taxonomy, feedback=None, refresh=False, per_skill=5):
    skills = {s["skill_id"]: s for s in taxonomy["skills"]}
    gaps = [g for g in gap_report["skills"] if g["gap"] > 0 or g["blind_spot"] > 0]
    gaps.sort(key=lambda g: -g["priority"])

    def one_step(gap):
        skill = skills[gap["skill_id"]]
        found = _cached_search(skill, refresh)
        return {
            "skill_id": skill["skill_id"],
            "skill_name": skill["name"],
            "category": skill["category"],
            "gap": gap["gap"],
            "blind_spot": gap["blind_spot"],
            "priority": gap["priority"],
            "items": ranking.rank(found["items"], skill, feedback, limit=per_skill),
            "search_errors": found["errors"],
        }

    # One skill at a time: the free APIs block us if we search in parallel.
    steps = [one_step(g) for g in gaps]
    for n, step in enumerate(steps, 1):
        step["order"] = n
    return {"user_id": gap_report["user_id"],
            "target_role": gap_report.get("target_role"),
            "steps": steps}
