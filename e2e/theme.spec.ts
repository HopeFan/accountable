import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { dialog, expect, test } from "./fixtures";

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

const toggle = (page: Page, name: "Dark mode" | "Light mode") =>
  page.getByRole("button", { name });
const theme = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.theme ?? "light");

async function waitForContent(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(0);
}

test("the toggle works and the choice is remembered", async ({ page }) => {
  await page.goto("/");
  expect(await theme(page)).toBe("light");

  await toggle(page, "Dark mode").click();
  expect(await theme(page)).toBe("dark");
  await expect(toggle(page, "Light mode")).toBeVisible();

  await page.reload();
  expect(await theme(page)).toBe("dark");
  await page.getByRole("link", { name: "Deals" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  expect(await theme(page)).toBe("dark");

  await toggle(page, "Light mode").click();
  await page.reload();
  expect(await theme(page)).toBe("light");
  await expect(toggle(page, "Dark mode")).toBeVisible();
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

test("every screen has the toggle and follows the mode", async ({ page }) => {
  for (const mode of ["light", "dark"] as const) {
    const colors = mode === "light" ? LIGHT : DARK;
    await page.goto("/");
    if (mode === "dark" && (await theme(page)) !== "dark")
      await toggle(page, "Dark mode").click();
    for (const url of SCREENS) {
      await page.goto(url);
      await waitForContent(page);
      await expect(
        toggle(page, mode === "light" ? "Dark mode" : "Light mode"),
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
  await toggle(page, "Dark mode").click();
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
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto("/");
  await waitForContent(page);
  expect(await theme(page)).toBe("light");
  await toggle(page, "Dark mode").click();
  expect(await theme(page)).toBe("dark");
});

test("dialogs and messages use the dark colours", async ({ page }) => {
  await page.goto("/organizations");
  await toggle(page, "Dark mode").click();
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
        await toggle(page, "Dark mode").click();
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
