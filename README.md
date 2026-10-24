# Leadership Skills

v1 of the leadership learning and development app described in [PRD.md](PRD.md).

This branch holds **Task 3, Platform and experience**: project setup, sign-up and log-in,
onboarding, shared design, home screen, email sending, success-metric tracking and privacy.
Darko (Task 1) and Sops (Task 2) build on top of it.

## Run it locally

You need Node.js 20 or later. No database server or email account is needed.

```bash
npm install
cp .env.example .env
npm run db:setup     # creates prisma/dev.db and adds 3 sample users
npm run dev          # http://localhost:3000
```

Sign up with any email address. Emails aren't sent locally: open
http://localhost:3000/dev/outbox and click the log-in link. To log in as a sample user,
use `alex@example.com`, `sam@example.com` or `jo@example.com` on the log-in page.

```bash
npm test             # unit tests
npm run typecheck
npm run metrics      # prints the four success metrics from the database
```

## Stack

Next.js 15 (React, TypeScript) · Prisma with SQLite locally · Tailwind CSS · Resend for
email · Vitest. Hosting and the production database are still to be chosen at kickoff;
switching to Postgres is a one-line change in `prisma/schema.prisma`.

Log-in is a one-time emailed link, built in, so the app runs without any outside accounts.
If the team prefers hosted auth (Supabase Auth or Clerk), only `src/lib/auth.ts`,
`src/lib/session.ts` and the sign-up and log-in pages change.

## Where things are

| Path | What |
| --- | --- |
| `src/shared/formats.ts` | The five shared formats. User profile and Email request are final drafts; the other three are placeholders for their owners |
| `src/shared/events.ts` | Metric events, and who sends which |
| `src/shared/roles.ts` | Role list: Manager, Director, VP, C-level |
| `src/shared/sample-data.ts` | Sample skills (PRD section 7), users, 360 ratings and a gap report |
| `src/components/ui.tsx` | Shared design: Button, ButtonLink, Field, Input, Select, Card, PageHeader, Notice |
| `src/lib/current-user.ts` | `requireProfile()` gives a page the signed-in user's profile |
| `src/lib/email/send.ts` | `requestEmail()`, `processDueEmails()`, `purgeRecipientData()` |
| `src/lib/metrics/` | `track()` records an event; `computeMetrics()` works out the four metrics |
| `src/lib/privacy/` | `toRatingsView()` applies the 360 anonymity rules; `deleteAccount()` |
| `src/app/(app)/` | Signed-in screens. Assessment, gap report and learning path are placeholders |

## For Darko and Sops

- **Your screens:** replace the placeholder page in `src/app/(app)/assessment`,
  `gap-report` or `learning-path`. Start each page with `const profile = await requireProfile();`.
- **Your data:** add models to `prisma/schema.prisma` with a `userId` relation and
  `onDelete: Cascade`, so account deletion removes them.
- **Sending email:**

  ```ts
  await requestEmail({
    recipient: rater.email,
    template: "rater-invite",
    links: [raterPageUrl],
    variables: { userName: profile.name, dueDate: "14 November" },
    requestedBy: "assessment",
    relatedId: cycle.id,          // lets purgeRecipientData(cycle.id) remove rater emails later
    sendAt: undefined,            // or a Date, for a reminder
  });
  ```

- **Metrics:** call `track()` with the events listed in `src/shared/events.ts`
  (for example `track("self-assessment-completed", profile.userId, { assessmentId })`).
- **360 results:** pass raw ratings through `toRatingsView()` before showing anything.
  Peer and direct-report scores show only with 3 or more raters in that group; manager
  scores show on their own line; comments are unattributed and sorted.
- **Design:** use the components in `src/components/ui.tsx` and the colour names in
  `tailwind.config.ts` (`bg-brand`, `text-muted`, `border-line`...).

## CI

The CI workflow is in `docs/ci-workflow.yml`. Move it to `.github/workflows/ci.yml` to switch it on
(pushing workflow files needs a GitHub token with the `workflow` scope).

## Scheduled emails

`GET /api/cron/send-emails` with `Authorization: Bearer $CRON_SECRET` sends queued
emails whose `sendAt` has passed. Point the host's scheduler at it every 15 minutes.

## Not done yet

- No `package-lock.json`: whoever runs `npm install` first, please commit it.
- End-to-end browser tests (planned with Playwright once the three parts connect).
- Hosting, production database and email domain: decisions for kickoff.
- Rate limiting on log-in link requests.
- Logging out deletes the session cookie but doesn't revoke a copied token (valid 30 days).
  Fix later with a session version on User.
- A short privacy notice for raters, linked from the invite email (open question).
