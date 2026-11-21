import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthClient, fetchConfig } from "./config";
import { InvalidCredentials } from "./auth";
import { TEST_PASSWORD, TEST_SESSION_KEY, createTestAuth } from "./testAuth";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("test auth client", () => {
  let store: ReturnType<typeof memoryStore>;
  beforeEach(() => {
    store = memoryStore();
  });

  it("signs in with the fixed password and gives the test token", async () => {
    const auth = createTestAuth(store);
    await auth.signIn("ada@example.com", TEST_PASSWORD);
    expect(await auth.getSession()).toEqual({
      email: "ada@example.com",
      accessToken: "test:ada@example.com",
    });
  });

  it("refuses another password and stays signed out", async () => {
    const auth = createTestAuth(store);
    await expect(auth.signIn("ada@example.com", "nope")).rejects.toBeInstanceOf(
      InvalidCredentials,
    );
    expect(await auth.getSession()).toBeNull();
  });

  it("keeps the session for a new client on the same storage", async () => {
    await createTestAuth(store).signIn("ada@example.com", TEST_PASSWORD);
    const restored = await createTestAuth(store).getSession();
    expect(restored?.email).toBe("ada@example.com");
    expect(store.getItem(TEST_SESSION_KEY)).toBe("ada@example.com");
  });

  it("clears the session on sign out", async () => {
    const auth = createTestAuth(store);
    await auth.signIn("ada@example.com", TEST_PASSWORD);
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
  });

  it("announces changes to listeners until they stop", async () => {
    const auth = createTestAuth(store);
    const listener = vi.fn();
    const stop = auth.onChange(listener);
    await auth.signIn("ada@example.com", TEST_PASSWORD);
    await auth.signOut();
    expect(listener.mock.calls.map(([s]) => s?.email ?? null)).toEqual([
      "ada@example.com",
      null,
    ]);
    stop();
    await auth.signIn("ada@example.com", TEST_PASSWORD);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("config", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads /config.json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ testAuth: true }))),
    );
    expect(await fetchConfig()).toEqual({ testAuth: true });
  });

  it("fails when the settings can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    await expect(fetchConfig()).rejects.toThrow();
  });

  it("uses the test client in test mode", async () => {
    const client = await createAuthClient({ testAuth: true });
    expect(await client.getSession()).toBeNull();
  });
});

describe("supabase auth client", () => {
  const signInWithPassword = vi.fn();
  const getSession = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        auth: {
          signInWithPassword,
          getSession,
          signOut: vi.fn(),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: vi.fn() } },
          }),
        },
      }),
    }));
  });

  async function client() {
    const { createSupabaseAuth } = await import("./supabaseAuth");
    return createSupabaseAuth("https://x.test", "key");
  }

  it("turns a Supabase session into ours", async () => {
    getSession.mockResolvedValue({
      data: {
        session: { access_token: "tok", user: { email: "ada@example.com" } },
      },
    });
    expect(await (await client()).getSession()).toEqual({
      email: "ada@example.com",
      accessToken: "tok",
    });
  });

  it("maps a bad login to InvalidCredentials and keeps other errors", async () => {
    const auth = await client();
    signInWithPassword.mockResolvedValueOnce({ error: { status: 400 } });
    const { InvalidCredentials: Invalid } = await import("./auth");
    await expect(auth.signIn("a", "b")).rejects.toBeInstanceOf(Invalid);
    signInWithPassword.mockResolvedValueOnce({ error: { status: 500 } });
    await expect(auth.signIn("a", "b")).rejects.not.toBeInstanceOf(Invalid);
  });
});
