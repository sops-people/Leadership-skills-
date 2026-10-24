import Link from "next/link";
import { Button, Card, Field, Input, Notice, PageHeader } from "@/components/ui";
import { logIn } from "@/app/actions/auth";

export default async function LogInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader title="Log in" intro="Enter your email and we'll send you a link." />
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <form action={logIn} className="space-y-4">
          <Field label="Work email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Button type="submit" className="w-full">
            Email me a link
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-semibold text-brand">
          Create an account
        </Link>
      </p>
    </>
  );
}
