# Leadership Skills app

Leadership learning & development app (see `PRD.md`). This folder currently contains **Task 1: Assessment & 360** (owner: Darko). It finds each user's skill gaps and blind spots.

## Run it

Needs Node.js 20 or later. No packages to install.

```bash
npm start          # http://localhost:3000
npm test           # 8 tests, including the full "done when" flow
```

Emails are not sent yet. Each one is saved to `data/outbox/` and listed at <http://localhost:3000/dev/outbox>, so you can open a rater's survey link yourself.

To try the whole flow by hand: sign up → rate yourself → invite 3 people → open each survey link from `/dev/outbox` (use a private window, so you are not signed in as yourself) → open **Gap report**.

## What's in Task 1

| Item | Where |
|---|---|
| 19 skills with description, example behaviours, bars and importance per role | `src/assessment/taxonomy.js` |
| Rating scale (1–5) and question wording | `src/assessment/scale.js` |
| Gap scoring and anonymity rule | `src/assessment/scoring.js` |
| 360 invites and reminders | `src/assessment/invites.js` |
| Screens: self-assessment, invites, rater survey, gap report | `src/assessment/views.js` |
| Routes | `src/server.js` |

### Scoring

- **Role gap** = bar for target role − self rating. Positive means below the bar.
- **Blind spot** = self rating − others' average. Positive means others rate you lower than you rate yourself.
- **Gap size** = positive role gap + positive blind spot. A skill you overrate ranks higher, because your real distance from the bar is bigger than you think. Hidden strengths (negative blind spots) don't reduce priority.
- **Priority** = importance for target role (1–3) × gap size. The report is sorted by priority.

### Anonymity

- Others' average for a skill is shown only once **3 or more** people have rated that skill. "Not observed" answers don't count.
- The user never sees individual answers, or which invitees have responded.
- `/api/gap-report` contains only averages, never rater names or emails.

### Reminders

- Automatic: 3 days after the invite, then every 3 days, at most 2 reminders. Checked hourly while the server runs.
- Manual: the "Remind" button on the 360 page, at most once a day per rater.

## Hand-offs to the other tasks

| Shared item | Endpoint / module | Used by |
|---|---|---|
| Skill taxonomy | `GET /api/taxonomy` | Sops (search per skill), Maria |
| Gap report | `GET /api/gap-report` (signed-in user) | Sops (learning path order), Maria (metrics) |
| Email request `{ to, template, data, links }` | `src/platform/email.js` (stand-in) | Maria replaces with real sending |

## Stand-ins for the platform task (Maria)

These exist only so Task 1 can run on its own. Replace them when the platform is ready:

- **Sign-up** (`src/platform/layout.js`, `/start`): name, email and roles, no password. The user ID is kept in a cookie.
- **Storage** (`src/store.js`): a JSON file in `data/`. Keep the method names when moving to a real database.
- **Email** (`src/platform/email.js`): writes to an outbox folder.
- **Styling** (`public/styles.css`): placeholder until the shared design is ready.

## Open for the team

- The **bars and importance values** in `taxonomy.js` are a first draft. Confirm them (open decision "Role bars" in the build plan).
- Folding blind spots into gap size is a choice made here. Confirm it, or use role gap only.
- Edge case: if a 4th rater responds after the first 3, the change in the average could hint at that person's answers. Consider updating averages only in batches.
