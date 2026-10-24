import { notFound } from "next/navigation";
import { Button, ButtonLink, Notice, PageHeader } from "@/components/ui";
import { RatingField, ScaleLegend } from "@/components/assessment";
import { requireProfile } from "@/lib/current-user";
import { CATEGORIES, SKILLS } from "@/lib/assessment/taxonomy";
import { selfQuestion } from "@/lib/assessment/scale";
import { latestRound, selfRatingsFor } from "@/lib/assessment/data";
import { saveSelfRatings } from "@/app/actions/assessment";

export default async function AssessStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ missing?: string }>;
}) {
  const profile = await requireProfile();
  const { category } = await params;
  const { missing: missingParam } = await searchParams;
  const index = CATEGORIES.findIndex((c) => c.id === category);
  if (index < 0) notFound();

  const round = await latestRound(profile.userId);
  const values = round ? await selfRatingsFor(round.id) : {};
  const missing = missingParam ? missingParam.split(",") : [];
  const skills = SKILLS.filter((s) => s.category === category);
  const last = index === CATEGORIES.length - 1;
  const save = saveSelfRatings.bind(null, category);

  return (
    <>
      <p className="text-sm font-semibold text-muted">
        Step {index + 1} of {CATEGORIES.length}
      </p>
      <PageHeader title={CATEGORIES[index].name} />
      <details className="mb-6 rounded-card border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold">What the numbers mean</summary>
        <div className="mt-3">
          <ScaleLegend />
        </div>
      </details>
      {missing.length > 0 && (
        <Notice tone="error">
          Rate the {missing.length} skill{missing.length > 1 ? "s" : ""} marked below to continue.
        </Notice>
      )}
      <form action={save} className="space-y-4">
        {skills.map((s) => (
          <RatingField
            key={s.id}
            skill={s}
            question={selfQuestion(s)}
            value={values[s.id] !== undefined ? String(values[s.id]) : undefined}
            missing={missing.includes(s.id)}
          />
        ))}
        <div className="flex flex-wrap gap-3">
          {index > 0 && (
            <ButtonLink href={`/assessment/${CATEGORIES[index - 1].id}`} variant="secondary">
              Back
            </ButtonLink>
          )}
          <Button type="submit">
            {last ? "Finish self-assessment" : `Save and continue to ${CATEGORIES[index + 1].name}`}
          </Button>
        </div>
      </form>
    </>
  );
}
