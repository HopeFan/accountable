import {
  ArrowRightLeft,
  Check,
  FileText,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, formatDateTime } from "../lib/format";
import type { Activity, ActivityType } from "../lib/types";
import { cx } from "./ui";

export const ACTIVITY_ICON: Record<
  ActivityType,
  { icon: typeof Phone; style: string; label: string }
> = {
  call: { icon: Phone, style: "bg-info-tint text-info-text", label: "Call" },
  email: {
    icon: Mail,
    style: "bg-marigold-tint text-marigold-text",
    label: "Email",
  },
  note: { icon: FileText, style: "bg-soft text-ink", label: "Note" },
  stage_change: {
    icon: ArrowRightLeft,
    style: "bg-primary-tint text-primary-text",
    label: "Stage change",
  },
};

export function ActivityIcon({
  type,
  size = 34,
}: {
  type: ActivityType;
  size?: number;
}) {
  const { icon: Icon, style, label } = ACTIVITY_ICON[type];
  return (
    <span
      className={cx("grid shrink-0 place-items-center rounded-full", style)}
      style={{ width: size, height: size }}
      title={label}
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

const STATE_LABEL = {
  open: "Follow-up",
  overdue: "Overdue",
  done: "Done",
} as const;

export function FollowUpChip({ activity }: { activity: Activity }) {
  const state = activity.follow_up_state;
  if (!state || !activity.follow_up_date) return null;
  const style =
    state === "overdue"
      ? "bg-alert-tint text-alert-text"
      : state === "done"
        ? "bg-primary-tint text-primary-text"
        : "bg-soft text-ink";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        style,
      )}
      data-state={state}
    >
      {state === "done" && <Check className="size-3" aria-hidden />}
      {STATE_LABEL[state]}:{" "}
      <span className="font-mono font-medium">
        {formatDate(activity.follow_up_date)}
      </span>
    </span>
  );
}

/** "Added by name@example.com" in small print; "Sample data" without an author. */
export function AddedBy({ email }: { email: string | null }) {
  if (!email) return <span>Sample data</span>;
  return (
    <span>
      Added by <span className="font-mono">{email}</span>
    </span>
  );
}

export function Timeline({
  items,
  onEdit,
  onDelete,
  onToggleDone,
  showLinks,
}: {
  items: Activity[];
  onEdit?: (a: Activity) => void;
  onDelete?: (a: Activity) => void;
  onToggleDone?: (a: Activity, done: boolean) => void;
  showLinks?: boolean;
}) {
  const sorted = [...items].sort(
    (a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.id - a.id,
  );
  if (sorted.length === 0)
    return <p className="py-6 text-center text-muted">Nothing logged yet.</p>;
  return (
    <ol className="flex flex-col" aria-label="Timeline">
      {sorted.map((a) => (
        <li
          key={a.id}
          className="grid grid-cols-[34px_1fr_auto] items-start gap-3 py-3"
          data-type={a.type}
        >
          <ActivityIcon type={a.type} />
          <div className="min-w-0">
            <p className="font-medium break-words whitespace-pre-wrap">
              {a.description}
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              <span className="font-mono">{formatDateTime(a.occurred_at)}</span>
              {" · "}
              <AddedBy email={a.created_by} />
              {showLinks && a.deal_id && a.deal_name && (
                <>
                  {" · "}
                  <Link
                    to={`/deals/${a.deal_id}`}
                    className="font-semibold text-info-text hover:underline"
                  >
                    {a.deal_name}
                  </Link>
                </>
              )}
            </p>
            {a.follow_up_state && (
              <div className="mt-2 flex items-center gap-2">
                <FollowUpChip activity={a} />
                {onToggleDone && (
                  <button
                    type="button"
                    onClick={() => onToggleDone(a, !a.follow_up_done)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-info-text hover:bg-info-tint"
                  >
                    {a.follow_up_done ? (
                      <>
                        <RotateCcw className="size-3" aria-hidden /> Reopen
                      </>
                    ) : (
                      <>
                        <Check className="size-3" aria-hidden /> Mark done
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-0.5">
            {onEdit && a.type !== "stage_change" && (
              <button
                type="button"
                aria-label={`Edit ${ACTIVITY_ICON[a.type].label.toLowerCase()}`}
                onClick={() => onEdit(a)}
                className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label={`Delete ${ACTIVITY_ICON[a.type].label.toLowerCase()}`}
                onClick={() => onDelete(a)}
                className="rounded-lg p-1.5 text-muted hover:bg-alert-tint hover:text-alert-text"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
