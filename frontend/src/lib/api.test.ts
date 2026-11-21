import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

function reply(status: number, body?: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(body === undefined ? null : JSON.stringify(body), {
          status,
        }),
    ),
  );
}

describe("api", () => {
  it("returns parsed JSON", async () => {
    reply(200, { a: 1 });
    expect(await api("/x")).toEqual({ a: 1 });
  });

  it("sends a JSON body with the method", async () => {
    reply(200, {});
    await api("/x", { method: "POST", body: { n: 1 } });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/x");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"n":1}');
  });

  it("returns nothing for 204", async () => {
    reply(204);
    expect(await api("/x", { method: "DELETE" })).toBeUndefined();
  });

  it("raises field errors from validation responses", async () => {
    reply(422, { detail: [{ field: "name", message: "Required" }] });
    const err = await api("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe("Required");
    expect((err as ApiError).fields).toEqual([
      { field: "name", message: "Required" },
    ]);
  });

  it("uses a string detail as the message", async () => {
    reply(404, { detail: "Gone" });
    await expect(api("/x")).rejects.toThrow("Gone");
  });

  it("falls back to a generic message", async () => {
    reply(500);
    await expect(api("/x")).rejects.toThrow("Something went wrong");
  });

  it("says so when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    await expect(api("/x")).rejects.toThrow(/Can't reach the server/);
  });
});
