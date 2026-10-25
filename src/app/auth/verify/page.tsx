import { Button, Card, PageHeader } from "@/components/ui";

// The link in the log-in email lands here. The token is only used when the person
// clicks the button: corporate email scanners open links on a plain GET, and would
// otherwise use up the one-time link before the person does.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <PageHeader title="Log in to Leadership Skills" />
      <Card>
        <form method="post" action="/auth/confirm">
          <input type="hidden" name="token" value={token ?? ""} />
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
      </Card>
    </main>
  );
}
