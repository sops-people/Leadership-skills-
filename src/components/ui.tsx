// Shared design components. Darko and Sops: build your screens from these so the
// whole app looks and behaves the same. They are server-component safe.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "bg-surface text-ink border border-line hover:bg-canvas",
  danger: "bg-danger text-white hover:opacity-90",
};

const buttonBase =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

const fieldBase =
  "mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${fieldBase} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-card border border-line bg-surface p-6 ${className}`}>{children}</div>;
}

export function PageHeader({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      {intro && <p className="mt-2 text-muted">{intro}</p>}
    </header>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-brand/30 bg-brand-soft text-ink",
    error: "border-danger/30 bg-danger/10 text-danger",
    success: "border-good/30 bg-good/10 text-good",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}
