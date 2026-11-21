import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResults } from "../lib/search";
import { SearchBox } from "./SearchBox";

const FULL: SearchResults = {
  organizations: [{ id: 1, name: "Acme", context: "Software" }],
  contacts: [{ id: 2, name: "Ada Lovelace", context: "Acme" }],
  deals: [{ id: 3, name: "Acme rollout", context: "Acme, Proposal" }],
};
const NONE: SearchResults = { organizations: [], contacts: [], deals: [] };

let fetchMock: ReturnType<typeof vi.fn>;
const answer = (r: SearchResults) =>
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(r)));

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <SearchBox />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return screen.getByRole("combobox");
}

const type = async (box: HTMLElement, value: string, settle = true) => {
  fireEvent.change(box, { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
  if (settle)
    await screen.findAllByText(/Acme|No results/, {}, { timeout: 1000 });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SearchBox", () => {
  it("has the placeholder and shows nothing for an empty box", async () => {
    const box = setup();
    expect(box).toHaveAttribute(
      "placeholder",
      "Search organizations, contacts and deals",
    );
    await type(box, "   ", false);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one request after typing stops, not one per keystroke", async () => {
    answer(FULL);
    const box = setup();
    for (const v of ["a", "ac", "acm"]) {
      fireEvent.change(box, { target: { value: v } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/search?q=acm");
  });

  it("lists groups in order with combobox and option roles", async () => {
    answer(FULL);
    const box = setup();
    await type(box, "acme");
    expect(screen.getAllByRole("group").map((g) => g.textContent)).toEqual([
      "OrganizationsAcmeSoftware",
      "ContactsAda LovelaceAcme",
      "DealsAcme rolloutAcme, Proposal",
    ]);
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(box).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves out empty groups", async () => {
    answer({ ...NONE, deals: FULL.deals });
    await type(setup(), "acme");
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getByText("Deals")).toBeVisible();
    expect(screen.queryByText("Contacts")).toBeNull();
  });

  it("says when there are no results", async () => {
    answer(NONE);
    await type(setup(), "zzz");
    expect(screen.getByText("No results for zzz")).toBeVisible();
  });

  it("moves through options across groups with the arrows and opens one with Enter", async () => {
    answer(FULL);
    const box = setup();
    await type(box, "acme");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    const [, contact] = screen.getAllByRole("option");
    expect(contact).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveAttribute("aria-activedescendant", contact.id);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowUp" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("where")).toHaveTextContent("/contacts/2");
    expect(box).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens a clicked result, clears the box and closes", async () => {
    answer(FULL);
    const box = setup();
    await type(box, "acme");
    fireEvent.click(screen.getByRole("option", { name: /Acme rollout/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/deals/3");
    expect(box).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on Escape", async () => {
    answer(FULL);
    const box = setup();
    await type(box, "acme");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(box).toHaveAttribute("aria-expanded", "false");
  });
});
