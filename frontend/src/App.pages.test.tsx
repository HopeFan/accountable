import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deals, fakeBackend, renderApp } from "./test/fakeApi";

afterEach(() => vi.unstubAllGlobals());

const patches = (calls: ReturnType<typeof fakeBackend>) =>
  calls.filter((c) => c.method === "PATCH");
const posts = (calls: ReturnType<typeof fakeBackend>) =>
  calls.filter((c) => c.method === "POST");

describe.each([
  ["/organizations/1", "/organizations/1"],
  ["/contacts/1", "/contacts/1"],
  ["/deals/1", "/deals/1"],
])("editing from the page at %s", (path, endpoint) => {
  it("saves the changes", async () => {
    const calls = fakeBackend();
    renderApp(path);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0].path).toBe(endpoint);
  });

  it("closes the dialog on cancel without saving", async () => {
    const calls = fakeBackend();
    renderApp(path);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(patches(calls)).toHaveLength(0);
  });
});

describe("organization page", () => {
  it("adds a contact and a deal for the organization", async () => {
    const calls = fakeBackend();
    renderApp("/organizations/1");
    const [addContact] = await screen.findAllByRole("button", {
      name: /add contact/i,
    });
    await userEvent.click(addContact);
    await userEvent.type(screen.getByLabelText(/First name/), "Linus");
    await userEvent.type(screen.getByLabelText(/Last name/), "T");
    await userEvent.click(
      screen.getByRole("button", { name: /^Add contact$/ }),
    );
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0].body).toMatchObject({ organization_id: 1 });

    await userEvent.click(
      await screen.findByRole("button", { name: /add deal/i }),
    );
    await userEvent.type(screen.getByLabelText(/^Name/), "Fresh");
    await userEvent.click(screen.getByRole("button", { name: /^Add deal$/ }));
    await waitFor(() => expect(posts(calls)).toHaveLength(2));
    expect(posts(calls)[1].body).toMatchObject({
      name: "Fresh",
      organization_id: 1,
    });
  });
});

describe("contact page", () => {
  it("adds a deal for the contact", async () => {
    const calls = fakeBackend();
    renderApp("/contacts/1");
    await userEvent.click(
      await screen.findByRole("button", { name: /add deal/i }),
    );
    await userEvent.type(screen.getByLabelText(/^Name/), "Spin-off");
    await userEvent.click(screen.getByRole("button", { name: /^Add deal$/ }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0].body).toMatchObject({
      name: "Spin-off",
      contact_id: 1,
    });
  });

  it("edits an activity on the timeline", async () => {
    const calls = fakeBackend();
    renderApp("/contacts/1");
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit note" }),
    );
    const text = await screen.findByLabelText(/What happened/);
    expect(text).toHaveValue("Intro chat");
    await userEvent.type(text, " again");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0]).toMatchObject({
      path: "/activities/1",
      body: { description: "Intro chat again" },
    });
  });

  it("marks a timeline follow-up done", async () => {
    const calls = fakeBackend();
    renderApp("/contacts/1");
    await userEvent.click(
      await screen.findByRole("button", { name: /Mark done/ }),
    );
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0].body).toEqual({ follow_up_done: true });
    expect(
      await screen.findByText("Follow-up marked done"),
    ).toBeInTheDocument();
  });
});

describe("pipeline", () => {
  it("shows the open totals and the columns", async () => {
    fakeBackend();
    renderApp("/pipeline");
    expect(await screen.findByTestId("open-count")).toHaveTextContent("2");
    for (const stage of ["New", "Qualified", "Won"])
      expect(
        screen.getByRole("region", { name: `${stage} column` }),
      ).toBeInTheDocument();
  });

  it("adds a deal straight into the chosen column", async () => {
    const calls = fakeBackend();
    renderApp("/pipeline");
    await screen.findByTestId("open-count");
    await userEvent.click(
      within(screen.getByRole("region", { name: "Proposal column" })).getByRole(
        "button",
        { name: /add deal/i },
      ),
    );
    expect(await screen.findByLabelText("Stage")).toHaveValue("proposal");
    await userEvent.type(screen.getByLabelText(/^Name/), "Column deal");
    await userEvent.selectOptions(screen.getByLabelText(/Organization/), "1");
    await userEvent.click(screen.getByRole("button", { name: /^Add deal$/ }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0].body).toMatchObject({ stage: "proposal" });
  });
});

describe("pipeline cards and columns", () => {
  it("opens a deal from its card with the Enter key", async () => {
    fakeBackend();
    renderApp("/pipeline");
    const card = await screen.findByRole("button", {
      name: /Platform rollout/,
    });
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: "Platform rollout" }),
    ).toBeInTheDocument();
  });

  it("shows only the latest Won deals and counts the earlier ones", async () => {
    const won = Array.from({ length: 7 }, (_, i) => ({
      ...deals[0],
      id: 100 + i,
      name: `Won ${i}`,
      stage: "won" as const,
      position: i,
    }));
    fakeBackend(undefined, won);
    renderApp("/pipeline");
    expect(
      await screen.findByText("+ 2 earlier won deals"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("deal-card")).toHaveLength(5);
  });

  it("says 'deal' for a single earlier Lost deal", async () => {
    const lost = Array.from({ length: 6 }, (_, i) => ({
      ...deals[0],
      id: 200 + i,
      name: `Lost ${i}`,
      stage: "lost" as const,
      position: i,
    }));
    fakeBackend(undefined, lost);
    renderApp("/pipeline");
    expect(
      await screen.findByText("+ 1 earlier lost deal"),
    ).toBeInTheDocument();
  });
});

describe("tables", () => {
  it("filters rows with the search box", async () => {
    fakeBackend();
    renderApp("/deals");
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Search deals" }),
      "Support",
    );
    expect(screen.getByText("Support plan")).toBeInTheDocument();
    expect(screen.queryByText("Platform rollout")).not.toBeInTheDocument();
  });
});

describe("missing records", () => {
  it.each(["/organizations/9", "/contacts/9", "/deals/9"])(
    "says %s doesn't exist",
    async (path) => {
      fakeBackend();
      renderApp(path);
      expect(
        await screen.findByRole("heading", { name: "Not found" }),
      ).toBeInTheDocument();
    },
  );

  it.each([
    "/organizations",
    "/contacts",
    "/deals",
    "/pipeline",
    "/organizations/1",
    "/contacts/1",
    "/deals/1",
    "/",
  ])("offers to retry %s when the server fails", async (path) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"detail":"boom"}', { status: 500 })),
    );
    renderApp(path);
    await userEvent.click(
      await screen.findByRole("button", { name: /try again|retry/i }),
    );
  });
});

describe("empty data", () => {
  it.each([
    ["/organizations", /add organization/i],
    ["/contacts", /add contact/i],
    ["/deals", /add deal/i],
  ])("%s invites adding the first record", async (path, button) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]")),
    );
    renderApp(path);
    expect(
      (await screen.findAllByRole("button", { name: button })).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows an organization with no contacts or deals", async () => {
    fakeBackend();
    const real = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url) !== "/api/organizations/1") return real(url, init);
      return new Response(
        JSON.stringify({
          id: 1,
          name: "Solo Ltd",
          website: null,
          industry: null,
          notes: null,
          contacts_count: 0,
          open_deals_count: 0,
          open_deals_value: 0,
          contacts: [],
          deals: [],
          today: "2026-11-17",
        }),
      );
    });
    renderApp("/organizations/1");
    expect(
      await screen.findByText("No contacts at this organization yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No deals with this organization yet."),
    ).toBeInTheDocument();
  });
});

describe("server refusals", () => {
  it("shows a field error next to the field and keeps the dialog open", async () => {
    fakeBackend(
      new Response(
        JSON.stringify({
          detail: [{ field: "name", message: "Name is taken" }],
        }),
        { status: 422 },
      ),
    );
    renderApp("/organizations");
    await userEvent.click(
      await screen.findByRole("button", { name: /add organization/i }),
    );
    await userEvent.type(screen.getByLabelText(/^Name/), "Acme Corp");
    await userEvent.click(
      screen.getByRole("button", { name: "Add organization" }),
    );
    expect(await screen.findByText("Name is taken")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each([
    ["/organizations", "Acme Corp"],
    ["/contacts", "Ada Lovelace"],
    ["/deals", "Platform rollout"],
  ])("tells the person when deleting from %s fails", async (path, name) => {
    fakeBackend(
      new Response(JSON.stringify({ detail: "Still in use" }), { status: 409 }),
    );
    renderApp(path);
    await userEvent.click(
      await screen.findByRole("button", { name: `Actions for ${name}` }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /delete/i }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Delete" }),
    );
    expect(await screen.findByText("Still in use")).toBeInTheDocument();
  });

  it.each([
    ["/organizations", "Acme Corp"],
    ["/contacts", "Ada Lovelace"],
    ["/deals", "Platform rollout"],
  ])(
    "keeps the record when deleting from %s is cancelled",
    async (path, name) => {
      const calls = fakeBackend();
      renderApp(path);
      await userEvent.click(
        await screen.findByRole("button", { name: `Actions for ${name}` }),
      );
      await userEvent.click(
        await screen.findByRole("menuitem", { name: /delete/i }),
      );
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        await within(dialog).findByRole("button", { name: "Cancel" }),
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
    },
  );
});
