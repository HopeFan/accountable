import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../lib/format";
import { useToggleFollowUp } from "../lib/queries";
import type { Activity } from "../lib/types";
import { useToast } from "./Toast";
import { cx } from "./ui";

export function FollowUpList({ items }: { items: Activity[] }) {
  const toggle = useToggleFollowUp();
  const toast = useToast();
  const overdue = items.filter((i) => i.follow_up_state === "overdue");
  const upcoming = items.filter((i) => i.follow_up_state !== "overdue");

  if (items.length === 0)
    return <p className="py-6 text-center text-muted">No open follow-ups.</p>;

  const row = (a: Activity) => {
    const link = a.deal_id
      ? { to: `/deals/${a.deal_id}`, text: a.deal_name }
      : a.contact_id
        ? { to: `/contacts/${a.contact_id}`, text: a.contact_name }
        : null;
    const late = a.follow_up_state === "overdue";
    return (
      <li
        key={a.id}
        className="grid grid-cols-[20px_1fr] items-start gap-3 py-2.5"
      >
        <Checkbox.Root
          checked={false}
          aria-label={`Mark done: ${a.description}`}
          onCheckedChange={() =>
            toggle.mutate(
              { id: a.id, done: true },
              { onSuccess: () => toast.success("Follow-up marked done") },
            )
          }
          className="mt-0.5 grid size-[18px] place-items-center rounded-[5px] border-2 border-[#9DB5BE] bg-panel hover:border-ink data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        >
          <Checkbox.Indicator>
            <Check className="size-3" aria-hidden />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <div className="min-w-0">
          <p
            className="line-clamp-2 text-sm font-semibold break-words"
            title={a.description}
          >
            {a.description}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cx(
                "rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap",
                late ? "bg-alert-tint text-alert-text" : "bg-soft text-ink",
              )}
            >
              {late && "Overdue · "}
              {formatDate(a.follow_up_date)}
            </span>
            {link && (
              <Link
                to={link.to}
                className="text-[12.5px] font-semibold text-info-text hover:underline"
              >
                {link.text}
              </Link>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div>
      {overdue.length > 0 && (
        <>
          <h3 className="mt-1 mb-1 text-[11px] font-semibold tracking-wider text-alert-text uppercase">
            Overdue
          </h3>
          <ul>{overdue.map(row)}</ul>
        </>
      )}
      {upcoming.length > 0 && (
        <>
          <h3 className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
            Upcoming
          </h3>
          <ul>{upcoming.map(row)}</ul>
        </>
      )}
    </div>
  );
}
