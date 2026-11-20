import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { RecordDialog } from "../components/RecordDialog";
import { DealForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { Plus } from "lucide-react";
import {
  Button,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Panel,
} from "../components/ui";
import { money } from "../lib/format";
import { keys, useDeals, useHealth, useMoveDeal } from "../lib/queries";
import { STAGES, STAGE_LABEL, type Deal, type Stage } from "../lib/types";
import {
  applyMove,
  column,
  columnIds,
  containerOf,
  dragOverColumns,
  dropPlacement,
  openTotals,
  type Columns,
} from "./pipeline/boardMath";
import { Column } from "./pipeline/Column";
import { CardBody } from "./pipeline/DealCard";

/** The card under the pointer for the mouse, and the nearest one for the keyboard. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

export function Pipeline() {
  const q = useDeals();
  const health = useHealth();
  const qc = useQueryClient();
  const toast = useToast();
  const move = useMoveDeal();
  const [drag, setDrag] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [hover, setHover] = useState<Stage | null>(null);
  const [adding, setAdding] = useState<Stage | null>(null);

  // After a card changes column, ignore drag-over events until the layout has settled, so it can't bounce back and forth.
  const recentlyMoved = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      recentlyMoved.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [drag]);

  const deals = q.data;
  const resting = useMemo(() => (deals ? columnIds(deals) : null), [deals]);
  const cols = drag ?? resting;

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (q.isPending || !cols || !deals) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <PageSkeleton />
      </>
    );
  }

  const lookup = new Map(deals.map((d) => [d.id, d]));
  const open = openTotals(deals);
  const openCount = open.count;
  const active =
    activeId === null ? null : (deals.find((d) => d.id === activeId) ?? null);

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(Number(e.active.id));
    setDrag(structuredClone(resting!));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active: a, over } = e;
    if (!over || recentlyMoved.current) return;
    setHover(containerOf(drag ?? resting!, over.id) ?? null);
    const translated = a.rect.current.translated;
    const below =
      translated !== null &&
      translated.top > over.rect.top + over.rect.height / 2;
    setDrag((cur) => {
      if (!cur) return cur;
      const next = dragOverColumns(cur, Number(a.id), over.id, below);
      if (next !== cur) recentlyMoved.current = true;
      return next;
    });
  };

  const reset = () => {
    setDrag(null);
    setActiveId(null);
    setHover(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    const id = Number(a.id);
    const current = drag;
    reset();
    if (!over || !current) return;
    const placement = dropPlacement(current, id, over.id);
    if (!placement) return;
    const { stage, position } = placement;
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    const sameSpot =
      deal.stage === stage &&
      column(deals, stage).findIndex((d) => d.id === id) === position;
    if (sameSpot) return;

    const today = health.data?.today ?? new Date().toISOString().slice(0, 10);
    const snapshot = qc.getQueryData<Deal[]>(keys.deals);
    // Columns and totals change before the server answers.
    qc.setQueryData<Deal[]>(
      keys.deals,
      applyMove(deals, id, stage, position, today),
    );
    move.mutate(
      { id, stage, position },
      {
        onSuccess: () => {
          if (deal.stage !== stage)
            toast.success(
              `Moved from ${STAGE_LABEL[deal.stage]} to ${STAGE_LABEL[stage]}`,
            );
        },
        onError: (err) => {
          qc.setQueryData(keys.deals, snapshot);
          toast.error(`Couldn't move ${deal.name}: ${err.message}`);
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Pipeline"
        actions={
          <Button onClick={() => setAdding("new")}>
            <Plus className="size-4" aria-hidden /> Add deal
          </Button>
        }
      />
      <Panel className="mb-4 flex items-center gap-11 px-6 py-4">
        <Figure
          label="Open deals"
          value={String(openCount)}
          testid="open-count"
        />
        <Figure
          label="Total value"
          value={money(open.value)}
          testid="open-value"
        />
        <Figure
          label="Expected revenue"
          value={money(open.expected)}
          testid="open-expected"
        />
        <p className="ml-auto max-w-[300px] text-right text-[13px] text-muted">
          Drag a card to change its stage or its place. Won and Lost deals
          aren't counted.
        </p>
      </Panel>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={reset}
      >
        <div className="grid grid-cols-6 items-start gap-3">
          {STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              deals={column(deals, stage)}
              lookup={lookup}
              ids={cols[stage]}
              highlight={hover === stage && activeId !== null}
              onAdd={() => setAdding(stage)}
            />
          ))}
        </div>
        <DragOverlay>
          {active ? <CardBody deal={active} lifted /> : null}
        </DragOverlay>
      </DndContext>
      <RecordDialog
        open={adding !== null}
        onOpenChange={(o) => !o && setAdding(null)}
        title="Add deal"
      >
        {adding && (
          <DealForm
            stage={adding}
            onDone={() => setAdding(null)}
            onCancel={() => setAdding(null)}
          />
        )}
      </RecordDialog>
    </>
  );
}

function Figure({
  label,
  value,
  testid,
}: {
  label: string;
  value: string;
  testid: string;
}) {
  return (
    <div>
      <span className="block text-[12.5px] text-muted">{label}</span>
      <b
        className="font-mono text-[22px] font-semibold tracking-tight"
        data-testid={testid}
      >
        {value}
      </b>
    </div>
  );
}
