import { describe, expect, it } from "vitest";
import type { Deal, Stage } from "../../lib/types";
import {
  applyMove,
  column,
  columnIds,
  expectedRevenue,
  isLate,
  openTotals,
  totals,
} from "./boardMath";

const TODAY = "2026-11-17";
let nextId = 1;
function deal(
  stage: Stage,
  position: number,
  value: number,
  probability: number,
  extra: Partial<Deal> = {},
): Deal {
  return {
    id: nextId++,
    name: "Deal " + nextId,
    organization_id: 1,
    organization_name: "Acme",
    contact_id: null,
    contact_name: null,
    stage,
    value,
    probability,
    close_date: "2026-12-01",
    position,
    is_late: false,
    expected_revenue: expectedRevenue(stage, value, probability),
    ...extra,
  };
}

function board() {
  nextId = 1;
  return [
    deal("new", 0, 1000, 5), // 1
    deal("new", 1, 2000, 5), // 2
    deal("new", 2, 3000, 5), // 3
    deal("proposal", 0, 10000, 40), // 4
    deal("won", 0, 5000, 100), // 5
    deal("lost", 0, 7000, 0), // 6
  ];
}

describe("totals", () => {
  it("adds value and expected revenue", () => {
    const t = totals(board().filter((d) => d.stage === "new"));
    expect(t).toEqual({ count: 3, value: 6000, expected: 300 });
  });
  it("leaves Won and Lost out of the open totals", () => {
    expect(openTotals(board())).toEqual({
      count: 4,
      value: 16000,
      expected: 4300,
    });
  });
  it("counts a won deal at its full value and a lost deal at nothing", () => {
    expect(expectedRevenue("won", 5000, 100)).toBe(5000);
    expect(expectedRevenue("lost", 5000, 50)).toBe(0);
  });
});

describe("moving a card", () => {
  it("changes the open totals when a deal moves to another open column", () => {
    const moved = applyMove(board(), 1, "proposal", 0, TODAY);
    expect(totals(column(moved, "new"))).toEqual({
      count: 2,
      value: 5000,
      expected: 250,
    });
    expect(totals(column(moved, "proposal"))).toEqual({
      count: 2,
      value: 11000,
      expected: 4000 + 400,
    });
    expect(openTotals(moved).count).toBe(4);
  });

  it("takes the new stage's probability", () => {
    const moved = applyMove(board(), 1, "negotiation", 0, TODAY);
    expect(moved.find((d) => d.id === 1)).toMatchObject({
      stage: "negotiation",
      probability: 70,
    });
  });

  it("drops a deal into the middle, first and last place of a column", () => {
    const middle = applyMove(board(), 4, "new", 1, TODAY);
    expect(columnIds(middle).new).toEqual([1, 4, 2, 3]);
    const first = applyMove(board(), 4, "new", 0, TODAY);
    expect(columnIds(first).new).toEqual([4, 1, 2, 3]);
    const last = applyMove(board(), 4, "new", 99, TODAY);
    expect(columnIds(last).new).toEqual([1, 2, 3, 4]);
  });

  it("keeps positions at 0 to n-1 in both columns", () => {
    const moved = applyMove(board(), 2, "proposal", 1, TODAY);
    for (const stage of ["new", "proposal"] as Stage[]) {
      expect(column(moved, stage).map((d) => d.position)).toEqual(
        column(moved, stage).map((_, i) => i),
      );
    }
    expect(columnIds(moved).new).toEqual([1, 3]);
    expect(columnIds(moved).proposal).toEqual([4, 2]);
  });

  it("reorders within a column", () => {
    const moved = applyMove(board(), 3, "new", 0, TODAY);
    expect(columnIds(moved).new).toEqual([3, 1, 2]);
    expect(moved.find((d) => d.id === 3)!.probability).toBe(5);
    const down = applyMove(board(), 1, "new", 2, TODAY);
    expect(columnIds(down).new).toEqual([2, 3, 1]);
  });

  it("does not change the list it was given", () => {
    const original = board();
    const copy = JSON.stringify(original);
    applyMove(original, 1, "won", 0, TODAY);
    expect(JSON.stringify(original)).toBe(copy);
  });
});

describe("late flag", () => {
  it("applies to open deals with a past close date only", () => {
    expect(isLate("new", "2026-11-16", TODAY)).toBe(true);
    expect(isLate("new", "2026-11-17", TODAY)).toBe(false);
    expect(isLate("won", "2026-01-01", TODAY)).toBe(false);
    expect(isLate("new", null, TODAY)).toBe(false);
  });

  it("clears after moving a late deal to Won or Lost, and the close date becomes today", () => {
    const late = [
      deal("proposal", 0, 9000, 40, {
        close_date: "2026-10-01",
        is_late: true,
      }),
    ];
    const won = applyMove(late, late[0].id, "won", 0, TODAY);
    expect(won[0]).toMatchObject({
      is_late: false,
      close_date: TODAY,
      probability: 100,
      expected_revenue: 9000,
    });
    const lost = applyMove(late, late[0].id, "lost", 0, TODAY);
    expect(lost[0]).toMatchObject({
      is_late: false,
      close_date: TODAY,
      probability: 0,
      expected_revenue: 0,
    });
  });

  it("keeps a late deal late while it stays open", () => {
    const late = [
      deal("proposal", 0, 9000, 40, {
        close_date: "2026-10-01",
        is_late: true,
      }),
    ];
    expect(
      applyMove(late, late[0].id, "negotiation", 0, TODAY)[0].is_late,
    ).toBe(true);
  });
});
