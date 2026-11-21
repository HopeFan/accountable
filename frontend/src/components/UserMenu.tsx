import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, LogOut } from "lucide-react";
import { useState } from "react";
import { useSession, useAuth } from "../lib/auth";
import {
  THEMES,
  applyTheme,
  readTheme,
  storeTheme,
  type Theme,
} from "../lib/theme";

const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-soft";

/** The first two letters of the email, in capitals. */
export function initialsOf(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const email = useSession()?.email ?? "";
  const { signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>(readTheme);

  function choose(value: string) {
    const next = value as Theme;
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="User menu"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-accent"
      >
        {initialsOf(email)}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl bg-panel p-1.5 shadow-[var(--shadow-lift)]"
        >
          <Menu.Label className="truncate px-3 py-2 text-sm font-medium text-ink">
            {email}
          </Menu.Label>
          <Menu.Separator className="mx-1.5 my-1 h-px bg-soft" />
          <Menu.RadioGroup value={theme} onValueChange={choose}>
            {THEMES.map((t) => (
              <Menu.RadioItem key={t} value={t} className={itemClass}>
                <span className="inline-flex size-4 items-center justify-center">
                  <Menu.ItemIndicator>
                    <Check className="size-4" aria-hidden />
                  </Menu.ItemIndicator>
                </span>
                {LABELS[t]}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="mx-1.5 my-1 h-px bg-soft" />
          <Menu.Item onSelect={() => void signOut()} className={itemClass}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
