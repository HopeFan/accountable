import type { Page } from "@playwright/test";
import { dialog, expect, test, TEST_EMAIL } from "./fixtures";

/** The value next to a label in a record page's details. */
test.use({ viewport: { width: 1440, height: 1500 } });

const detail = (page: Page, label: string) =>
  page
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

const timelineEntry = (page: Page, text: string) =>
  page
    .getByRole("list", { name: "Timeline" })
    .getByRole("listitem")
    .filter({ hasText: text });

test("a record added in the browser shows who added it and who last changed it", async ({
  page,
}) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).first().click();
  await dialog(page).getByLabel("Name").fill("Zenith Aerospace");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(dialog(page)).toBeHidden();
  await page.getByRole("link", { name: "Zenith Aerospace" }).click();

  await expect(detail(page, "Added by")).toHaveText(TEST_EMAIL);
  await expect(detail(page, "Last changed by")).toHaveText(TEST_EMAIL);
});

test("a sample record shows Sample data", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Dispatch optimisation" }).click();
  await expect(detail(page, "Added by")).toHaveText("Sample data");
  await expect(detail(page, "Last changed by")).toHaveText("Sample data");
});

test("editing a sample record shows the editor as last changed by", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Dispatch optimisation" }).click();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await dialog(page).getByLabel("Name").fill("Dispatch optimisation v2");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(detail(page, "Last changed by")).toHaveText(TEST_EMAIL);
  await expect(detail(page, "Added by")).toHaveText("Sample data");
});

test("a logged activity shows its author in the timeline and in recent activity", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Dispatch optimisation" }).click();
  await page.getByRole("button", { name: "Log activity" }).click();
  await dialog(page).getByLabel("What happened").fill("Walked through pricing");
  await dialog(page).getByRole("button", { name: "Log activity" }).click();
  await expect(dialog(page)).toBeHidden();

  const entry = timelineEntry(page, "Walked through pricing");
  await expect(entry).toContainText(`Added by ${TEST_EMAIL}`);
  await expect(
    entry.locator("span.font-mono", { hasText: TEST_EMAIL }),
  ).toBeVisible();

  await page.goto("/");
  const recent = page
    .getByRole("listitem")
    .filter({ hasText: "Walked through pricing" });
  await expect(recent).toContainText(`Added by ${TEST_EMAIL}`);
});

test("moving a deal on the pipeline puts the mover on the stage-change entry", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const card = page
    .getByTestId("deal-card")
    .filter({ hasText: "Driver app refresh" });
  const target = page.locator('section[data-stage="proposal"]');
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + 180 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 12, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 18 });
  await page.mouse.move(end.x, end.y + 1, { steps: 2 });
  await page.mouse.up();
  await expect(page.getByText("Moved from New to Proposal")).toBeVisible();

  await page.goto("/deals");
  await page.getByRole("link", { name: "Driver app refresh" }).click();
  const entry = timelineEntry(page, "Moved from New to Proposal");
  await expect(entry).toContainText(`Added by ${TEST_EMAIL}`);
  await expect(detail(page, "Last changed by")).toHaveText(TEST_EMAIL);
});
