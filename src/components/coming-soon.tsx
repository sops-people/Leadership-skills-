import { ButtonLink, Card, PageHeader } from "./ui";

/** Placeholder until the owning task replaces the page. */
export function ComingSoon({ title, owner, task }: { title: string; owner: string; task: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <p className="text-muted">
          This screen is part of {task}, which {owner} is building. It will appear here.
        </p>
        <ButtonLink href="/home" variant="secondary" className="mt-6">
          Back to home
        </ButtonLink>
      </Card>
    </>
  );
}
