export type Theme = "light" | "dark";

const KEY = "accountable-theme";

/** Dark only when it was chosen; anything else, or storage failing, is light. */
export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
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
