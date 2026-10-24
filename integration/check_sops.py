"""Feeds Darko's live gap report into Sops's learning path code.

Content search is stubbed out (no network): this checks the hand-off, not the search.
Also has Sops's code queue a re-assessment email, for check_maria.ts to check.
"""
import json
import os
import sys
import tempfile
from datetime import date

SOPS = os.path.abspath(os.environ["SOPS_DIR"])
OUT = os.path.abspath(os.environ["OUT_DIR"])
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, SOPS)

from learning import path, progress  # noqa: E402


def record(check, passed, detail=""):
    with open(os.path.join(OUT, "results.jsonl"), "a") as f:
        f.write(json.dumps({"check": check, "passed": passed, "detail": detail}) + "\n")


def run(check, fn):
    try:
        record(check, True, fn() or "")
    except Exception as exc:  # report every failure, keep going
        record(check, False, "%s: %s" % (type(exc).__name__, exc))


def load_report():
    with open(os.path.join(OUT, "gap-report.json")) as f:
        return json.load(f)


taxonomy = path.load_json("taxonomy.json")
path._cached_search = lambda skill, refresh=False: {"items": [], "errors": []}


def feed():
    result = path.build_path(load_report(), taxonomy)
    return "%d learning path steps" % len(result["steps"])


def skill_ids():
    sops_ids = {s["skill_id"] for s in taxonomy["skills"]}
    darko_ids = {i["skillId"] for i in load_report()["items"]}
    missing = sorted(darko_ids - sops_ids)
    assert not missing, "not in Sops's taxonomy: " + ", ".join(missing)
    return "all %d match" % len(darko_ids)


def role_names():
    report = load_report()
    sops_roles = sorted(taxonomy["skills"][0]["role_bars"])
    role = report.get("targetRole")
    assert role in sops_roles, "Darko's targetRole %r is not one of Sops's role names %s" % (role, sops_roles)
    return role


def assessment_date():
    report = load_report()
    assert "generated_at" in report, (
        "Sops starts the 90-day clock from 'generated_at'; Darko's report has: %s" % ", ".join(sorted(report))
    )
    return report["generated_at"]


run("Sops's learning path accepts Darko's live gap report", feed)
run("Skill ids: Darko's gap report vs Sops's taxonomy", skill_ids)
run("Role names: Darko's gap report vs Sops's taxonomy", role_names)
run("90-day clock: Sops can read the assessment date from Darko's report", assessment_date)

# Have Sops's code queue the email it would send, for the email format check.
progress.PROGRESS_DIR = tempfile.mkdtemp()
progress.OUTBOX = os.path.join(OUT, "sops-emails.jsonl")
progress.reassessment("u-ci", "2026-01-01", today=date(2026, 6, 1))
