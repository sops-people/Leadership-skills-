import { notFound } from "next/navigation";
import { Button, Notice, PageHeader } from "@/components/ui";
import { RatingField, ScaleLegend } from "@/components/assessment";
import { db } from "@/lib/db";
import { CATEGORIES, SKILLS } from "@/lib/assessment/taxonomy";
import { raterQuestion } from "@/lib/assessment/scale";
import { MIN_RATERS } from "@/lib/assessment/scoring";
import { submitRaterRatings } from "@/app/actions/assessment";

export const dynamic = "force-dynamic";

// Public rater survey, reached by the private link in the invite email.
export default async function RaterPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ missing?: string; done?: string }>;
}) {
  const { token } = await params;
  const { missing: missingParam, done } = await searchParams;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  const invite = await db.raterInvite.findUnique({ where: { token }, include: { round: { include: { user: true } } } });
  if (!invite || invite.raterEmail === "[removed]") notFound();
  const subject = invite.round.user;

  if (invite.completedAt) {
    const already = !done;
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <PageHeader title={already ? "You have already responded" : "Thank you"} />
        <p className="text-muted">
          {already ? "Your feedback was already recorded." : `Your feedback for ${subject.name} has been recorded.`} It will
          only be shown as part of an average with at least {MIN_RATERS} other people’s answers.
        </p>
      </main>
    );
  }

  const first = subject.name.split(" ")[0];
  const missing = missingParam ? missingParam.split(",") : [];
  const submit = submitRaterRatings.bind(null, token);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-semibold text-muted">360 feedback</p>
      <PageHeader
        title={`How does ${subject.name} lead?`}
        intro={`Hi ${invite.raterName}. ${subject.name} asked for your honest view of ${SKILLS.length} leadership skills. Your answers are anonymous: ${first} only sees averages across at least ${MIN_RATERS} people. Choose “Not observed” for anything you have not seen in action.`}
      />
      <details className="mb-6 rounded-card border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold">What the numbers mean</summary>
        <div className="mt-3">
          <ScaleLegend />
        </div>
      </details>
      {missing.length > 0 && (
        <Notice tone="error">
          Answer the {missing.length} skill{missing.length > 1 ? "s" : ""} marked below. “Not observed” counts as an
          answer.
        </Notice>
      )}
      <form action={submit} className="space-y-4">
        {CATEGORIES.map((c) => (
          <section key={c.id} className="space-y-4">
            <h2 className="text-lg font-semibold">{c.name}</h2>
            {SKILLS.filter((s) => s.category === c.id).map((s) => (
              <RatingField
                key={s.id}
                skill={s}
                question={raterQuestion(s, first)}
                allowNotObserved
                missing={missing.includes(s.id)}
              />
            ))}
          </section>
        ))}
        <Button type="submit">Submit feedback</Button>
      </form>
    </main>
  );
}
