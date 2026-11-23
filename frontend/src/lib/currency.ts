import { useSyncExternalStore } from "react";

export type Currency = "USD" | "AUD";

export const CURRENCIES: { code: Currency; name: string; flag: string }[] = [
  { code: "USD", name: "US dollar", flag: "🇺🇸" },
  { code: "AUD", name: "Australian dollar", flag: "🇦🇺" },
];

/** A fixed approximation for display, not for accounting. */
export const USD_TO_AUD = 1.52;
export const RATE_DATE = "2026-11-23";

const KEY = "accountable-currency";

function isCurrency(value: string | null): value is Currency {
  return value === "USD" || value === "AUD";
}

/** USD unless a choice was saved; storage failing also means USD. */
export function readCurrency(): Currency {
  try {
    const stored = localStorage.getItem(KEY);
    return isCurrency(stored) ? stored : "USD";
  } catch {
    return "USD";
  }
}

// Read once when the module loads, so the first render already has the choice.
let current: Currency = readCurrency();
const listeners = new Set<() => void>();

export function getCurrency(): Currency {
  return current;
}

/** The choice still applies for this visit if it can't be saved. */
export function setCurrency(next: Currency): void {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // storage is blocked; nothing else to do
  }
  listeners.forEach((notify) => notify());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stored USD amount to whole dollars of the current currency. */
export function convert(usd: number): number {
  return current === "AUD" ? Math.round(usd * USD_TO_AUD) : usd;
}

/** The reverse of `convert`, without rounding: a displayed amount back to stored USD. */
export function unconvert(shown: number): number {
  return current === "AUD" ? shown / USD_TO_AUD : shown;
}

export function useCurrency(): Currency {
  return useSyncExternalStore(subscribe, getCurrency);
}
