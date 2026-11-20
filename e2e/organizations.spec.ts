import { dialog, expect, firstColumn, openRowMenu, test } from "./fixtures";

test("add, search, sort, edit and delete an organization, with changes surviving a refresh", async ({
  page,
}) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).first().click();
  // required field
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(dialog(page).getByText("Name is required")).toBeVisible();
  await dialog(page).getByLabel("Name").fill("Zenith Aerospace");
  await dialog(page).getByLabel("Industry").fill("Aerospace");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText("Organization added")).toBeVisible();

  // search
  await page.getByRole("searchbox").fill("zenith");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Zenith Aerospace" }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await expect(page.locator("tbody tr")).toHaveCount(13);

  // sort: ascending, descending, none
  const header = page.getByRole("button", { name: "Name" });
  await header.click();
  let names = await firstColumn(page);
  expect(names[0]).toBe("Atlas Freight Systems");
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  await header.click();
  names = await firstColumn(page);
  expect(names[0]).toBe("Zenith Aerospace");
  await header.click();
  await expect(
    page.getByRole("columnheader", { name: /Name/ }),
  ).toHaveAttribute("aria-sort", "none");

  // edit
  await openRowMenu(page, "Zenith Aerospace", "Edit");
  await dialog(page).getByLabel("Industry").fill("Space");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page)).toBeHidden();
  await page.reload();
  await page.getByRole("searchbox").fill("zenith");
  await expect(page.locator("tbody tr")).toContainText("Space");

  // numbers sort by value
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Open deal value" }).click();
  await page.getByRole("button", { name: "Open deal value" }).click();
  const values = (
    await page.locator("tbody tr td:nth-child(6)").allTextContents()
  ).map((t) => Number(t.replace(/[^0-9]/g, "")));
  expect(values).toEqual([...values].sort((a, b) => b - a));

  // delete asks first
  await page.getByRole("searchbox").fill("zenith");
  await openRowMenu(page, "Zenith Aerospace", "Delete");
  await expect(dialog(page)).toContainText(
    "Delete Zenith Aerospace? This can't be undone.",
  );
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("link", { name: "Zenith Aerospace" }),
  ).toBeVisible();
  await openRowMenu(page, "Zenith Aerospace", "Delete");
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Organization deleted")).toBeVisible();
  await page.reload();
  await page.getByRole("searchbox").fill("zenith");
  await expect(
    page.getByText("No organizations match your search."),
  ).toBeVisible();
});

test("an organization page shows its linked records, and deleting it removes them", async ({
  page,
}) => {
  await page.goto("/organizations");
  await page.getByRole("link", { name: "Northwind Logistics" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Northwind Logistics" }),
  ).toBeVisible();
  const contacts = page.getByRole("region", { name: "Contacts" });
  await expect(
    contacts.getByRole("link", { name: "Priya Nair" }),
  ).toBeVisible();
  await expect(contacts.locator("tbody tr")).toHaveCount(3);
  const deals = page.getByRole("region", { name: "Deals" });
  await expect(deals.locator("tbody tr")).toHaveCount(4);
  await expect(
    deals.getByRole("link", { name: "Dispatch optimisation" }),
  ).toBeVisible();

  // "Add contact" here preselects this organization
  await contacts.getByRole("button", { name: "Add contact" }).click();
  await expect(dialog(page).getByLabel("Organization")).toHaveValue(/\d+/);
  await expect(
    dialog(page).getByLabel("Organization").locator("option:checked"),
  ).toHaveText("Northwind Logistics");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog(page)).toContainText(
    /This also deletes 3 contacts, 4 deals and \d+ activities\. This can't be undone\./,
  );
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.locator("tbody tr")).toHaveCount(11);

  await page.goto("/contacts");
  await expect(page.locator("tbody tr")).toHaveCount(32);
  await expect(page.getByRole("link", { name: "Priya Nair" })).toHaveCount(0);
  await page.goto("/deals");
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await expect(
    page.getByRole("link", { name: "Dispatch optimisation" }),
  ).toHaveCount(0);
});

test("the server's error for a duplicate name shows under the field", async ({
  page,
  problems,
}) => {
  problems.allow.push(/status of 422/); // the browser logs the refused request itself
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).first().click();
  await dialog(page).getByLabel("Name").fill("northwind logistics");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(
    dialog(page).getByText("An organization with this name already exists"),
  ).toBeVisible();
  await expect(dialog(page).getByLabel("Name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await dialog(page).getByLabel("Name").fill("Northwind Logistics Two");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Northwind Logistics Two" }),
  ).toBeVisible();
});
