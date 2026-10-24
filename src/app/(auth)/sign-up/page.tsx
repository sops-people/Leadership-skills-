import Link from "next/link";
import { Button, Card, Field, Input, Notice, PageHeader } from "@/components/ui";
import { signUp } from "@/app/actions/auth";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader title="Create your account" intro="We'll email you a link to log in. No password needed." />
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <form action={signUp} className="space-y-4">
          <Field label="Your name">
            <Input name="name" autoComplete="name" required maxLength={100} />
          </Field>
          <Field label="Work email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Button type="submit" className="w-full">
            Email me a link
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/log-in" className="font-semibold text-brand">
          Log in
        </Link>
      </p>
    </>
  );
}
