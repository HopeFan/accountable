import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STAGES } from "../lib/types";
import { fakeBackend, renderApp } from "../test/fakeApi";

const COLUMN_WIDTH = 200;
const CARD_HEIGHT = 80;

/** jsdom has no layout, so give each column and card a box: columns side by side, cards stacked inside. */
function stubLayout() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const section = this.closest("[data-stage]");
      const column = section
        ? STAGES.indexOf(section.getAttribute("data-stage") as never)
        : 0;
      const card = this.closest("[data-deal-id]");
      const index = card
        ? [...(section?.querySelectorAll("[data-deal-id]") ?? [])].indexOf(card)
        : -1;
      const isCard = this === card;
      const top = isCard ? 100 + index * CARD_HEIGHT : 0;
      const height = isCard ? CARD_HEIGHT : section === this ? 800 : 0;
      const left = column * COLUMN_WIDTH;
      return {
        x: left,
        y: top,
        left,
        top,
        width: COLUMN_WIDTH,
        height,
        right: left + COLUMN_WIDTH,
        bottom: top + height,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
}

function dragTo(card: HTMLElement, x: number, y: number) {
  fireEvent.pointerDown(card, {
    button: 0,
    clientX: 10,
    clientY: 110,
    isPrimary: true,
    pointerId: 1,
  });
  fireEvent.pointerMove(document, {
    clientX: x,
    clientY: y,
    isPrimary: true,
    pointerId: 1,
  });
  fireEvent.pointerMove(document, {
    clientX: x + 1,
    clientY: y + 1,
    isPrimary: true,
    pointerId: 1,
  });
  fireEvent.pointerUp(document, {
    clientX: x + 1,
    clientY: y + 1,
    isPrimary: true,
    pointerId: 1,
  });
}

const moves = (calls: ReturnType<typeof fakeBackend>) =>
  calls.filter((c) => c.method === "POST" && c.path.endsWith("/move"));

describe("dragging a card", () => {
  beforeEach(stubLayout);
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("moves the deal to the column it is dropped on and says so", async () => {
    const calls = fakeBackend();
    renderApp("/pipeline");
    const card = await screen.findByRole("button", {
      name: /Platform rollout/,
    });
    dragTo(card, 2 * COLUMN_WIDTH + 100, 200);
    await waitFor(() => expect(moves(calls)).toHaveLength(1));
    expect(moves(calls)[0].body).toMatchObject({ stage: "proposal" });
    expect(
      await screen.findByText("Moved from New to Proposal"),
    ).toBeInTheDocument();
  });

  it("moves a deal to Won", async () => {
    const calls = fakeBackend();
    renderApp("/pipeline");
    const card = await screen.findByRole("button", {
      name: /Platform rollout/,
    });
    dragTo(card, 4 * COLUMN_WIDTH + 100, 200);
    await waitFor(() => expect(moves(calls)).toHaveLength(1));
    expect(moves(calls)[0].body).toMatchObject({ stage: "won" });
  });

  it("does nothing when a card is dropped where it already was", async () => {
    const calls = fakeBackend();
    renderApp("/pipeline");
    const card = await screen.findByRole("button", {
      name: /Platform rollout/,
    });
    dragTo(card, 20, 120);
    await new Promise((r) => setTimeout(r, 50));
    expect(moves(calls)).toHaveLength(0);
  });

  it("puts the card back and says why when the server refuses the move", async () => {
    const calls = fakeBackend(
      new Response(JSON.stringify({ detail: "Not allowed" }), { status: 409 }),
    );
    renderApp("/pipeline");
    const card = await screen.findByRole("button", {
      name: /Platform rollout/,
    });
    dragTo(card, 2 * COLUMN_WIDTH + 100, 200);
    expect(
      await screen.findByText(/Couldn't move Platform rollout/),
    ).toBeInTheDocument();
    expect(moves(calls)).toHaveLength(1);
    const newColumn = screen.getByRole("region", { name: "New column" });
    expect(newColumn).toHaveTextContent("Platform rollout");
  });
});
