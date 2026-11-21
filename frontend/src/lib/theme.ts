export type Theme = "light" | "dark" | "system";

const KEY = "accountable-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export const THEMES: Theme[] = ["light", "dark", "system"];

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** System unless a choice was saved; storage failing also means system. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function deviceIsDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_QUERY).matches
  );
}

/** Light or dark, with System resolved by the device's setting. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return deviceIsDark() ? "dark" : "light";
  return theme;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (resolveTheme(theme) === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

/** The choice still applies for this visit if it can't be saved. */
export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage is blocked; nothing else to do
  }
}

/**
 * Applies the saved choice again whenever the device's setting changes, which
 * only matters while the choice is System. Returns a function that stops it.
 */
export function watchDeviceTheme(): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const onChange = () => applyTheme(readTheme());
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
