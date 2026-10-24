// Learning path screen. Owner: Sops (converted from learning/static/index.html).
// Renders from stored search results only, so it never waits on a search.
import { Button, ButtonLink, Card, Notice, PageHeader, Select } from "@/components/ui";
import { requireProfile } from "@/lib/current-user";
import { db } from "@/lib/db";
import { gapReportFor } from "@/lib/assessment/data";
import { loadCached } from "@/lib/learning/cache";
import { buildPath, gapItems } from "@/lib/learning/path";
import {
  ITEM_LABELS,
  ITEM_STATUSES,
  SKILL_LABELS,
  SKILL_STATUSES,
  loadState,
  reassessmentDue,
} from "@/lib/learning/progress";
import { track } from "@/lib/metrics/track";
import {
  findTraining,
  startReassessmentAction,
  updateItemStatus,
  updateSkillStatus,
  voteItem,
} from "@/app/actions/learning";

const lengthLabel = (m: number | null) => (m === null ? "" : m >= 120 ? `~${Math.round(m / 60)} h` : `~${m} min`);

export default async function LearningPathPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireProfile();
  const { error } = await searchParams;
  const { round, report } = await gapReportFor(profile.userId, profile.targetRole);

  if (!round?.selfCompletedAt || !report.selfComplete) {
    return (
      <>
        <PageHeader title="Your learning path" />
        <Card>
          <p className="text-muted">Your learning path is built from your gap report. Finish your self-assessment first.</p>
          <ButtonLink href="/assessment" className="mt-6">
            Go to self-assessment
          </ButtonLink>
        </Card>
      </>
    );
  }

  const cached = await loadCached(gapItems(report).map((g) => g.skillId));
  const state = await loadState(profile.userId);
  const steps = buildPath(report, state.feedback, (id) => cached.get(id) ?? null);
  const unsearched = steps.filter((s) => !s.searched).length;
  const reassess = reassessmentDue(round.selfCompletedAt);

  // Metric: record the path once per round, when every step has been searched.
  if (steps.length && !unsearched) {
    // Conditional update, so two page loads at once record it only once.
    const { count } = await db.assessmentRound.updateMany({
      where: { id: round.id, pathCreatedAt: null },
      data: { pathCreatedAt: new Date() },
    });
    if (count === 1) {
      const itemCount = steps.reduce((n, s) => n + s.items.length, 0);
      await track("path-created", profile.userId, { pathId: round.id, itemCount });
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Your learning path"
          intro={
            steps.length
              ? `${steps.length} skills to work on for ${profile.targetRole}, biggest priority first.`
              : `You meet the bar for ${profile.targetRole} on every skill. Nothing to work on right now.`
          }
        />
        {steps.length > 0 && (
          <form action={findTraining}>
            <input type="hidden" name="refresh" value="1" />
            <Button type="submit" variant="secondary">
              Search again
            </Button>
          </form>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {reassess.isDue && (
        <Notice tone="info">
          It&apos;s time to re-assess (due {reassess.due.toISOString().slice(0, 10)}). Start a new self-assessment and 360
          round to see how your gaps have changed.
          <form action={startReassessmentAction} className="mt-3">
            <Button type="submit">Start re-assessment</Button>
          </form>
        </Notice>
      )}

      {unsearched > 0 && (
        <Card className="mb-6">
          <p className="text-sm text-muted">
            {unsearched} skill{unsearched > 1 ? "s haven't" : " hasn't"} been searched for training yet. The search takes
            about 30 seconds per skill.
          </p>
          <form action={findTraining} className="mt-4">
            <input type="hidden" name="refresh" value="0" />
            <Button type="submit">Find training</Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.skillId}>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-bold text-brand">{step.order}</span>
              <h2 className="flex-1 text-lg font-semibold">{step.skillName}</h2>
              <form action={updateSkillStatus} className="flex items-center gap-2">
                <input type="hidden" name="skillId" value={step.skillId} />
                <Select
                  name="status"
                  defaultValue={state.skills[step.skillId] ?? "not_started"}
                  aria-label={`Progress on ${step.skillName}`}
                  className="mt-0 w-auto"
                >
                  {SKILL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {SKILL_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </form>
            </div>

            <p className="mt-1 text-sm text-muted">
              Gap to role bar: {step.roleGap ?? "–"}
              {(step.blindSpot ?? 0) > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-warn">
                    Blind spot: you rate yourself {step.blindSpot} higher than others do
                  </span>
                </>
              )}
            </p>

            {step.items.length ? (
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {step.items.map((item) => (
                  <li key={item.itemId} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                        {item.title}
                      </a>
                      <p className="text-xs text-muted">
                        {[item.format, item.source, item.year, lengthLabel(item.lengthMinutes)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <form action={updateItemStatus} className="flex items-center gap-2">
                        <input type="hidden" name="skillId" value={step.skillId} />
                        <input type="hidden" name="itemId" value={item.itemId} />
                        <Select
                          name="status"
                          defaultValue={state.items[`${step.skillId}/${item.itemId}`] ?? "not_started"}
                          aria-label="Progress on this item"
                          className="mt-0 w-auto"
                        >
                          {ITEM_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {ITEM_LABELS[s]}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary">
                          Save
                        </Button>
                      </form>
                      <form action={voteItem} className="flex items-center gap-1">
                        <input type="hidden" name="itemId" value={item.itemId} />
                        <span className="text-muted">Useful?</span>
                        <Button type="submit" name="useful" value="1" variant="secondary">
                          Yes{state.feedback[item.itemId]?.useful ? ` (${state.feedback[item.itemId].useful})` : ""}
                        </Button>
                        <Button type="submit" name="useful" value="0" variant="secondary">
                          No{state.feedback[item.itemId]?.notUseful ? ` (${state.feedback[item.itemId].notUseful})` : ""}
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm italic text-muted">
                {step.searched
                  ? 'No working links found for this skill yet. Try "Search again".'
                  : 'Not searched yet. Use "Find training" above.'}
              </p>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
