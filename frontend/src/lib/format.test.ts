import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatLongDate, joinList, money, moneyCompact, plural } from "./format";

describe("money", () => {
  it("always shows USD with thousands separators", () => {
    expect(money(48000)).toBe("USD 48,000");
    expect(money(0)).toBe("USD 0");
    expect(money(1234567)).toBe("USD 1,234,567");
    expect(money(3300.4)).toBe("USD 3,300");
  });
});

describe("moneyCompact", () => {
  it("shortens axis values", () => {
    expect(moneyCompact(0)).toBe("USD 0");
    expect(moneyCompact(800)).toBe("USD 800");
    expect(moneyCompact(50000)).toBe("USD 50k");
    expect(moneyCompact(12500)).toBe("USD 12.5k");
    expect(moneyCompact(1200000)).toBe("USD 1.2M");
  });
});

describe("dates", () => {
  it("formats a date without moving it across time zones", () => {
    expect(formatDate("2026-11-17")).toBe("17 Nov 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDate(null)).toBe("");
  });
  it("formats date and time", () => {
    expect(formatDateTime("2026-11-17T14:05:00")).toBe("17 Nov 2026, 14:05");
  });
  it("names the weekday", () => {
    expect(formatLongDate("2026-11-17")).toBe("Tuesday 17 November 2026");
  });
});

describe("text helpers", () => {
  it("pluralises and joins", () => {
    expect(plural(1, "deal")).toBe("1 deal");
    expect(plural(3, "deal")).toBe("3 deals");
    expect(plural(2, "activity", "activities")).toBe("2 activities");
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b"])).toBe("a and b");
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
  });
});
