import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, LogOut } from "lucide-react";
import { useState } from "react";
import { useSession, useAuth } from "../lib/auth";
import {
  CURRENCIES,
  setCurrency,
  useCurrency,
  type Currency,
} from "../lib/currency";
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
  const currency = useCurrency();
  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

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
        title={active.name}
        className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-accent"
      >
        {initialsOf(email)}
        <span
          aria-hidden
          data-testid="currency-badge"
          data-flag={active.flag}
          // The flag is drawn by CSS so it never becomes part of the button's text.
          className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-panel text-[10px] leading-none ring-2 ring-panel after:content-[attr(data-flag)]"
        />
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
          <Menu.Label className="px-3 pt-1 pb-0.5 text-xs text-muted">
            Currency
          </Menu.Label>
          <Menu.RadioGroup
            value={currency}
            onValueChange={(code) => setCurrency(code as Currency)}
          >
            {CURRENCIES.map((c) => (
              <Menu.RadioItem key={c.code} value={c.code} className={itemClass}>
                <span className="inline-flex size-4 items-center justify-center">
                  <Menu.ItemIndicator>
                    <Check className="size-4" aria-hidden />
                  </Menu.ItemIndicator>
                </span>
                <span aria-hidden>{c.flag}</span>
                {c.name}
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
