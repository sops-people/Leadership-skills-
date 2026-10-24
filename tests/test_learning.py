"""Offline tests for the learning path. Run: python3 -m unittest discover tests"""
import os
import shutil
import tempfile
import unittest
from datetime import date
from unittest import mock

from learning import path, progress, ranking

SKILL = {"skill_id": "negotiation", "name": "Negotiation", "category": "c-level"}


def item(title, url, source="Crossref", fmt="article", year=2022, snippet=""):
    return {"item_id": url[-6:], "title": title, "url": url, "source": source,
            "format": fmt, "year": year, "length_minutes": 20, "snippet": snippet}


class RankingTests(unittest.TestCase):
    def test_drops_off_topic_and_irrelevant(self):
        items = [
            item("Negotiation skills for business leaders", "https://a.org/1"),
            item("Negotiation training for nursing students", "https://a.org/2"),
            item("A history of bridges", "https://a.org/3"),
        ]
        titles = [i["title"] for i in ranking.rank(items, SKILL)]
        self.assertEqual(titles, ["Negotiation skills for business leaders"])

    def test_removes_duplicates_by_url_and_title(self):
        items = [
            item("Negotiation for Leaders", "https://a.org/1"),
            item("Negotiation for leaders!", "https://a.org/2"),
            item("Other negotiation leadership", "https://a.org/1"),
        ]
        self.assertEqual(len(ranking.rank(items, SKILL)), 1)

    def test_caps_items_per_source(self):
        items = [item("Negotiation leadership %d" % n, "https://a.org/%d" % n) for n in range(5)]
        items.append(item("Negotiation", "https://w.org/x", source="Wikipedia", fmt="primer"))
        ranked = ranking.rank(items, SKILL)
        self.assertEqual(sum(1 for i in ranked if i["source"] == "Crossref"), ranking.MAX_PER_SOURCE)
        self.assertIn("Wikipedia", [i["source"] for i in ranked])

    def test_useful_votes_raise_rank(self):
        a = item("Negotiation leadership A", "https://a.org/aaaaaa")
        b = item("Negotiation leadership B", "https://b.org/bbbbbb", source="Wikipedia")
        votes = {b["item_id"]: {"useful": 3, "not_useful": 0},
                 a["item_id"]: {"useful": 0, "not_useful": 2}}
        self.assertEqual(ranking.rank([a, b], SKILL, votes)[0]["title"], b["title"])


class PathTests(unittest.TestCase):
    def test_orders_by_priority_and_skips_closed_gaps(self):
        taxonomy = {"skills": [SKILL, {"skill_id": "feedback", "name": "Giving & receiving feedback",
                                       "category": "soft"},
                               {"skill_id": "done", "name": "Done skill", "category": "soft"}]}
        report = {"user_id": "u1", "skills": [
            {"skill_id": "negotiation", "gap": 1, "blind_spot": 0, "priority": 0.6},
            {"skill_id": "feedback", "gap": 1, "blind_spot": 1, "priority": 1.8},
            {"skill_id": "done", "gap": 0, "blind_spot": -0.5, "priority": 0},
        ]}
        fake = {"items": [], "dead_links": 0, "errors": []}
        with mock.patch.object(path, "_cached_search", return_value=fake):
            result = path.build_path(report, taxonomy)
        self.assertEqual([s["skill_id"] for s in result["steps"]], ["feedback", "negotiation"])
        self.assertEqual([s["order"] for s in result["steps"]], [1, 2])


class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.patches = [mock.patch.object(progress, "PROGRESS_DIR", self.tmp),
                        mock.patch.object(progress, "OUTBOX", os.path.join(self.tmp, "outbox.jsonl"))]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        shutil.rmtree(self.tmp)

    def test_item_progress_starts_skill_and_emits_update(self):
        progress.set_item_status("u1", "negotiation", "abc", "done", today=date(2026, 10, 24))
        state = progress.load("u1")
        self.assertEqual(state["skills"]["negotiation"], "in_progress")
        with open(os.path.join(self.tmp, "updates.jsonl")) as f:
            line = f.read().strip()
        self.assertIn('"items_completed": ["abc"]', line)

    def test_rejects_unknown_status(self):
        with self.assertRaises(ValueError):
            progress.set_skill_status("u1", "negotiation", "finished")

    def test_reassessment_due_after_90_days_queues_one_email(self):
        not_due = progress.reassessment("u1", "2026-08-01", today=date(2026, 10, 24))
        self.assertFalse(not_due["is_due"])
        for _ in range(2):
            due = progress.reassessment("u1", "2026-07-20", today=date(2026, 10, 24))
        self.assertTrue(due["is_due"])
        with open(os.path.join(self.tmp, "outbox.jsonl")) as f:
            self.assertEqual(len(f.readlines()), 1)


if __name__ == "__main__":
    unittest.main()
