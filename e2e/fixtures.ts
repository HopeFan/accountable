import { expect, test as base, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TEST_DB, TEST_TODAY } from "./playwright.config";

const ROOT = path.resolve(__dirname, "..");

// A server that a spec starts itself (persistence.spec.ts) copies this environment.
Object.assign(process.env, {
  ACCOUNTABLE_TEST_AUTH: "1",
  SUPABASE_URL: "",
  SUPABASE_PUBLISHABLE_KEY: "",
  DATABASE_URL: "",
});

/** Puts the test database back to the sample data. */
export function resetData(db = TEST_DB) {
  execFileSync("uv", ["run", "python", "backend/seed_cli.py"], {
    cwd: ROOT,
    env: { ...process.env, ACCOUNTABLE_DB: db, ACCOUNTABLE_TODAY: TEST_TODAY },
    stdio: "pipe",
  });
}

export const TEST_EMAIL = "tester@example.com";
export const TEST_PASSWORD = "test-password";
const SESSION_KEY = "accountable-test-session";

/**
 * Puts a test session in place before every page load, until `signOut` has
 * been used in that tab (sessionStorage remembers), so signing out and then
 * reloading stays signed out.
 */
export async function signIn(page: Page, email = TEST_EMAIL) {
  // Direct API calls from a test (page.request) carry the same test token.
  await page
    .context()
    .setExtraHTTPHeaders({ Authorization: `Bearer test:${email}` });
  await page.addInitScript(
    ([key, value]) => {
      try {
        if (sessionStorage.getItem("e2e-signed-out")) return;
        localStorage.setItem(key, value);
      } catch {
        // storage unavailable: the test will show it
      }
    },
    [SESSION_KEY, email],
  );
}

/** Opens the user menu in the top bar. */
export async function openUserMenu(page: Page) {
  await page.getByRole("button", { name: "User menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
}

/** Chooses Light, Dark or System in the user menu, the way a person does. */
export async function chooseTheme(
  page: Page,
  name: "Light" | "Dark" | "System",
) {
  await openUserMenu(page);
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

/** Signs out the way a person does, with Sign out in the user menu. */
export async function signOut(page: Page) {
  await openUserMenu(page);
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("e2e-signed-out", "1"));
  await page.context().setExtraHTTPHeaders({});
}

const isLocal = (url: string) => {
  if (!url.startsWith("http")) return true;
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
};

type Problems = {
  errors: string[];
  external: string[];
  allow: RegExp[];
};

/** Every test starts from fresh sample data and fails on a console error or a request that leaves the computer. */
export const test = base.extend<{
  problems: Problems;
  signedIn: boolean;
}>({
  signedIn: [true, { option: true }],
  problems: [
    async ({ page }, provide) => {
      const problems: Problems = { errors: [], external: [], allow: [] };
      page.on("console", (m) => {
        if (
          m.type() === "error" &&
          !problems.allow.some((re) => re.test(m.text()))
        )
          problems.errors.push(m.text());
      });
      page.on("pageerror", (e) => problems.errors.push(String(e)));
      page.on("request", (r) => {
        if (!isLocal(r.url())) problems.external.push(r.url());
      });
      await provide(problems);
      expect(problems.errors, "console errors").toEqual([]);
      expect(problems.external, "requests that leave the computer").toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page, signedIn }, provide) => {
    resetData();
    if (signedIn) await signIn(page);
    await provide(page);
  },
});

export { expect };

export const dialog = (page: Page) => page.getByRole("dialog");

/** The names in the first column of the table, in order. */
export async function firstColumn(page: Page): Promise<string[]> {
  const cells = page.locator("tbody tr td:first-child");
  return (await cells.allTextContents()).map((t) => t.trim());
}

export async function openRowMenu(
  page: Page,
  name: string,
  item: "Edit" | "Delete",
) {
  await page.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

export async function api<T>(page: Page, route: string): Promise<T> {
  const res = await page.request.get(`/api${route}`);
  return (await res.json()) as T;
}

export { fs };
