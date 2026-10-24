import { ComingSoon } from "@/components/coming-soon";
import { requireProfile } from "@/lib/current-user";

// Sops replaces this page (Task 2). requireProfile() gives you the User profile.
export default async function LearningPathPage() {
  await requireProfile();
  return <ComingSoon title="Learning path" owner="Sops" task="Task 2, Learning path and content" />;
}
