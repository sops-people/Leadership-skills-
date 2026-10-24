import { ButtonLink, PageHeader } from "@/components/ui";
import { ScaleLegend } from "@/components/assessment";
import { requireProfile } from "@/lib/current-user";
import { CATEGORIES, SKILLS } from "@/lib/assessment/taxonomy";

export default async function AssessmentPage() {
  const profile = await requireProfile();
  return (
    <>
      <PageHeader
        title="Rate yourself honestly"
        intro={`You will rate ${SKILLS.length} skills in ${CATEGORIES.length} steps. Rate what you actually do today, not what you intend to do. Your ratings are compared with the expected level for ${profile.targetRole} and with how others rate you.`}
      />
      <h2 className="mb-3 font-semibold">The rating scale</h2>
      <ScaleLegend />
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={`/assessment/${CATEGORIES[0].id}`}>Start with {CATEGORIES[0].name}</ButtonLink>
        <ButtonLink href="/assessment/invites" variant="secondary">
          Invite 360 raters
        </ButtonLink>
      </div>
    </>
  );
}
