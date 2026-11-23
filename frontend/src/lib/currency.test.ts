import { describe, expect, it, vi } from "vitest";
import {
  USD_TO_AUD,
  convert,
  getCurrency,
  readCurrency,
  setCurrency,
  subscribe,
} from "./currency";

describe("readCurrency", () => {
  it("is USD with nothing stored", () => {
    expect(readCurrency()).toBe("USD");
  });

  it("reads back a stored AUD", () => {
    localStorage.setItem("accountable-currency", "AUD");
    expect(readCurrency()).toBe("AUD");
  });

  it("falls back to USD for an unknown value", () => {
    localStorage.setItem("accountable-currency", "EUR");
    expect(readCurrency()).toBe("USD");
  });

  it("falls back to USD when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readCurrency()).toBe("USD");
    vi.restoreAllMocks();
  });
});

describe("setCurrency", () => {
  it("stores the choice and tells subscribers once", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setCurrency("AUD");
    expect(getCurrency()).toBe("AUD");
    expect(localStorage.getItem("accountable-currency")).toBe("AUD");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops notifying after unsubscribing", () => {
    const listener = vi.fn();
    subscribe(listener)();
    setCurrency("AUD");
    expect(listener).not.toHaveBeenCalled();
  });

  it("still applies the choice when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setCurrency("AUD")).not.toThrow();
    expect(getCurrency()).toBe("AUD");
    vi.restoreAllMocks();
  });
});

describe("convert", () => {
  it("leaves USD unchanged", () => {
    expect(convert(48000)).toBe(48000);
  });

  it("rounds to whole dollars in AUD", () => {
    setCurrency("AUD");
    expect(convert(48000)).toBe(Math.round(48000 * USD_TO_AUD));
    expect(Number.isInteger(convert(333))).toBe(true);
  });
});
