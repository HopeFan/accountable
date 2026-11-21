import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  readTheme,
  resolveTheme,
  storeTheme,
  watchDeviceTheme,
} from "./theme";

type Listener = () => void;

/** A fake prefers-color-scheme that the test can flip. */
function fakeDevice(dark: boolean) {
  const listeners = new Set<Listener>();
  const state = { dark };
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return state.dark;
    },
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  }));
  return {
    listeners,
    set(value: boolean) {
      state.dark = value;
      listeners.forEach((l) => l());
    },
  };
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("readTheme", () => {
  it("is system when nothing is stored", () => {
    expect(readTheme()).toBe("system");
  });
  it.each(["light", "dark", "system"])("reads %s", (value) => {
    localStorage.setItem("accountable-theme", value);
    expect(readTheme()).toBe(value);
  });
  it("is system for any other stored value", () => {
    localStorage.setItem("accountable-theme", "purple");
    expect(readTheme()).toBe("system");
  });
  it("is system when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTheme()).toBe("system");
  });
});

describe("applyTheme", () => {
  it("sets and removes the attribute for light and dark", () => {
    fakeDevice(false);
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
  it("light and dark ignore the device", () => {
    fakeDevice(true);
    applyTheme("light");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    fakeDevice(false);
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
  it("system follows the device", () => {
    fakeDevice(true);
    applyTheme("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    fakeDevice(false);
    applyTheme("system");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
  it("system is light where there is no matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("storeTheme", () => {
  it("remembers each choice", () => {
    for (const theme of ["dark", "light", "system"] as const) {
      storeTheme(theme);
      expect(readTheme()).toBe(theme);
    }
  });
  it("doesn't crash when storage throws, and the choice still applies", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => storeTheme("dark")).not.toThrow();
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});

describe("watchDeviceTheme", () => {
  it("updates the page when the device changes while the choice is system", () => {
    const device = fakeDevice(false);
    applyTheme("system");
    const stop = watchDeviceTheme();
    device.set(true);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    device.set(false);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    stop();
    expect(device.listeners.size).toBe(0);
  });
  it("leaves an explicit choice alone when the device changes", () => {
    const device = fakeDevice(false);
    storeTheme("light");
    applyTheme("light");
    watchDeviceTheme();
    device.set(true);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
  it("does nothing without matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(() => watchDeviceTheme()()).not.toThrow();
  });
});
