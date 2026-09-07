import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning" | "critical";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "bg-white border-ink-100",
    accent: "bg-accent-50 border-accent-100",
    warning: "bg-amber-50 border-amber-100",
    critical: "bg-rose-50 border-rose-100",
  };
  const valueTones: Record<string, string> = {
    default: "text-ink-900",
    accent: "text-accent-700",
    warning: "text-amber-700",
    critical: "text-rose-700",
  };
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 text-3xl font-extrabold ${valueTones[tone]}`}>{value}</p>
    </div>
  );
}

const badgeTones: Record<string, string> = {
  valid: "bg-accent-50 text-accent-700",
  active: "bg-accent-50 text-accent-700",
  present: "bg-accent-50 text-accent-700",
  approved: "bg-accent-50 text-accent-700",
  completed: "bg-accent-50 text-accent-700",
  published: "bg-accent-50 text-accent-700",
  expiring: "bg-amber-50 text-amber-700",
  pending: "bg-amber-50 text-amber-700",
  draft: "bg-amber-50 text-amber-700",
  processing: "bg-amber-50 text-amber-700",
  late: "bg-amber-50 text-amber-700",
  on_leave: "bg-amber-50 text-amber-700",
  unpublished: "bg-amber-50 text-amber-700",
  expired: "bg-rose-50 text-rose-700",
  absent: "bg-rose-50 text-rose-700",
  declined: "bg-rose-50 text-rose-700",
  offboarded: "bg-ink-100 text-ink-500",
  info: "bg-brand-50 text-brand-700",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-rose-50 text-rose-700",
};

export function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  const cls = badgeTones[tone] ?? "bg-ink-100 text-ink-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>
      {String(children).replace(/_/g, " ")}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ink-100 bg-white ${className}`}>{children}</div>;
}
