import type { Page } from "@playwright/test";
import { dialog, expect, test } from "./fixtures";

const box = (page: Page) => page.getByRole("combobox", { name: "Search" });
const results = (page: Page) =>
  page.getByRole("listbox", { name: "Search results" });
const group = (page: Page, name: string) =>
  results(page).getByRole("group", { name });

test("part of a name in any case finds an organization, a contact and a deal, grouped", async ({
  page,
}) => {
  await page.goto("/");
  await box(page).fill("NORTHWIND");
  await expect(
    group(page, "Organizations").getByRole("option", {
      name: "Northwind Logistics Logistics",
    }),
  ).toBeVisible();

  await box(page).fill("pRiYa");
  await expect(
    group(page, "Contacts").getByRole("option", {
      name: "Priya Nair Northwind Logistics",
    }),
  ).toBeVisible();

  await box(page).fill("DISPATCH opt");
  await expect(
    group(page, "Deals").getByRole("option", {
      name: "Dispatch optimisation Northwind Logistics · Proposal",
    }),
  ).toBeVisible();
  await expect(group(page, "Organizations")).toBeHidden();
});

test("one query shows several groups together", async ({ page }) => {
  await page.goto("/");
  await box(page).fill("a");
  await expect(group(page, "Organizations")).toBeVisible();
  await expect(group(page, "Contacts")).toBeVisible();
  await expect(group(page, "Deals")).toBeVisible();
});

test("a record added in the browser is found", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).first().click();
  await dialog(page).getByLabel("Name").fill("Zenith Aerospace");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(dialog(page)).toBeHidden();

  await box(page).fill("zenith");
  await expect(
    group(page, "Organizations").getByRole("option", {
      name: "Zenith Aerospace",
    }),
  ).toBeVisible();
});

test("clicking a result opens its page and clears the box", async ({
  page,
}) => {
  await page.goto("/");
  await box(page).fill("harbor");
  await results(page)
    .getByRole("option", { name: /Harbor Health Partners/ })
    .click();
  await expect(page).toHaveURL(/\/organizations\/\d+$/);
  await expect(
    page.getByRole("heading", { name: "Harbor Health Partners" }),
  ).toBeVisible();
  await expect(box(page)).toHaveValue("");
  await expect(results(page)).toBeHidden();

  await box(page).fill("priya");
  await results(page)
    .getByRole("option", { name: /Priya Nair/ })
    .click();
  await expect(page).toHaveURL(/\/contacts\/\d+$/);
  await expect(box(page)).toHaveValue("");

  await box(page).fill("dispatch");
  await results(page)
    .getByRole("option", { name: /Dispatch optimisation/ })
    .click();
  await expect(page).toHaveURL(/\/deals\/\d+$/);
  await expect(box(page)).toHaveValue("");
});

test("the arrow keys move across groups and Enter opens the result", async ({
  page,
}) => {
  await page.goto("/");
  await box(page).fill("a");
  const options = results(page).getByRole("option");
  await expect(group(page, "Deals")).toBeVisible();
  const orgs = await group(page, "Organizations").getByRole("option").count();

  // Down past the last organization lands on the first contact.
  for (let i = 0; i <= orgs; i++) await box(page).press("ArrowDown");
  await expect(options.nth(orgs)).toHaveAttribute("aria-selected", "true");
  await box(page).press("Enter");
  await expect(page).toHaveURL(/\/contacts\/\d+$/);
  await expect(box(page)).toHaveValue("");
  await expect(results(page)).toBeHidden();

  // Up from the box wraps to the last result, a deal.
  await box(page).fill("a");
  await expect(group(page, "Deals")).toBeVisible();
  await box(page).press("ArrowUp");
  await box(page).press("Enter");
  await expect(page).toHaveURL(/\/deals\/\d+$/);
});

test("Enter on the first result opens the organization", async ({ page }) => {
  await page.goto("/");
  await box(page).fill("northwind");
  await expect(results(page)).toBeVisible();
  await box(page).press("ArrowDown");
  await box(page).press("Enter");
  await expect(page).toHaveURL(/\/organizations\/\d+$/);
});

test("Escape closes the dropdown", async ({ page }) => {
  await page.goto("/");
  await box(page).fill("northwind");
  await expect(results(page)).toBeVisible();
  await box(page).press("Escape");
  await expect(results(page)).toBeHidden();
});

test("a query with no match shows No results for it", async ({ page }) => {
  await page.goto("/");
  await box(page).fill("zzqxnothing");
  await expect(page.getByText("No results for zzqxnothing")).toBeVisible();
  await box(page).fill("");
  await expect(page.getByText("No results for")).toBeHidden();
});
