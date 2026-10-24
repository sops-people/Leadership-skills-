import { redirect } from "next/navigation";
import { ButtonLink, Notice } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await getCurrentUser()) redirect("/home");
  const { deleted } = await searchParams;

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      {deleted && <Notice tone="success">Your account and all your data have been deleted.</Notice>}
      <h1 className="text-3xl font-semibold">Find your leadership blind spots</h1>
      <p className="mt-4 text-muted">
        Rate yourself on 19 leadership skills, ask the people you work with for honest feedback, and get a learning
        path for the gaps that matter for your next role.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/sign-up">Sign up</ButtonLink>
        <ButtonLink href="/log-in" variant="secondary">
          Log in
        </ButtonLink>
      </div>
    </main>
  );
}
