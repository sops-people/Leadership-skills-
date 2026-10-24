// The four success metrics from PRD section 9, worked out from stored events.
// Pure functions: events in, numbers out. sampleSize says how many users (or
// paths) the number is based on; value is null when there is nothing to measure yet.
import type { EventName, StoredEvent } from "@/shared/events";

export type MetricResult = { value: number | null; sampleSize: number };

export type Metrics = {
  /** Share of onboarded users who finished the self-assessment (0 to 1). */
  assessmentCompletion: MetricResult;
  /** Average share of each skill gap closed between first and latest assessment (0 to 1; negative = widened). */
  gapClosure: MetricResult;
  /** Average drop in |self - others| rating difference, first to latest 360 cycle (rating points; positive = converging). */
  selfVs360Convergence: MetricResult;
  /** Share of learning-path items marked improved (0 to 1). */
  learningPathCompletion: MetricResult;
};

export function computeMetrics(events: StoredEvent[]): Metrics {
  return {
    assessmentCompletion: assessmentCompletion(events),
    gapClosure: gapClosure(events),
    selfVs360Convergence: selfVs360Convergence(events),
    learningPathCompletion: learningPathCompletion(events),
  };
}

export function assessmentCompletion(events: StoredEvent[]): MetricResult {
  const onboarded = userIds(ofName(events, "onboarding-completed"));
  const completed = userIds(ofName(events, "self-assessment-completed"));
  const done = [...onboarded].filter((id) => completed.has(id)).length;
  return { value: onboarded.size ? done / onboarded.size : null, sampleSize: onboarded.size };
}

export function gapClosure(events: StoredEvent[]): MetricResult {
  const perUser: number[] = [];
  for (const reports of byUser(ofName(events, "gap-report-created")).values()) {
    if (reports.length < 2) continue;
    reports.sort((a, b) => a.props.cycle - b.props.cycle);
    const first = reports[0].props.gaps;
    const latest = reports[reports.length - 1].props.gaps;
    const closures = Object.entries(first)
      .filter(([, gap]) => gap > 0)
      .map(([skillId, gap]) => (gap - (latest[skillId] ?? gap)) / gap);
    if (closures.length) perUser.push(mean(closures));
  }
  return { value: perUser.length ? mean(perUser) : null, sampleSize: perUser.length };
}

export function selfVs360Convergence(events: StoredEvent[]): MetricResult {
  const perUser: number[] = [];
  for (const cycles of byUser(ofName(events, "360-cycle-closed")).values()) {
    if (cycles.length < 2) continue;
    cycles.sort((a, b) => a.props.cycle - b.props.cycle);
    const diff = (pairs: { self: number; others: number }[]) =>
      pairs.length ? mean(pairs.map((p) => Math.abs(p.self - p.others))) : null;
    const first = diff(cycles[0].props.pairs);
    const latest = diff(cycles[cycles.length - 1].props.pairs);
    if (first !== null && latest !== null) perUser.push(first - latest);
  }
  return { value: perUser.length ? mean(perUser) : null, sampleSize: perUser.length };
}

export function learningPathCompletion(events: StoredEvent[]): MetricResult {
  const itemCounts = new Map<string, number>();
  for (const e of ofName(events, "path-created")) itemCounts.set(e.props.pathId, e.props.itemCount);

  // Latest status per item wins.
  const latestStatus = new Map<string, { pathId: string; status: string; at: number }>();
  for (const e of ofName(events, "item-status-changed")) {
    const key = `${e.props.pathId}/${e.props.itemId}`;
    const at = e.createdAt.getTime();
    const prev = latestStatus.get(key);
    if (!prev || at >= prev.at) latestStatus.set(key, { pathId: e.props.pathId, status: e.props.status, at });
  }

  const improvedPerPath = new Map<string, number>();
  for (const { pathId, status } of latestStatus.values()) {
    if (status === "improved") improvedPerPath.set(pathId, (improvedPerPath.get(pathId) ?? 0) + 1);
  }

  let items = 0;
  let improved = 0;
  for (const [pathId, count] of itemCounts) {
    items += count;
    improved += Math.min(improvedPerPath.get(pathId) ?? 0, count);
  }
  return { value: items ? improved / items : null, sampleSize: itemCounts.size };
}

function ofName<N extends EventName>(events: StoredEvent[], name: N): StoredEvent<N>[] {
  return events.filter((e): e is StoredEvent<N> => e.name === name);
}

function userIds(events: StoredEvent[]): Set<string> {
  return new Set(events.map((e) => e.userId).filter((id): id is string => id !== null));
}

function byUser<N extends EventName>(events: StoredEvent<N>[]): Map<string, StoredEvent<N>[]> {
  const map = new Map<string, StoredEvent<N>[]>();
  for (const e of events) {
    if (!e.userId) continue;
    const list = map.get(e.userId) ?? [];
    list.push(e);
    map.set(e.userId, list);
  }
  return map;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
