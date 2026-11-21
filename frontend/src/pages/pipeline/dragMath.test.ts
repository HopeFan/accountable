import { describe, expect, it } from "vitest";
import {
  containerOf,
  dragOverColumns,
  dropPlacement,
  type Columns,
} from "./boardMath";

const board = (): Columns => ({
  new: [1, 2],
  qualified: [3],
  proposal: [],
  negotiation: [],
  won: [4, 5, 6, 7, 8, 9, 10],
  lost: [],
});

describe("containerOf", () => {
  it("finds the column of a card, and treats a column id as itself", () => {
    expect(containerOf(board(), 3)).toBe("qualified");
    expect(containerOf(board(), "proposal")).toBe("proposal");
    expect(containerOf(board(), 99)).toBeUndefined();
  });
});

describe("dragOverColumns", () => {
  it("moves a card to the end of an empty or open column when over its header", () => {
    const next = dragOverColumns(board(), 1, "qualified", false);
    expect(next.new).toEqual([2]);
    expect(next.qualified).toEqual([3, 1]);
  });

  it("puts the card before or after the card it is over", () => {
    expect(dragOverColumns(board(), 1, 3, false).qualified).toEqual([1, 3]);
    expect(dragOverColumns(board(), 1, 3, true).qualified).toEqual([3, 1]);
  });

  it("stops at the visible cards when dropped on Won", () => {
    expect(dragOverColumns(board(), 1, "won", false).won).toEqual([
      4, 5, 6, 7, 8, 1, 9, 10,
    ]);
  });

  it("does not touch the original columns", () => {
    const before = board();
    dragOverColumns(before, 1, "qualified", false);
    expect(before).toEqual(board());
  });

  it("returns the same columns when nothing moves", () => {
    const cols = board();
    expect(dragOverColumns(cols, 1, 2, false)).toBe(cols);
    expect(dragOverColumns(cols, 1, "new", false)).toBe(cols);
    expect(dragOverColumns(cols, 1, 99, false)).toBe(cols);
    expect(dragOverColumns(cols, 99, "new", false)).toBe(cols);
  });
});

describe("dropPlacement", () => {
  it("places a card at its position in the column it is in", () => {
    expect(dropPlacement(board(), 3, "qualified")).toEqual({
      stage: "qualified",
      position: 0,
    });
  });

  it("reorders within a column when dropped on another card", () => {
    expect(dropPlacement(board(), 1, 2)).toEqual({
      stage: "new",
      position: 1,
    });
  });

  it("ignores a drop on the card itself", () => {
    expect(dropPlacement(board(), 2, 2)).toEqual({
      stage: "new",
      position: 1,
    });
  });

  it("returns null for a card that is not on the board", () => {
    expect(dropPlacement(board(), 99, "new")).toBeNull();
  });
});
