import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { money } from "../../lib/format";
import { STAGE_LABEL, type Deal, type Stage } from "../../lib/types";
import { STAGE_STYLE, cx } from "../../components/ui";
import { COLLAPSED_LIMIT, totals } from "./boardMath";
import { DealCard } from "./DealCard";

export function Column({
  stage,
  deals,
  lookup,
  ids,
  highlight,
  onAdd,
}: {
  stage: Stage;
  /** All deals in this column, for the header figures. */
  deals: Deal[];
  /** Every deal by id, because a card being dragged in may come from another column. */
  lookup: Map<number, Deal>;
  /** The ids shown right now (they differ from `deals` while a card is being dragged). */
  ids: number[];
  highlight: boolean;
  onAdd: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage });
  const t = totals(deals);
  const collapsed = stage === "won" || stage === "lost";
  const shown = collapsed ? ids.slice(0, COLLAPSED_LIMIT) : ids;
  const hidden = ids.length - shown.length;

  return (
    <section
      aria-label={`${STAGE_LABEL[stage]} column`}
      data-stage={stage}
      className={cx("flex min-w-0 flex-col rounded-xl p-2.5 transition-colors", highlight ? "bg-primary/20" : "bg-lane")}
    >
      <header className="px-1 pb-3">
        <div className="flex items-center gap-2">
          <i className="size-2.5 rounded-[3px]" style={{ background: STAGE_STYLE[stage].dot }} aria-hidden />
          <h2 className="text-sm font-semibold">{STAGE_LABEL[stage]}</h2>
          <span className="ml-auto rounded-full bg-panel px-2 py-px text-xs font-semibold" data-testid="column-count">
            {t.count}
          </span>
        </div>
        <p className="mt-2 font-mono text-[15px] font-semibold" data-testid="column-value">
          {money(t.value)}
        </p>
        <p className="mt-0.5 flex justify-between text-[11.5px] whitespace-nowrap text-muted">
          Expected{" "}
          <b className="font-mono font-medium text-ink" data-testid="column-expected">
            {money(t.expected)}
          </b>
        </p>
      </header>
      <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2">
        <SortableContext items={shown} strategy={verticalListSortingStrategy}>
          {shown.map((id) => {
            const d = lookup.get(id);
            return d ? <DealCard key={id} deal={d} /> : null;
          })}
        </SortableContext>
        {hidden > 0 && <p className="pt-1 text-center text-xs text-muted">+ {hidden} earlier {STAGE_LABEL[stage].toLowerCase()} {hidden === 1 ? "deal" : "deals"}</p>}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold text-muted hover:bg-panel/70 hover:text-ink"
      >
        <Plus className="size-4" aria-hidden /> Add deal
        <span className="sr-only"> to {STAGE_LABEL[stage]}</span>
      </button>
    </section>
  );
}
