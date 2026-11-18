import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Activity } from "../lib/types";
import { Timeline } from "./Timeline";

function activity(id: number, occurred_at: string, extra: Partial<Activity> = {}): Activity {
  return {
    id,
    type: "note",
    contact_id: null,
    deal_id: 1,
    description: "Entry " + id,
    occurred_at,
    follow_up_date: null,
    follow_up_done: false,
    follow_up_state: null,
    deal_name: "Big deal",
    contact_name: null,
    ...extra,
  };
}
const noop = vi.fn();
const render_ = (items: Activity[]) =>
  render(
    <MemoryRouter>
      <Timeline items={items} onEdit={noop} onDelete={noop} onToggleDone={noop} showLinks />
    </MemoryRouter>,
  );

describe("Timeline", () => {
  it("lists the newest first", () => {
    render_([
      activity(1, "2026-11-01T09:00:00"),
      activity(2, "2026-11-10T09:00:00"),
      activity(3, "2026-11-05T09:00:00"),
    ]);
    const texts = within(screen.getByRole("list", { name: "Timeline" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(texts[0]).toContain("Entry 2");
    expect(texts[1]).toContain("Entry 3");
    expect(texts[2]).toContain("Entry 1");
  });

  it("shows follow-ups as open, overdue and done", () => {
    render_([
      activity(1, "2026-11-01T09:00:00", { follow_up_date: "2026-11-20", follow_up_state: "open" }),
      activity(2, "2026-11-02T09:00:00", { follow_up_date: "2026-11-10", follow_up_state: "overdue" }),
      activity(3, "2026-11-03T09:00:00", { follow_up_date: "2026-11-05", follow_up_state: "done", follow_up_done: true }),
    ]);
    const states = Array.from(document.querySelectorAll("[data-state]")).map((el) => el.getAttribute("data-state"));
    expect(states).toEqual(["done", "overdue", "open"]);
    expect(screen.getByText(/Overdue:/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Mark done/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Reopen/ })).toBeInTheDocument();
  });

  it("gives stage-change entries a delete action only", () => {
    render_([
      activity(1, "2026-11-01T09:00:00", { type: "stage_change", description: "Moved from New to Qualified" }),
      activity(2, "2026-11-02T09:00:00", { type: "call" }),
    ]);
    expect(screen.getAllByRole("button", { name: /^Edit/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Edit call" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete stage change" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit stage change" })).not.toBeInTheDocument();
  });

  it("says so when there is nothing", () => {
    render_([]);
    expect(screen.getByText("Nothing logged yet.")).toBeInTheDocument();
  });
});
