// Prints the four success metrics (PRD section 9). Run: npm run metrics
import { db } from "../src/lib/db";
import { loadEvents } from "../src/lib/metrics/track";
import { computeMetrics, type MetricResult } from "../src/lib/metrics/compute";

const pct = (r: MetricResult) => (r.value === null ? "no data yet" : `${Math.round(r.value * 100)}%`);
const pts = (r: MetricResult) => (r.value === null ? "no data yet" : `${r.value.toFixed(2)} rating points`);

async function main() {
  const m = computeMetrics(await loadEvents());
  console.log("Success metrics");
  console.log(`  Initial assessment completion  ${pct(m.assessmentCompletion)}  (${m.assessmentCompletion.sampleSize} onboarded users)`);
  console.log(`  Gap closure per skill          ${pct(m.gapClosure)}  (${m.gapClosure.sampleSize} users re-assessed)`);
  console.log(`  Self vs 360 convergence        ${pts(m.selfVs360Convergence)}  (${m.selfVs360Convergence.sampleSize} users with 2+ cycles)`);
  console.log(`  Learning path completion       ${pct(m.learningPathCompletion)}  (${m.learningPathCompletion.sampleSize} paths)`);
}

main().finally(() => db.$disconnect());
