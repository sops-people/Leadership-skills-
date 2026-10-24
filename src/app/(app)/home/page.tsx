import Link from "next/link";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/current-user";
import { db } from "@/lib/db";
import { latestRound } from "@/lib/assessment/data";
import { MIN_RATERS } from "@/lib/assessment/scoring";
import { SKILLS } from "@/lib/assessment/taxonomy";

// The user flow (PRD section 8), with Darko's step statuses.
export default async function HomePage() {
  const profile = await requireProfile();
  const round = await latestRound(profile.userId);
  const invites = round ? await db.raterInvite.findMany({ where: { roundId: round.id } }) : [];
  const done = invites.filter((i) => i.completedAt).length;
  const selfDone = Boolean(round?.selfCompletedAt);

  const steps = [
    {
      title: "Rate yourself",
      text: `Rate yourself on all ${SKILLS.length} skills. Takes about 10 minutes.`,
      status: selfDone ? "Done" : "To do",
      href: "/assessment",
      action: selfDone ? "Review answers" : "Start",
    },
    {
      title: "Invite 360 raters",
      text: `Invite at least ${MIN_RATERS} people. Their answers stay anonymous and are only shown once ${MIN_RATERS} have responded.`,
      status: `${done} of ${invites.length} responded`,
      href: "/assessment/invites",
      action: invites.length ? "Manage invites" : "Invite people",
    },
    {
      title: "Read your gap report",
      text: "See where you are below the bar for your target role, and where others see you differently.",
      status: selfDone ? (done >= MIN_RATERS ? "Ready" : "Role gaps ready") : "Needs self-assessment",
      href: "/gap-report",
      action: "Open report",
    },
    {
      title: "Follow your learning path",
      text: "Work through training picked for your biggest gaps, and track what's improved.",
      status: selfDone ? "Ready" : "Needs self-assessment",
      href: "/learning-path",
      action: "Open learning path",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi ${profile.name}`}
        intro={
          <>
            Your goal: <strong className="text-ink">{profile.currentRole}</strong> to{" "}
            <strong className="text-ink">{profile.targetRole}</strong>.{" "}
            <Link href="/profile" className="text-brand">
              Change
            </Link>
          </>
        }
      />
      <ol className="grid gap-4 md:grid-cols-2">
        {steps.map((step, n) => (
          <li key={step.href}>
            <Card className="flex h-full flex-col">
              <h2 className="font-semibold text-ink">
                {n + 1}. {step.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted">{step.text}</p>
              <p className="mt-3 text-sm font-semibold">{step.status}</p>
              <ButtonLink href={step.href} variant="secondary" className="mt-4 self-start">
                {step.action}
              </ButtonLink>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
