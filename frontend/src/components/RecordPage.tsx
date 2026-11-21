import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { authorName } from "../lib/format";
import type { Authored } from "../lib/types";
import { Button, Panel, cx } from "./ui";

export function RecordHeader({
  title,
  tags,
  subtitle,
  onEdit,
  onDelete,
}: {
  title: string;
  tags?: ReactNode;
  subtitle?: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {subtitle && (
          <div className="mb-1 text-[13px] text-muted">{subtitle}</div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            {title}
          </h1>
          {tags}
        </div>
      </div>
      <div className="flex shrink-0 gap-2.5">
        <Button variant="secondary" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden /> Edit
        </Button>
        <Button
          variant="secondary"
          onClick={onDelete}
          className="text-alert-text"
        >
          <Trash2 className="size-4" aria-hidden /> Delete
        </Button>
      </div>
    </div>
  );
}

function Author({ email }: { email: string | null }) {
  return (
    <span className={cx("text-[13px] text-muted", email && "font-mono")}>
      {authorName(email)}
    </span>
  );
}

export function Details({
  rows,
  author,
}: {
  rows: [string, ReactNode][];
  author: Authored;
}) {
  const all: [string, ReactNode][] = [
    ...rows,
    ["Added by", <Author key="by" email={author.created_by} />],
    ["Last changed by", <Author key="up" email={author.updated_by} />],
  ];
  return (
    <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-3">
      {all.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-[13px] text-muted">{label}</dt>
          <dd className="min-w-0 break-words">
            {value || <span className="text-muted">None</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LinkedPanel({
  title,
  action,
  empty,
  children,
  isEmpty,
  className,
}: {
  title: string;
  action?: ReactNode;
  empty: string;
  isEmpty: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel label={title} className={cx("p-0", className)}>
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {isEmpty ? (
        <p className="px-6 pb-6 text-muted">{empty}</p>
      ) : (
        <div className="pb-2">{children}</div>
      )}
    </Panel>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-info-text hover:underline">
      {label}
    </Link>
  );
}
