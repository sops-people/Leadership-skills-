# Shared data formats (proposal from the learning path work)

These are the formats the learning path reads and writes. They're a starting proposal for the week-1 agreement. Darko and Maria own the formats marked as theirs and can change them.

## Skill taxonomy (owner: Darko) — `data/taxonomy.json`

```json
{"version": "0.1-sample", "skills": [
  {"skill_id": "negotiation", "name": "Negotiation", "category": "c-level",
   "description": "High-stakes deals, partnerships, compensation",
   "role_bars": {"Manager": 3, "Director": 3, "VP": 4, "C-level": 5}}
]}
```

`category` is `c-level` or `soft`. The 19 skills come from PRD section 7. The role bars (1–5) are placeholders until Darko sets them.

## Gap report (owner: Darko) — `data/sample_gap_report.json`

```json
{"user_id": "u-sample-1", "current_role": "Director", "target_role": "VP",
 "generated_at": "2026-07-20",
 "skills": [{"skill_id": "feedback", "self_score": 3, "others_avg": 2.0, "role_bar": 4,
             "gap": 1, "blind_spot": 1.0, "priority": 1.8}]}
```

- `gap` = role bar − self score.
- `blind_spot` = self score − others' average. A positive value means the user rates themselves higher than others do.
- `generated_at` is the assessment date, which starts the 90-day re-assessment clock.

The learning path includes every skill where `gap > 0` or `blind_spot > 0`, ordered by `priority`.

## Progress update (owner: Sops) — `data/progress/updates.jsonl`

One JSON line per change:

```json
{"user_id": "u-sample-1", "skill_id": "feedback", "status": "in_progress",
 "items_completed": ["a1b2c3d4e5f6"], "date": "2026-10-24"}
```

- Skill `status` can be `not_started`, `in_progress` or `improved`.
- Each item is `not_started`, `in_progress` or `done`. Items use `done` rather than `improved`, because you finish an item but you improve a skill.

## Email request (owner: Maria) — `data/outbox.jsonl`

When a re-assessment is due, the learning path writes one request per round:

```json
{"recipient": "u-sample-1", "template": "re-assessment",
 "links": {"start_assessment": "/assessment/start?round=2026-10-18"}}
```

`recipient` is a user ID for now. Maria's email sending looks up the address.
