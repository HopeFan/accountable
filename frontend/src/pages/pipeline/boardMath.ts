import { arrayMove } from "@dnd-kit/sortable";
import {
  OPEN_STAGES,
  STAGES,
  USUAL_PROBABILITY,
  type Deal,
  type Stage,
} from "../../lib/types";

export const COLLAPSED_LIMIT = 5;

export function expectedRevenue(
  stage: Stage,
  value: number,
  probability: number,
): number {
  if (stage === "won") return value;
  if (stage === "lost") return 0;
  return (value * probability) / 100;
}

export function isLate(
  stage: Stage,
  closeDate: string | null,
  today: string,
): boolean {
  return OPEN_STAGES.includes(stage) && closeDate !== null && closeDate < today;
}

export function column(deals: Deal[], stage: Stage): Deal[] {
  return deals
    .filter((d) => d.stage === stage)
    .sort((a, b) => a.position - b.position || a.id - b.id);
}

export function totals(deals: Deal[]): {
  count: number;
  value: number;
  expected: number;
} {
  return {
    count: deals.length,
    value: deals.reduce((s, d) => s + d.value, 0),
    expected: deals.reduce(
      (s, d) => s + expectedRevenue(d.stage, d.value, d.probability),
      0,
    ),
  };
}

/** Totals for the deals still open (Won and Lost don't count). */
export function openTotals(deals: Deal[]) {
  return totals(deals.filter((d) => OPEN_STAGES.includes(d.stage)));
}

/**
 * The deals after dropping `id` into `stage` at `position`, as the server will apply it:
 * positions stay 0..n-1, a new stage brings its usual probability, and Won or Lost sets the close date to today.
 */
export function applyMove(
  deals: Deal[],
  id: number,
  stage: Stage,
  position: number,
  today: string,
): Deal[] {
  const moving = deals.find((d) => d.id === id);
  if (!moving) return deals;
  const changedStage = moving.stage !== stage;
  const target = column(deals, stage).filter((d) => d.id !== id);
  const at = Math.max(0, Math.min(position, target.length));

  let moved: Deal = moving;
  if (changedStage) {
    const probability = USUAL_PROBABILITY[stage];
    const closeDate =
      stage === "won" || stage === "lost" ? today : moving.close_date;
    moved = {
      ...moving,
      stage,
      probability,
      close_date: closeDate,
      is_late: isLate(stage, closeDate, today),
      expected_revenue: expectedRevenue(stage, moving.value, probability),
    };
  }
  target.splice(at, 0, moved);
  const positions = new Map(target.map((d, i) => [d.id, i]));
  const source = changedStage
    ? column(deals, moving.stage).filter((d) => d.id !== id)
    : [];
  source.forEach((d, i) => positions.set(d.id, i));

  return deals.map((d) => {
    if (d.id === id) return { ...moved, position: positions.get(id)! };
    const p = positions.get(d.id);
    return p === undefined ? d : { ...d, position: p };
  });
}

export function columnIds(deals: Deal[]): Record<Stage, number[]> {
  return Object.fromEntries(
    STAGES.map((s) => [s, column(deals, s).map((d) => d.id)]),
  ) as Record<Stage, number[]>;
}

export type Columns = Record<Stage, number[]>;

export const isStage = (id: unknown): id is Stage =>
  typeof id === "string" && (STAGES as readonly string[]).includes(id);

/** The column holding `id`, or `id` itself when it is a column. */
export function containerOf(cols: Columns, id: unknown): Stage | undefined {
  return isStage(id) ? id : STAGES.find((s) => cols[s].includes(id as number));
}

/** Where a card lands when dragged over a column header or another card. */
function overIndex(
  cols: Columns,
  to: Stage,
  overId: unknown,
  below: boolean,
): number {
  const list = cols[to];
  if (!isStage(overId)) return list.indexOf(overId as number) + (below ? 1 : 0);
  return to === "won" || to === "lost"
    ? Math.min(list.length, COLLAPSED_LIMIT)
    : list.length;
}

/**
 * The columns while a card is dragged over `overId`: the card leaves its column and joins the one under it.
 * Returns the same object when nothing changes, so callers can tell.
 */
export function dragOverColumns(
  cols: Columns,
  activeId: number,
  overId: unknown,
  below: boolean,
): Columns {
  const from = containerOf(cols, activeId);
  const to = containerOf(cols, overId);
  if (!from || !to || from === to) return cols;
  const next = structuredClone(cols);
  next[from] = next[from].filter((id) => id !== activeId);
  const index = overIndex(next, to, overId, below);
  next[to].splice(Math.max(0, index), 0, activeId);
  return next;
}

/** The column and position a dropped card ends up at, or null when it can't be placed. */
export function dropPlacement(
  cols: Columns,
  activeId: number,
  overId: unknown,
): { stage: Stage; position: number } | null {
  const stage = containerOf(cols, activeId);
  if (!stage) return null;
  let list = cols[stage];
  if (
    !isStage(overId) &&
    containerOf(cols, overId) === stage &&
    overId !== activeId
  ) {
    list = arrayMove(
      list,
      list.indexOf(activeId),
      list.indexOf(overId as number),
    );
  }
  const position = list.indexOf(activeId);
  return position < 0 ? null : { stage, position };
}
