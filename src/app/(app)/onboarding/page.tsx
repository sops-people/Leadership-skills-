import { Button, Card, Notice, PageHeader } from "@/components/ui";
import { RoleFields } from "@/components/role-fields";
import { requireUser } from "@/lib/current-user";
import { completeOnboarding } from "@/app/actions/profile";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        intro="Tell us where you are and where you're heading. We measure your skills against the bar for your target role."
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <form action={completeOnboarding} className="space-y-6">
          <RoleFields currentRole={user.currentRole} targetRole={user.targetRole} />
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </>
  );
}
