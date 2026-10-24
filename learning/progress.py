"""Progress tracking, usefulness votes and the 90-day re-assessment.

State lives in data/progress/<user_id>.json. Every change also appends a
"progress update" (the shared format in docs/formats.md) to
data/progress/updates.jsonl for Darko's and Maria's parts to read.
"""
import json
import os
from datetime import date, timedelta

from .path import DATA_DIR

PROGRESS_DIR = os.path.join(DATA_DIR, "progress")
OUTBOX = os.path.join(DATA_DIR, "outbox.jsonl")

SKILL_STATUSES = ("not_started", "in_progress", "improved")
ITEM_STATUSES = ("not_started", "in_progress", "done")
REASSESS_AFTER_DAYS = 90


def _path(user_id):
    return os.path.join(PROGRESS_DIR, user_id + ".json")


def load(user_id):
    try:
        with open(_path(user_id)) as f:
            return json.load(f)
    except FileNotFoundError:
        return {"user_id": user_id, "skills": {}, "items": {}, "feedback": {},
                "reminders_sent": []}


def _save(state):
    os.makedirs(PROGRESS_DIR, exist_ok=True)
    with open(_path(state["user_id"]), "w") as f:
        json.dump(state, f, indent=2)


def _append(path, record):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps(record) + "\n")


def _emit_update(state, skill_id, today):
    items = state["items"].get(skill_id, {})
    _append(os.path.join(PROGRESS_DIR, "updates.jsonl"), {
        "user_id": state["user_id"],
        "skill_id": skill_id,
        "status": state["skills"].get(skill_id, "not_started"),
        "items_completed": sorted(i for i, s in items.items() if s == "done"),
        "date": today.isoformat(),
    })


def set_skill_status(user_id, skill_id, status, today=None):
    if status not in SKILL_STATUSES:
        raise ValueError("status must be one of %s" % (SKILL_STATUSES,))
    today = today or date.today()
    state = load(user_id)
    state["skills"][skill_id] = status
    _save(state)
    _emit_update(state, skill_id, today)
    return state


def set_item_status(user_id, skill_id, item_id, status, today=None):
    if status not in ITEM_STATUSES:
        raise ValueError("status must be one of %s" % (ITEM_STATUSES,))
    today = today or date.today()
    state = load(user_id)
    state["items"].setdefault(skill_id, {})[item_id] = status
    # Starting any item moves a not-started skill to in progress.
    if status != "not_started" and state["skills"].get(skill_id, "not_started") == "not_started":
        state["skills"][skill_id] = "in_progress"
    _save(state)
    _emit_update(state, skill_id, today)
    return state


def vote(user_id, item_id, useful):
    state = load(user_id)
    votes = state["feedback"].setdefault(item_id, {"useful": 0, "not_useful": 0})
    votes["useful" if useful else "not_useful"] += 1
    _save(state)
    return state


def reassessment(user_id, last_assessed, today=None):
    """Return when the next self + 360 round is due. When it is due, queue one
    email request (shared format) per round for Maria's email sending."""
    today = today or date.today()
    due = date.fromisoformat(last_assessed) + timedelta(days=REASSESS_AFTER_DAYS)
    is_due = today >= due
    if is_due:
        state = load(user_id)
        if due.isoformat() not in state["reminders_sent"]:
            _append(OUTBOX, {
                "recipient": user_id,
                "template": "re-assessment",
                "links": {"start_assessment": "/assessment/start?round=" + due.isoformat()},
            })
            state["reminders_sent"].append(due.isoformat())
            _save(state)
    return {"last_assessed": last_assessed, "due": due.isoformat(), "is_due": is_due}
