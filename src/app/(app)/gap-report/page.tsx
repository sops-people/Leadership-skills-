import Link from "next/link";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { Track } from "@/components/assessment";
import { requireProfile } from "@/lib/current-user";
import { gapReportFor } from "@/lib/assessment/data";
import { MIN_RATERS } from "@/lib/assessment/scoring";
import { IMPORTANCE_LABELS, categoryName } from "@/lib/assessment/taxonomy";
import type { TargetRole } from "@/shared/roles";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function GapCell({ n, kind }: { n: number | null; kind: "role" | "blind" }) {
  if (n === null) return <td className="px-2 py-2 text-right text-muted">–</td>;
  const tone =
    kind === "role" ? (n > 0 ? "text-danger" : "text-good") : n >= 0.5 ? "text-danger" : n <= -0.5 ? "text-good" : "";
  return <td className={`px-2 py-2 text-right ${tone}`}>{signed(n)}</td>;
}

export default async function GapReportPage() {
  const profile = await requireProfile();
  const role = profile.targetRole as TargetRole;
  const { report } = await gapReportFor(profile.userId, role);

  if (!report.selfComplete) {
    return (
      <>
        <PageHeader
          title="Gap report"
          intro={`Finish your self-assessment first. The report compares your own ratings with the bar for ${role}.`}
        />
        <ButtonLink href="/assessment">Go to self-assessment</ButtonLink>
      </>
    );
  }

  const top = report.items.filter((i) => i.priority > 0).slice(0, 3);
  const blindSpots = report.items
    .filter((i) => i.blindSpot !== null && i.blindSpot >= 0.5)
    .sort((a, b) => (b.blindSpot ?? 0) - (a.blindSpot ?? 0));
  const strengths = report.items
    .filter((i) => i.blindSpot !== null && i.blindSpot <= -0.5)
    .sort((a, b) => (a.blindSpot ?? 0) - (b.blindSpot ?? 0));
  const { completed, needed } = report.raters;

  return (
    <>
      <p className="text-sm font-semibold text-muted">Gap report · target role {role}</p>
      <PageHeader title="Where to focus" />
      <div className="mb-6 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm">
        {report.othersVisible ? (
          `Based on your self-assessment and ${completed} anonymous 360 responses.`
        ) : (
          <>
            Showing role gaps only. Blind spots appear once {needed} more {needed > 1 ? "people respond" : "person responds"}{" "}
            to your 360 invite ({completed} of {MIN_RATERS} so far).{" "}
            <Link href="/assessment/invites" className="font-semibold text-brand">
              Manage invites
            </Link>
          </>
        )}
      </div>

      {top.length ? (
        <ol className="mb-8 grid gap-4 md:grid-cols-3">
          {top.map((i) => (
            <li key={i.skillId}>
              <Card className="h-full">
                <p className="text-xs font-semibold text-muted">{categoryName(i.category)}</p>
                <h2 className="mt-1 font-semibold">{i.name}</h2>
                <p className="mt-2 text-sm text-muted">
                  Bar {i.bar} · you {i.self}
                  {i.othersAvg !== null ? ` · others ${i.othersAvg}` : ""} · {IMPORTANCE_LABELS[i.importance]} for {role}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      ) : (
        <Card className="mb-8">
          You meet or exceed the bar for {role} on every skill{report.othersVisible ? ", and others agree" : ""}.
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted" aria-hidden="true">
        <span className="flex items-center gap-1">
          <i className="inline-block h-3 w-0.5 bg-ink" />
          Bar for {role}
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-brand" />
          You
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-warn" />
          Others’ average
        </span>
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Skill</th>
              <th className="px-2 py-2">1 – 5</th>
              <th className="px-2 py-2 text-right">Bar</th>
              <th className="px-2 py-2 text-right">You</th>
              <th className="px-2 py-2 text-right">Others</th>
              <th className="px-2 py-2 text-right" title="Bar minus your rating">
                Role gap
              </th>
              <th className="px-2 py-2 text-right" title="Your rating minus others' average">
                Blind spot
              </th>
              <th className="px-2 py-2 text-right" title="Importance × gap size">
                Priority
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.items.map((i, n) => (
              <tr key={i.skillId}>
                <td className="px-2 py-2 text-muted">{n + 1}</td>
                <td className="px-2 py-2">
                  <strong>{i.name}</strong>
                  <br />
                  <small className="text-muted">
                    {categoryName(i.category)} · {IMPORTANCE_LABELS[i.importance]}
                  </small>
                </td>
                <td className="px-2 py-2">
                  <Track item={i} />
                </td>
                <td className="px-2 py-2 text-right">{i.bar}</td>
                <td className="px-2 py-2 text-right">{i.self}</td>
                <td className="px-2 py-2 text-right">
                  {i.othersAvg ?? (
                    <span className="text-muted" title={`Shown once ${MIN_RATERS} people have rated this skill`}>
                      hidden
                    </span>
                  )}
                </td>
                <GapCell n={i.roleGap} kind="role" />
                <GapCell n={i.blindSpot} kind="blind" />
                <td className="px-2 py-2 text-right font-semibold">{i.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Blind spots</h2>
          <p className="mt-1 text-sm text-muted">Others rate you at least half a point lower than you rate yourself.</p>
          {!report.othersVisible ? (
            <p className="mt-3 text-sm text-muted">Waiting for 360 responses.</p>
          ) : blindSpots.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {blindSpots.map((i) => (
                <li key={i.skillId}>
                  {i.name} <span className="text-danger">({signed(i.blindSpot ?? 0)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm">None. Others see you much as you see yourself.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Hidden strengths</h2>
          <p className="mt-1 text-sm text-muted">Others rate you at least half a point higher than you rate yourself.</p>
          {!report.othersVisible ? (
            <p className="mt-3 text-sm text-muted">Waiting for 360 responses.</p>
          ) : strengths.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {strengths.map((i) => (
                <li key={i.skillId}>
                  {i.name} <span className="text-good">({signed(i.blindSpot ?? 0)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm">None found.</p>
          )}
        </Card>
      </div>

      <details className="mt-8 rounded-card border border-line bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">How this report is calculated</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Role gap</strong> = bar for {role} − your rating. Positive means you are below the bar.
          </li>
          <li>
            <strong>Blind spot</strong> = your rating − others’ average. Positive means others see you lower than you see
            yourself.
          </li>
          <li>
            <strong>Priority</strong> = importance for {role} (1–3) × gap size, where gap size = positive role gap +
            positive blind spot.
          </li>
          <li>
            Others’ average for a skill is only shown once at least {MIN_RATERS} people have rated it. “Not observed”
            answers are left out.
          </li>
        </ul>
      </details>

      <div className="mt-8">
        <ButtonLink href="/learning-path">See your learning path</ButtonLink>
      </div>
    </>
  );
}
