# Leadership Skills

v1 of the leadership learning and development app described in [PRD.md](PRD.md):
rate yourself on 19 leadership skills, collect 360 feedback, get a gap report and a
learning path, and track progress.

All three parts live in this one Next.js app:

| Part | Owner | Code |
| --- | --- | --- |
| Task 1: Assessment, 360 and gap report | Darko | `src/lib/assessment/`, `src/app/(app)/assessment`, `gap-report`, `src/app/rate` |
| Task 2: Learning path and content | Sops | `src/lib/learning/`, `src/app/(app)/learning-path` |
| Task 3: Platform and experience | Maria | everything else: sign-up, onboarding, profile, home, design, email, metrics, privacy |

## Run it locally

You need Node.js 20 or later. No database server or email account is needed.

```bash
npm install
cp .env.example .env
npm run db:setup     # creates prisma/dev.db and adds 3 sample users
npm run dev          # http://localhost:3000
```

Sign up with any email address. Emails aren't sent locally: open
http://localhost:3000/dev/outbox and click the log-in link. Rater survey links show
up there too, so you can act as each rater (use a private window).

```bash
npm test             # unit tests
npm run typecheck
npm run metrics      # prints the four success metrics from the database
```

## Stack

Next.js 15 (React, TypeScript) · Prisma with SQLite locally · Tailwind CSS · Resend for
email · Vitest. Hosting and the production database are still to be chosen;
switching to Postgres is a one-line change in `prisma/schema.prisma`.

Log-in is a one-time emailed link, built in, so the app runs without any outside accounts.

## Agreed formats

| Format | Owner | Where |
| --- | --- | --- |
| Skill taxonomy (19 skills, bars and importance per role) | Darko | `src/lib/assessment/taxonomy.ts` |
| Gap report: `items` with `roleGap`, `blindSpot`, `priority`, plus `generatedAt` | Darko | `src/lib/assessment/scoring.ts` |
| Progress: skills `not_started` / `in_progress` / `improved`, items `not_started` / `in_progress` / `done` | Sops | `src/lib/learning/` |
| User profile and Email request | Maria | `src/shared/formats.ts` |
| Roles: current Manager, Director, VP, C-level; target Director, VP, C-level | All | `src/shared/roles.ts` |

The learning path reads Darko's gap report directly. All email goes through
`requestEmail()` in the Email request format.

## Anonymity

Others' average for a skill is shown only once **3 or more** people have rated that
skill, with all relationships pooled (Darko's rule). "Not observed" answers don't
count, and the user never sees individual answers or who has responded.
The per-group rule proposed in the kickoff doc (peers and direct reports counted
separately, manager shown on its own line) is still an open decision.

## Where things are

| Path | What |
| --- | --- |
| `src/shared/` | Shared formats, roles, metric events, sample users |
| `src/components/ui.tsx` | Shared design: Button, ButtonLink, Field, Input, Select, Card, PageHeader, Notice |
| `src/lib/current-user.ts` | `requireUser()` / `requireProfile()` for pages and actions |
| `src/lib/email/` | `requestEmail()`, `processDueEmails()`, `purgeRecipientData()`, templates |
| `src/lib/metrics/` | `track()` records an event; `computeMetrics()` works out the four metrics |
| `src/lib/privacy/` | `deleteAccount()` |
| `src/lib/assessment/` | Taxonomy, rating scale, gap scoring, invites and reminders (Darko) |
| `src/lib/learning/` | Content search, ranking, learning path, progress (Sops) |

## Scheduled emails

`GET /api/cron/send-emails` with `Authorization: Bearer $CRON_SECRET` sends queued
emails whose `sendAt` has passed (including 90-day re-assessment reminders) and sends
automatic rater reminders. Point the host's scheduler at it every 15 minutes.

## Not done yet

- End-to-end browser tests (planned with Playwright).
- Hosting, production database and email domain: still to decide.
- Rate limiting on log-in link requests.
- Logging out deletes the session cookie but doesn't revoke a copied token (valid 30 days).
  Fix later with a session version on User.
- A short privacy notice for raters, linked from the invite email (open question).
- Content search is slow on first run (it searches each skill in turn; results are cached).
- Paid content sources (course catalogues, cost, terms) are undecided.

## Online demo (Vercel + Neon)

The demo runs on Vercel with a Neon Postgres database, in demo mode: emails are not
sent but shown at `/dev/outbox` (`DEMO_MODE=1`). Each browser's outbox shows only the
emails of accounts created in that browser, so testers can't open each other's log-in
links; someone who signs up in one browser can't log in from another (or after clearing cookies
or closing a private window). The landing page also offers "Try it now", which
creates a guest account and logs that browser straight in. Setting
`DEMO_PASSWORD` puts one shared password in front of the whole app. Use fake names
and emails only. Before real people
use it, add a Resend API key and a sending domain, and turn demo mode off.

Scheduled emails and automatic rater reminders run once a day (`vercel.json`; the
free Vercel plan allows daily cron jobs only).
