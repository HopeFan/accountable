import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthGate } from "./AuthGate";
import { TEST_PASSWORD, createTestAuth } from "../lib/testAuth";

function memoryStore(initial?: string) {
  const data = new Map<string, string>();
  if (initial) data.set("accountable-test-session", initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function renderGate(client: ReturnType<typeof createTestAuth>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthGate client={client}>
        <p>The app</p>
      </AuthGate>
    </QueryClientProvider>,
  );
}

describe("AuthGate", () => {
  it("shows loading, then the sign-in screen when signed out", async () => {
    renderGate(createTestAuth(memoryStore()));
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(
      await screen.findByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("The app")).toBeNull();
  });

  it("shows the app when signed in", async () => {
    renderGate(createTestAuth(memoryStore("ada@example.com")));
    expect(await screen.findByText("The app")).toBeInTheDocument();
  });

  it("goes back to the sign-in screen when the session ends", async () => {
    const client = createTestAuth(memoryStore("ada@example.com"));
    renderGate(client);
    await screen.findByText("The app");
    await act(() => client.signOut());
    expect(
      await screen.findByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("The app")).toBeNull();
  });

  it("shows the app after signing in", async () => {
    const client = createTestAuth(memoryStore());
    renderGate(client);
    await screen.findByRole("button", { name: "Sign in" });
    await act(() => client.signIn("ada@example.com", TEST_PASSWORD));
    expect(await screen.findByText("The app")).toBeInTheDocument();
  });
});
