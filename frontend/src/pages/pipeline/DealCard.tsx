import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { formatDateShort, money } from "../../lib/format";
import type { Deal } from "../../lib/types";
import { useHealth } from "../../lib/queries";
import { LateTag, cx } from "../../components/ui";

/** The card. When lifted it tilts; the tilt sits on an inner element so the drag library still measures an upright box. */
export function CardBody({ deal, lifted }: { deal: Deal; lifted?: boolean }) {
  const today = useHealth().data?.today ?? "";
  return (
    <div>
      <div
        className={cx(
          "rounded-[10px] bg-panel px-3 py-2.5 shadow-panel",
          lifted && "rotate-[1.5deg] shadow-[var(--shadow-lift)]",
        )}
      >
        <p className="text-[13px] leading-tight font-semibold">{deal.name}</p>
        <p className="mt-0.5 text-xs text-muted">{deal.organization_name}</p>
        <p className="mt-2 font-mono text-[13px] font-semibold">
          {money(deal.value)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
          <span className="rounded-full bg-soft px-2 py-px font-mono font-medium">
            {deal.probability}%
          </span>
          {deal.close_date && (
            <span
              className={cx(
                "font-mono",
                deal.is_late ? "font-semibold text-alert-text" : "text-muted",
              )}
            >
              {formatDateShort(deal.close_date, today)}
            </span>
          )}
          {deal.is_late && <LateTag />}
        </div>
      </div>
    </div>
  );
}

export function DealCard({ deal }: { deal: Deal }) {
  const nav = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${deal.name}, ${deal.organization_name}`}
      data-testid="deal-card"
      data-deal-id={deal.id}
      data-late={deal.is_late || undefined}
      onClick={() => nav(`/deals/${deal.id}`)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") nav(`/deals/${deal.id}`);
      }}
      className={cx(
        "cursor-grab touch-none rounded-[10px] active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <CardBody deal={deal} />
    </div>
  );
}
