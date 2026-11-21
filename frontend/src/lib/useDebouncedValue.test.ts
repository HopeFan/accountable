import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("follows the value only after the delay", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 250),
      { initialProps: { v: "a" } },
    );
    expect(result.current).toBe("a");
    rerender({ v: "b" });
    act(() => void vi.advanceTimersByTime(249));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
  });

  it("takes only the last of several quick changes", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 250),
      { initialProps: { v: "" } },
    );
    for (const v of ["a", "ab", "abc"]) {
      rerender({ v });
      act(() => void vi.advanceTimersByTime(100));
    }
    expect(result.current).toBe("");
    act(() => void vi.advanceTimersByTime(250));
    expect(result.current).toBe("abc");
  });
});
