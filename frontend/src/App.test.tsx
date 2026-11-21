import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeBackend, renderApp } from "./test/fakeApi";

afterEach(() => vi.unstubAllGlobals());

describe("App routes", () => {
  it.each([
    ["/organizations", "Acme Corp"],
    ["/contacts", "Ada Lovelace"],
    ["/deals", "Platform rollout"],
    ["/organizations/1", "Acme Corp"],
    ["/contacts/1", "Ada Lovelace"],
    ["/deals/1", "Platform rollout"],
    ["/pipeline", "Platform rollout"],
  ])("shows %s", async (path, text) => {
    fakeBackend();
    renderApp(path);
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument();
  });

  it("shows a not-found page for unknown addresses", async () => {
    fakeBackend();
    renderApp("/nowhere");
    expect(
      await screen.findByRole("heading", { name: "Not found" }),
    ).toBeInTheDocument();
  });
});
