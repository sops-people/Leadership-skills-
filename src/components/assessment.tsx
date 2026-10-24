// Assessment building blocks: the rating scale legend, one skill's rating row, and the 1-5 track.
import { NOT_OBSERVED, RATING_SCALE } from "@/lib/assessment/scale";
import type { Skill } from "@/lib/assessment/taxonomy";
import type { GapItem } from "@/lib/assessment/scoring";

export function ScaleLegend() {
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-5">
      {RATING_SCALE.map((s) => (
        <div key={s.value} className="rounded-lg border border-line bg-surface p-3">
          <dt className="font-semibold">
            <span className="mr-1 text-brand">{s.value}</span>
            {s.label}
          </dt>
          <dd className="mt-1 text-muted">{s.description}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One skill with a row of 1-5 radio buttons (plus "Not observed" for raters). */
export function RatingField({
  skill,
  question,
  value,
  allowNotObserved = false,
  missing = false,
}: {
  skill: Skill;
  question: string;
  value?: string;
  allowNotObserved?: boolean;
  missing?: boolean;
}) {
  const choices: { value: string; label: string; title: string }[] = RATING_SCALE.map((s) => ({
    value: String(s.value),
    label: String(s.value),
    title: s.label,
  }));
  if (allowNotObserved) choices.push({ value: NOT_OBSERVED, label: "Not observed", title: "I have not seen this in action" });

  return (
    <fieldset
      id={`skill-${skill.id}`}
      className={`rounded-card border bg-surface p-5 ${missing ? "border-danger" : "border-line"}`}
    >
      <legend className="px-1 font-semibold">{skill.name}</legend>
      <p className="text-sm">{question}</p>
      <details className="mt-2 text-sm text-muted">
        <summary className="cursor-pointer">Example behaviours</summary>
        <ul className="mt-1 list-disc pl-5">
          {skill.behaviours.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </details>
      <div role="radiogroup" aria-label={skill.name} className="mt-3 flex flex-wrap gap-2">
        {choices.map((c) => (
          <label
            key={c.value}
            title={c.title}
            className="flex cursor-pointer flex-col items-center rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
          >
            <input type="radio" name={skill.id} value={c.value} defaultChecked={value === c.value} className="sr-only" />
            <span className="font-semibold">{c.label}</span>
            {c.value !== NOT_OBSERVED && <small className="text-muted">{c.title}</small>}
          </label>
        ))}
      </div>
      {missing && <p className="mt-2 text-sm text-danger">Choose a rating for this skill.</p>}
    </fieldset>
  );
}

/** A 1-5 track showing the role bar, the self rating and others' average. */
export function Track({ item }: { item: GapItem }) {
  const pos = (v: number) => `${((v - 1) / 4) * 100}%`;
  return (
    <div className="relative h-4 w-32 rounded-full bg-canvas" aria-hidden="true">
      <span className="absolute top-0 h-4 w-0.5 bg-ink" style={{ left: pos(item.bar) }} />
      {item.self !== null && (
        <span className="absolute top-1 h-2 w-2 -translate-x-1 rounded-full bg-brand" style={{ left: pos(item.self) }} />
      )}
      {item.othersAvg !== null && (
        <span
          className="absolute top-1 h-2 w-2 -translate-x-1 rounded-full bg-warn"
          style={{ left: pos(item.othersAvg) }}
        />
      )}
    </div>
  );
}
