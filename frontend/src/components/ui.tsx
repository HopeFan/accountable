import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { STAGE_LABEL, STATUS_LABEL, type ContactStatus, type Stage } from "../lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
export const buttonClass = {
  primary: `${base} bg-primary text-ink hover:brightness-95 active:brightness-90`,
  secondary: `${base} bg-panel text-ink shadow-panel hover:bg-soft`,
  danger: `${base} bg-alert-text text-white hover:brightness-95 active:brightness-90`,
  ghost: `${base} text-ink hover:bg-soft`,
};

export function Button({
  variant = "primary",
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonClass; busy?: boolean }) {
  return (
    <button type="button" className={cx(buttonClass[variant], className)} disabled={busy || rest.disabled} {...rest}>
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Panel({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <section aria-label={label} className={cx("rounded-xl bg-panel p-6 shadow-panel", className)}>
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {subtitle && <div className="mb-1 text-[13px] text-muted">{subtitle}</div>}
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export const STAGE_STYLE: Record<Stage, { bg: string; fg: string; dot: string }> = {
  new: { bg: "bg-info-tint", fg: "text-info-text", dot: "var(--info)" },
  qualified: { bg: "bg-marigold-tint", fg: "text-marigold-text", dot: "var(--secondary)" },
  proposal: { bg: "bg-coral-tint", fg: "text-coral-text", dot: "var(--tertiary)" },
  negotiation: { bg: "bg-primary-tint", fg: "text-primary-text", dot: "var(--primary)" },
  won: { bg: "bg-ink", fg: "text-white", dot: "var(--ink)" },
  lost: { bg: "bg-mist", fg: "text-ink", dot: "var(--mist)" },
};

export function StageTag({ stage }: { stage: Stage }) {
  const s = STAGE_STYLE[stage];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.bg, s.fg)}>
      {STAGE_LABEL[stage]}
    </span>
  );
}

const STATUS_STYLE: Record<ContactStatus, string> = {
  lead: "bg-info-tint text-info-text",
  qualified: "bg-marigold-tint text-marigold-text",
  customer: "bg-primary-tint text-primary-text",
};
export function StatusTag({ status }: { status: ContactStatus }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LateTag() {
  return (
    <span className="inline-flex rounded-full bg-alert-tint px-2 py-px text-[11px] font-semibold text-alert-text">Late</span>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-muted" role="status">
      <p>{message}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Panel>
      <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-medium">{message ?? "Something went wrong loading this page."}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </Panel>
  );
}

export const inputClass =
  "h-10 w-full rounded-[10px] bg-page px-3 text-sm text-ink placeholder:text-muted ring-1 ring-mist focus-visible:outline-2 focus-visible:outline-info aria-[invalid=true]:ring-alert";

export function Field({
  label,
  required,
  error,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
        {required && (
          <span className="text-alert-text" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-alert-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
