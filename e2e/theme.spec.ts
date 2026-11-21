import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { chooseTheme, dialog, expect, openUserMenu, test } from "./fixtures";

test.use({ viewport: { width: 1280, height: 800 } });

const DOCS = path.resolve(__dirname, "../docs/changes/dark-mode");
const SCREENS = [
  "/",
  "/organizations",
  "/organizations/1",
  "/contacts",
  "/contacts/1",
  "/deals",
  "/deals/30",
  "/pipeline",
];
const LIGHT = { page: "rgb(240, 244, 245)", panel: "rgb(255, 255, 255)" };
const DARK = { page: "rgb(4, 35, 46)", panel: "rgb(0, 0, 0)" };

const theme = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.theme ?? "light");

async function waitForContent(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(0);
}

test("the choice in the menu works and is remembered", async ({ page }) => {
  await page.goto("/");
  expect(await theme(page)).toBe("light");

  await chooseTheme(page, "Dark");
  expect(await theme(page)).toBe("dark");
  await openUserMenu(page);
  await expect(page.getByRole("menuitemradio", { name: "Dark" })).toBeChecked();
  await page.keyboard.press("Escape");

  await page.reload();
  expect(await theme(page)).toBe("dark");
  await page.getByRole("link", { name: "Deals" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  expect(await theme(page)).toBe("dark");

  await chooseTheme(page, "Light");
  await page.reload();
  expect(await theme(page)).toBe("light");
  await openUserMenu(page);
  await expect(
    page.getByRole("menuitemradio", { name: "Light" }),
  ).toBeChecked();
});

test("System follows the device, both ways, and updates live", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await waitForContent(page);
  expect(await theme(page)).toBe("dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => theme(page)).toBe("light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => theme(page)).toBe("dark");

  // an explicit choice ignores the device
  await chooseTheme(page, "Light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await theme(page)).toBe("light");

  // back to System follows it again, and is remembered after a reload
  await chooseTheme(page, "System");
  await expect.poll(() => theme(page)).toBe("dark");
  await page.reload();
  expect(await theme(page)).toBe("dark");
  await openUserMenu(page);
  await expect(
    page.getByRole("menuitemradio", { name: "System" }),
  ).toBeChecked();
});

test("a dark device on System is dark before the page runs any script", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const seen = page.waitForEvent("console", (m) =>
    m.text().startsWith("first:"),
  );
  await page.addInitScript(() =>
    document.addEventListener("DOMContentLoaded", () =>
      console.log("first:" + document.documentElement.dataset.theme),
    ),
  );
  await page.goto("/");
  expect((await seen).text()).toBe("first:dark");
});

test("a stored dark choice is applied before the page runs any script", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("accountable-theme", "dark"),
  );
  const seen = page.waitForEvent("console", (m) =>
    m.text().startsWith("first:"),
  );
  await page.addInitScript(() =>
    document.addEventListener("DOMContentLoaded", () =>
      console.log("first:" + document.documentElement.dataset.theme),
    ),
  );
  await page.goto("/");
  expect((await seen).text()).toBe("first:dark");
});

test("every screen has the menu and follows the mode", async ({ page }) => {
  for (const mode of ["light", "dark"] as const) {
    const colors = mode === "light" ? LIGHT : DARK;
    await page.goto("/");
    await chooseTheme(page, mode === "light" ? "Light" : "Dark");
    for (const url of SCREENS) {
      await page.goto(url);
      await waitForContent(page);
      await expect(
        page.getByRole("button", { name: "User menu" }),
      ).toBeVisible();
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        colors.page,
      );
      await expect(page.locator("main .bg-panel").first()).toHaveCSS(
        "background-color",
        colors.panel,
      );
    }
  }
});

test("the charts take the dark colours", async ({ page }) => {
  await page.goto("/");
  await chooseTheme(page, "Dark");
  const chart = page.getByTestId("revenue-chart");
  await expect(
    chart.locator(".recharts-cartesian-axis-tick-value").first(),
  ).toHaveCSS("fill", "rgb(143, 169, 178)");
  await expect(
    chart.locator(".recharts-cartesian-grid line").first(),
  ).toHaveCSS("stroke", "rgba(205, 216, 219, 0.12)");
});

test("local storage blocked: the app opens in light mode with no errors", async ({
  page,
}) => {
  // Storage fails for the theme's key only, so test sign-in (also in local storage) still works.
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem"] as const) {
      const original = Storage.prototype[method] as (...a: string[]) => unknown;
      Storage.prototype[method] = function (this: Storage, ...args: string[]) {
        if (args[0] === "accountable-theme") throw new Error("blocked");
        return original.apply(this, args);
      } as never;
    }
  });
  await page.goto("/");
  await waitForContent(page);
  expect(await theme(page)).toBe("light");
  await chooseTheme(page, "Dark");
  expect(await theme(page)).toBe("dark");
});

test("dialogs and messages use the dark colours", async ({ page }) => {
  await page.goto("/organizations");
  await chooseTheme(page, "Dark");
  await page.getByRole("button", { name: "Add organization" }).first().click();
  await expect(dialog(page)).toHaveCSS("background-color", DARK.panel);
  await dialog(page).getByLabel("Name").fill("Zenith Aerospace");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  const toast = page
    .getByRole("status")
    .filter({ hasText: "Organization added" });
  await expect(toast).toBeVisible();
  await expect(toast).toHaveCSS("background-color", DARK.panel);
});

test("screenshots of the dashboard and the pipeline in both modes", async ({
  page,
}) => {
  fs.mkdirSync(DOCS, { recursive: true });
  for (const mode of ["light", "dark"] as const) {
    for (const [name, url] of [
      ["dashboard", "/"],
      ["pipeline", "/pipeline"],
    ]) {
      await page.goto(url);
      if (mode === "dark" && (await theme(page)) !== "dark")
        await chooseTheme(page, "Dark");
      await waitForContent(page);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(DOCS, `${name}-${mode}.png`),
        fullPage: true,
      });
    }
    if (mode === "light") await page.evaluate(() => localStorage.clear());
  }
});
