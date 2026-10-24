import { ComingSoon } from "@/components/coming-soon";
import { requireProfile } from "@/lib/current-user";

// Darko replaces this page (Task 1). requireProfile() gives you the User profile.
export default async function AssessmentPage() {
  await requireProfile();
  return <ComingSoon title="Assessment" owner="Darko" task="Task 1, Assessment and 360" />;
}
