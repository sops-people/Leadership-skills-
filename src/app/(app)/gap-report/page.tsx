import { ComingSoon } from "@/components/coming-soon";
import { requireProfile } from "@/lib/current-user";

// Darko replaces this page (Task 1). Pass 360 ratings through toRatingsView()
// from "@/lib/privacy/anonymity" before showing them.
export default async function GapReportPage() {
  await requireProfile();
  return <ComingSoon title="Gap report" owner="Darko" task="Task 1, Assessment and 360" />;
}
