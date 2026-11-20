import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeBackend, renderApp } from "./test/fakeApi";

afterEach(() => vi.unstubAllGlobals());

const sent = (calls: ReturnType<typeof fakeBackend>, method: string) =>
  calls.filter((c) => c.method === method && !c.path.includes("preview"));

describe("adding records", () => {
  it("adds an organization", async () => {
    const calls = fakeBackend();
    renderApp("/organizations");
    await userEvent.click(
      await screen.findByRole("button", { name: /add organization/i }),
    );
    await userEvent.type(screen.getByLabelText(/^Name/), "Globex");
    await userEvent.type(screen.getByLabelText("Industry"), "Energy");
    await userEvent.click(
      screen.getByRole("button", { name: "Add organization" }),
    );
    await waitFor(() => expect(sent(calls, "POST")).toHaveLength(1));
    expect(sent(calls, "POST")[0]).toMatchObject({
      path: "/organizations",
      body: { name: "Globex", industry: "Energy", website: null },
    });
    expect(await screen.findByText("Organization added")).toBeInTheDocument();
  });

  it("explains a missing required field without calling the server", async () => {
    const calls = fakeBackend();
    renderApp("/organizations");
    await userEvent.click(
      await screen.findByRole("button", { name: /add organization/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Add organization" }),
    );
    expect(await screen.findByLabelText(/^Name/)).toBeInvalid();
    expect(sent(calls, "POST")).toHaveLength(0);
  });

  it("adds a contact linked to an organization", async () => {
    const calls = fakeBackend();
    renderApp("/contacts");
    await userEvent.click(
      await screen.findByRole("button", { name: /add contact/i }),
    );
    await userEvent.type(screen.getByLabelText(/First name/), "Grace");
    await userEvent.type(screen.getByLabelText(/Last name/), "Hopper");
    await userEvent.selectOptions(screen.getByLabelText("Organization"), "1");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Status" }),
      "customer",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^Add contact$/ }),
    );
    await waitFor(() => expect(sent(calls, "POST")).toHaveLength(1));
    expect(sent(calls, "POST")[0].body).toMatchObject({
      first_name: "Grace",
      last_name: "Hopper",
      organization_id: 1,
      status: "customer",
    });
  });

  it("adds a deal and offers only that organization's contacts", async () => {
    const calls = fakeBackend();
    renderApp("/deals");
    await userEvent.click(
      await screen.findByRole("button", { name: /add deal/i }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Big one");
    await userEvent.selectOptions(
      within(dialog).getByLabelText(/Organization/),
      "1",
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Main contact"),
      "1",
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Stage"),
      "proposal",
    );
    await userEvent.clear(within(dialog).getByLabelText(/Value/));
    await userEvent.type(within(dialog).getByLabelText(/Value/), "5000");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /^Add deal$/ }),
    );
    await waitFor(() => expect(sent(calls, "POST")).toHaveLength(1));
    expect(sent(calls, "POST")[0].body).toMatchObject({
      name: "Big one",
      organization_id: 1,
      contact_id: 1,
      stage: "proposal",
      value: 5000,
    });
  });

  it("logs an activity from a contact page", async () => {
    const calls = fakeBackend();
    renderApp("/contacts/1");
    await userEvent.click(
      await screen.findByRole("button", { name: /log activity/i }),
    );
    await userEvent.type(screen.getByLabelText(/What happened/), "Called back");
    await userEvent.type(screen.getByLabelText("Follow-up date"), "2026-12-01");
    await userEvent.click(screen.getByRole("button", { name: "Log activity" }));
    await waitFor(() => expect(sent(calls, "POST")).toHaveLength(1));
    expect(sent(calls, "POST")[0]).toMatchObject({
      path: "/activities",
      body: {
        description: "Called back",
        contact_id: 1,
        follow_up_date: "2026-12-01",
      },
    });
  });
});

describe("changing records", () => {
  it("edits a deal from its table row", async () => {
    const calls = fakeBackend();
    renderApp("/deals");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Actions for Platform rollout",
      }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /edit/i }),
    );
    const name = await screen.findByLabelText(/^Name/);
    await userEvent.clear(name);
    await userEvent.type(name, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent(calls, "PATCH")).toHaveLength(1));
    expect(sent(calls, "PATCH")[0]).toMatchObject({
      path: "/deals/1",
      body: { name: "Renamed" },
    });
  });

  it("changes a deal's stage from its page", async () => {
    const calls = fakeBackend();
    renderApp("/deals/1");
    await userEvent.selectOptions(
      await screen.findByLabelText("Stage"),
      "proposal",
    );
    await waitFor(() => expect(sent(calls, "PATCH")).toHaveLength(1));
    expect(sent(calls, "PATCH")[0].body).toEqual({ stage: "proposal" });
    expect(
      await screen.findByText("Deal moved to Proposal"),
    ).toBeInTheDocument();
  });

  it("shows the server's message when a save is refused", async () => {
    fakeBackend(
      new Response(JSON.stringify({ detail: "Name already used" }), {
        status: 409,
      }),
    );
    renderApp("/deals/1");
    await userEvent.selectOptions(await screen.findByLabelText("Stage"), "won");
    expect(await screen.findByText("Name already used")).toBeInTheDocument();
  });

  it("marks a follow-up done", async () => {
    const calls = fakeBackend();
    renderApp("/");
    const box = await screen.findByRole("checkbox", { name: /Mark done/ });
    await userEvent.click(box);
    await waitFor(() => expect(sent(calls, "PATCH")).toHaveLength(1));
    expect(sent(calls, "PATCH")[0].body).toEqual({ follow_up_done: true });
  });
});

describe("deleting records", () => {
  it.each([
    ["/organizations", "Acme Corp", "/organizations/1"],
    ["/contacts", "Ada Lovelace", "/contacts/1"],
    ["/deals", "Platform rollout", "/deals/1"],
  ])("deletes from the %s table after confirming", async (path, name, url) => {
    const calls = fakeBackend();
    renderApp(path);
    await userEvent.click(
      await screen.findByRole("button", { name: `Actions for ${name}` }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /delete/i }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(sent(calls, "DELETE")).toHaveLength(0);
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Delete" }),
    );
    await waitFor(() => expect(sent(calls, "DELETE")).toHaveLength(1));
    expect(sent(calls, "DELETE")[0].path).toBe(url);
  });

  it.each(["/organizations/1", "/contacts/1", "/deals/1"])(
    "deletes from the page at %s and leaves it",
    async (path) => {
      const calls = fakeBackend();
      renderApp(path);
      await userEvent.click(
        await screen.findByRole("button", { name: /^Delete$/ }),
      );
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        await within(dialog).findByRole("button", { name: "Delete" }),
      );
      await waitFor(() => expect(sent(calls, "DELETE")).toHaveLength(1));
      expect(
        await screen.findByRole("heading", { level: 1 }),
      ).toBeInTheDocument();
    },
  );

  it("deletes a timeline activity", async () => {
    const calls = fakeBackend();
    renderApp("/deals/1");
    await userEvent.click(
      await screen.findByRole("button", { name: "Delete note" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    await waitFor(() =>
      expect(sent(calls, "DELETE")[0].path).toBe("/activities/1"),
    );
  });
});

describe("failures", () => {
  it("offers a retry when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    renderApp("/contacts");
    expect(
      await screen.findByRole("button", { name: /try again|retry/i }),
    ).toBeInTheDocument();
  });
});
