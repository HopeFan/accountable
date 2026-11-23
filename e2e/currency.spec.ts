import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { dialog, expect, openRowMenu, openUserMenu, test } from "./fixtures";

async function chooseCurrency(page: Page, name: RegExp) {
  await openUserMenu(page);
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

const toAustralian = (page: Page) => chooseCurrency(page, /Australian dollar/);
const toUs = (page: Page) => chooseCurrency(page, /US dollar/);

const pipelineTile = (page: Page) => page.getByTestId("tile-pipeline");
const firstValueCell = (page: Page) =>
  page.locator("tbody tr td:nth-child(5)").first();

test("switching to Australian dollars changes the dashboard, a table and the pipeline", async ({
  page,
}) => {
  await page.goto("/");
  await expect(pipelineTile(page)).toContainText("USD");
  await toAustralian(page);
  await expect(pipelineTile(page)).toContainText("AUD");
  await expect(pipelineTile(page)).not.toContainText("USD");
  await expect(page.getByText("Revenue won (AUD)")).toBeVisible();

  await page.getByRole("link", { name: "Deals", exact: true }).click();
  await expect(firstValueCell(page)).toContainText("AUD");

  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page.getByTestId("open-value")).toContainText("AUD");
  await expect(page.getByTestId("column-value").first()).toContainText("AUD");
});

test("switching back restores the original figures exactly", async ({
  page,
}) => {
  await page.goto("/");
  const before = await pipelineTile(page).textContent();
  await page.goto("/deals");
  const dealBefore = await firstValueCell(page).textContent();

  await toAustralian(page);
  await expect(firstValueCell(page)).toContainText("AUD");
  await toUs(page);

  await expect(firstValueCell(page)).toHaveText(dealBefore ?? "");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(pipelineTile(page)).toHaveText(before ?? "");
});

test("the choice is remembered after a reload", async ({ page }) => {
  await page.goto("/");
  await toAustralian(page);
  await page.reload();
  await expect(pipelineTile(page)).toContainText("AUD");
  await expect(page.getByTestId("currency-badge")).toHaveAttribute(
    "data-flag",
    "🇦🇺",
  );
  await expect(page.getByRole("button", { name: "User menu" })).toHaveAttribute(
    "title",
    "Australian dollar",
  );
});

test("a deal's form still says USD and keeps the stored value", async ({
  page,
}) => {
  await page.goto("/deals");
  const before = await firstValueCell(page).textContent();
  const name = await page
    .locator("tbody tr td:nth-child(1)")
    .first()
    .innerText();

  await toAustralian(page);
  await openRowMenu(page, name, "Edit");
  const value = dialog(page).getByLabel("Value (USD)");
  await expect(value).toBeVisible();
  const typed = await value.inputValue();
  expect(Number(typed)).toBe(Number((before ?? "").replace(/[^0-9]/g, "")));
  await dialog(page).getByRole("button", { name: /Save/ }).click();
  await expect(dialog(page)).toBeHidden();

  await toUs(page);
  await expect(firstValueCell(page)).toHaveText(before ?? "");
});

test("screenshots of the dashboard and the pipeline in both currencies", async ({
  page,
}) => {
  const docs = path.resolve(__dirname, "../docs/changes/currency");
  fs.mkdirSync(docs, { recursive: true });
  for (const [code, choose] of [
    ["usd", toUs],
    ["aud", toAustralian],
  ] as const) {
    await page.goto("/");
    await choose(page);
    for (const [name, url] of [
      ["dashboard", "/"],
      ["pipeline", "/pipeline"],
    ]) {
      await page.goto(url);
      await expect(page.locator("main h1").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(docs, `${name}-${code}.png`),
        fullPage: true,
      });
    }
  }
});
