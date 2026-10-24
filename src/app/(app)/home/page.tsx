import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/current-user";

// The three steps of the user flow (PRD section 8). Each card links to the
// screen its owner builds.
const steps = [
  {
    href: "/assessment",
    title: "1. Assessment",
    body: "Rate yourself on 19 leadership skills and invite your manager, peers and direct reports to rate you too.",
  },
  {
    href: "/gap-report",
    title: "2. Gap report",
    body: "See where you fall short of the bar for your target role, and where others see you differently.",
  },
  {
    href: "/learning-path",
    title: "3. Learning path",
    body: "Work through training picked for your biggest gaps, and track what's improved.",
  },
];

export default async function HomePage() {
  const profile = await requireProfile();
  return (
    <>
      <PageHeader
        title={`Hi ${profile.name}`}
        intro={
          <>
            Your goal: <strong className="text-ink">{profile.currentRole}</strong> to{" "}
            <strong className="text-ink">{profile.targetRole}</strong>.{" "}
            <Link href="/profile" className="text-brand">
              Change
            </Link>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <Link key={step.href} href={step.href} className="group">
            <Card className="h-full transition group-hover:border-brand">
              <h2 className="font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
