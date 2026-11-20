import { dialog, expect, firstColumn, openRowMenu, test } from "./fixtures";

test("add, search, sort, edit and delete a contact, with changes surviving a refresh", async ({
  page,
}) => {
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).first().click();
  await dialog(page).getByRole("button", { name: "Add contact" }).click();
  await expect(dialog(page).getByText("First name is required")).toBeVisible();
  await expect(dialog(page).getByText("Last name is required")).toBeVisible();
  await dialog(page).getByLabel("First name").fill("Wanda");
  await dialog(page).getByLabel("Last name").fill("Zimmerman");
  await dialog(page).getByLabel("Email").fill("not-an-email");
  await dialog(page).getByRole("button", { name: "Add contact" }).click();
  await expect(
    dialog(page).getByText("Enter a valid email address"),
  ).toBeVisible();
  await dialog(page).getByLabel("Email").fill("wanda@zimmerman.example");
  await dialog(page)
    .getByLabel("Organization")
    .selectOption({ label: "Cobalt Manufacturing" });
  await dialog(page).getByLabel("Status").selectOption("qualified");
  await dialog(page).getByRole("button", { name: "Add contact" }).click();
  await expect(dialog(page)).toBeHidden();

  await page.getByRole("searchbox").fill("zimmerman");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Cobalt Manufacturing");
  await expect(page.locator("tbody tr")).toContainText("Qualified");
  await page.getByRole("searchbox").fill("");

  await page.getByRole("button", { name: "Name" }).click();
  await page.getByRole("button", { name: "Name" }).click();
  expect((await firstColumn(page))[0]).toBe("Wanda Zimmerman");

  await openRowMenu(page, "Wanda Zimmerman", "Edit");
  await dialog(page).getByLabel("Job title").fill("Head of Everything");
  await dialog(page).getByLabel("Status").selectOption("customer");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page)).toBeHidden();
  await page.reload();
  await page.getByRole("searchbox").fill("zimmerman");
  await expect(page.locator("tbody tr")).toContainText("Head of Everything");
  await expect(page.locator("tbody tr")).toContainText("Customer");

  await openRowMenu(page, "Wanda Zimmerman", "Delete");
  await expect(dialog(page)).toContainText(
    "Delete Wanda Zimmerman? This can't be undone.",
  );
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await page.reload();
  await page.getByRole("searchbox").fill("zimmerman");
  await expect(page.getByText("No contacts match your search.")).toBeVisible();
});

test("filters contacts by status, combined with search", async ({ page }) => {
  await page.goto("/contacts");
  await expect(page.locator("tbody tr")).toHaveCount(35);
  const filter = page.getByLabel("Status", { exact: true });
  for (const [value, label, rows] of [
    ["lead", "Lead", 13],
    ["qualified", "Qualified", 9],
    ["customer", "Customer", 13],
  ] as const) {
    await filter.selectOption(value);
    await expect(page.locator("tbody tr")).toHaveCount(rows);
    const tags = await page
      .locator("tbody tr td:last-of-type")
      .allTextContents();
    expect(tags.every((t) => t.trim() === "" || t.includes(label))).toBe(true);
  }
  await filter.selectOption("customer");
  await page.getByRole("searchbox").fill("Atlas");
  await expect(page.locator("tbody tr")).toHaveCount(2); // Isabel Costa and Noor Rahman
  await filter.selectOption("all");
  await expect(page.locator("tbody tr")).toHaveCount(3);

  // a filter and search with no matches says so, rather than that there are no contacts
  await filter.selectOption("lead");
  await page.getByRole("searchbox").fill("Priya");
  await expect(page.getByText("No contacts match your search.")).toBeVisible();
  await expect(page.getByText("No contacts yet.")).toHaveCount(0);
});

test("a contact page shows the organization, their deals and a timeline", async ({
  page,
}) => {
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Priya Nair" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Priya Nair" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Northwind Logistics" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await page.getByRole("link", { name: "Northwind Logistics" }).click();
  await expect(page).toHaveURL(/\/organizations\/\d+$/);
});

test("deleting a contact keeps their deals", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("searchbox").fill("Route planning licence");
  const contactName = (
    await page.locator("tbody tr td:nth-child(3)").innerText()
  ).trim();
  expect(contactName).not.toBe("None");
  await page.getByRole("link", { name: contactName }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog(page)).toContainText(
    /stays, with no main contact|stay, with no main contact/,
  );
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await page.goto("/deals");
  await page.getByRole("searchbox").fill("Route planning licence");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr td:nth-child(3)")).toHaveText("None");
});
