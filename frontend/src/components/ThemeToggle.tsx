import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { applyTheme, readTheme, storeTheme, type Theme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = next === "dark" ? Moon : Sun;

  function toggle() {
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-soft"
    >
      <Icon className="size-[18px]" aria-hidden />
      {next === "dark" ? "Dark mode" : "Light mode"}
    </button>
  );
}
