import { expect, test as base, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TEST_DB, TEST_TODAY } from "./playwright.config";

const ROOT = path.resolve(__dirname, "..");

/** Puts the test database back to the sample data. */
export function resetData(db = TEST_DB) {
  execFileSync("uv", ["run", "python", "backend/seed_cli.py"], {
    cwd: ROOT,
    env: { ...process.env, ACCOUNTABLE_DB: db, ACCOUNTABLE_TODAY: TEST_TODAY },
    stdio: "pipe",
  });
}

const isLocal = (url: string) => {
  if (!url.startsWith("http")) return true;
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
};

/** Every test starts from fresh sample data and fails on a console error or a request that leaves the computer. */
export const test = base.extend<{ problems: { errors: string[]; external: string[] } }>({
  problems: async ({}, use) => {
    await use({ errors: [], external: [] });
  },
  page: async ({ page, problems }, use) => {
    resetData();
    page.on("console", (m) => {
      if (m.type() === "error") problems.errors.push(m.text());
    });
    page.on("pageerror", (e) => problems.errors.push(String(e)));
    page.on("request", (r) => {
      if (!isLocal(r.url())) problems.external.push(r.url());
    });
    await use(page);
    expect(problems.errors, "console errors").toEqual([]);
    expect(problems.external, "requests that leave the computer").toEqual([]);
  },
});

export { expect };

export const dialog = (page: Page) => page.getByRole("dialog");

/** The names in the first column of the table, in order. */
export async function firstColumn(page: Page): Promise<string[]> {
  const cells = page.locator("tbody tr td:first-child");
  return (await cells.allTextContents()).map((t) => t.trim());
}

export async function openRowMenu(page: Page, name: string, item: "Edit" | "Delete") {
  await page.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

export async function api<T>(page: Page, route: string): Promise<T> {
  const res = await page.request.get(`/api${route}`);
  return (await res.json()) as T;
}

export { fs };
