import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readTheme, storeTheme } from "./theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

describe("readTheme", () => {
  it("is light when nothing is stored", () => {
    expect(readTheme()).toBe("light");
  });
  it("is dark when dark is stored", () => {
    localStorage.setItem("accountable-theme", "dark");
    expect(readTheme()).toBe("dark");
  });
  it("is light for any other stored value", () => {
    localStorage.setItem("accountable-theme", "purple");
    expect(readTheme()).toBe("light");
  });
  it("is light when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets and removes the attribute", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});

describe("storeTheme", () => {
  it("remembers the choice", () => {
    storeTheme("dark");
    expect(readTheme()).toBe("dark");
    storeTheme("light");
    expect(readTheme()).toBe("light");
  });
  it("doesn't crash when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => storeTheme("dark")).not.toThrow();
  });
});
