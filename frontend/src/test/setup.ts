import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { setCurrency } from "../lib/currency";

afterEach(() => cleanup());

// The currency is module state and local storage; start every test in USD.
beforeEach(() => {
  localStorage.clear();
  setCurrency("USD");
  localStorage.clear();
});

// jsdom has no layout engine; Recharts and Radix need these.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
