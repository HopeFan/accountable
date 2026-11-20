import { dialog, expect, firstColumn, openRowMenu, test } from "./fixtures";

test("add, search, sort, edit and delete a deal, with changes surviving a refresh", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "Add deal" }).first().click();
  await dialog(page).getByRole("button", { name: "Add deal" }).click();
  await expect(dialog(page).getByText("Name is required")).toBeVisible();
  await expect(dialog(page).getByText("Choose an organization")).toBeVisible();
  await dialog(page).getByLabel("Name").fill("Zeta rollout");
  await dialog(page)
    .getByLabel("Organization")
    .selectOption({ label: "Fernhill Retail" });
  await dialog(page)
    .getByLabel("Main contact")
    .selectOption({ label: "Chloe Martin" });
  await dialog(page).getByLabel("Stage").selectOption("proposal");
  await expect(dialog(page).getByLabel("Probability of close (%)")).toHaveValue(
    "40",
  );
  await dialog(page).getByLabel("Value (USD)").fill("-5");
  await dialog(page).getByRole("button", { name: "Add deal" }).click();
  await expect(dialog(page).getByText("Value can't be negative")).toBeVisible();
  await dialog(page).getByLabel("Value (USD)").fill("64000");
  await dialog(page).getByLabel("Close date").fill("2027-01-31");
  await dialog(page).getByRole("button", { name: "Add deal" }).click();
  await expect(dialog(page)).toBeHidden();

  await page.getByRole("searchbox").fill("zeta");
  const row = page.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Fernhill Retail");
  await expect(row).toContainText("Chloe Martin");
  await expect(row).toContainText("Proposal");
  await expect(row).toContainText("USD 64,000");
  await expect(row).toContainText("40%");
  await expect(row).toContainText("31 Jan 2027");
  await page.getByRole("searchbox").fill("");

  await page.getByRole("button", { name: "Value" }).click();
  await page.getByRole("button", { name: "Value" }).click();
  const values = (
    await page.locator("tbody tr td:nth-child(5)").allTextContents()
  ).map((t) => Number(t.replace(/[^0-9]/g, "")));
  expect(values).toEqual([...values].sort((a, b) => b - a));
  expect(values[0]).toBeGreaterThanOrEqual(98000);

  await page.getByRole("button", { name: "Name" }).click();
  const names = await firstColumn(page);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

  await page.getByRole("searchbox").fill("zeta");
  await openRowMenu(page, "Zeta rollout", "Edit");
  await dialog(page).getByLabel("Stage").selectOption("negotiation");
  await expect(dialog(page).getByLabel("Probability of close (%)")).toHaveValue(
    "70",
  );
  await dialog(page).getByLabel("Probability of close (%)").fill("65");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page)).toBeHidden();
  await page.reload();
  await page.getByRole("searchbox").fill("zeta");
  await expect(row).toContainText("Negotiation");
  await expect(row).toContainText("65%");

  await openRowMenu(page, "Zeta rollout", "Delete");
  await expect(dialog(page)).toContainText("Delete Zeta rollout?");
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await page.reload();
  await page.getByRole("searchbox").fill("zeta");
  await expect(page.getByText("No deals match your search.")).toBeVisible();
});

test("a deal page shows its links and a stage selector that moves it", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Dispatch optimisation" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Dispatch optimisation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Northwind Logistics" }),
  ).toBeVisible();
  await expect(page.getByLabel("Stage", { exact: true })).toHaveValue(
    "proposal",
  );
  await page.getByLabel("Stage", { exact: true }).selectOption("negotiation");
  await expect(page.getByText("Deal moved to Negotiation")).toBeVisible();
  await expect(page.getByText("70%")).toBeVisible();
  await page.goto("/deals");
  await page.getByRole("searchbox").fill("Dispatch");
  await expect(page.locator("tbody tr")).toContainText("Negotiation");
});

test("late deals stand out in the table", async ({ page }) => {
  await page.goto("/deals");
  const late = page.locator("tbody tr").filter({ hasText: "Late" });
  await expect(late).toHaveCount(4);
  await expect(
    late.filter({ hasText: "Telehealth integration" }),
  ).toBeVisible();
  await expect(late.locator("td:nth-child(7) > span").first()).toHaveCSS(
    "color",
    "rgb(194, 40, 79)",
  );
});
