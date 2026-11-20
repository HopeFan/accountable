import { dialog, expect, test, type Page } from "./fixtures";

async function logActivity(
  page: Page,
  type: "note" | "call" | "email",
  description: string,
  followUp?: string,
) {
  await page.getByRole("button", { name: "Log activity" }).click();
  await dialog(page).getByLabel("Type").selectOption(type);
  await dialog(page).getByLabel("What happened").fill(description);
  if (followUp) await dialog(page).getByLabel("Follow-up date").fill(followUp);
  await dialog(page).getByRole("button", { name: "Log activity" }).click();
  await expect(dialog(page)).toBeHidden();
}

const entries = (page: Page) =>
  page.getByRole("list", { name: "Timeline" }).getByRole("listitem");

test("logging a note, a call and an email on a deal shows them newest first", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Dispatch optimisation" }).click();
  await expect(entries(page).first()).toBeVisible();
  const before = await entries(page).count();

  await page.getByRole("button", { name: "Log activity" }).click();
  await dialog(page).getByRole("button", { name: "Log activity" }).click();
  await expect(dialog(page).getByText("Describe what happened")).toBeVisible();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();

  // each one gets a time a little later than the last, so the order is clear
  for (const [type, text, when] of [
    ["note", "E2E note about pricing", "2026-11-17T12:01"],
    ["call", "E2E call with the buyer", "2026-11-17T12:02"],
    ["email", "E2E email with the quote", "2026-11-17T12:03"],
  ] as const) {
    await page.getByRole("button", { name: "Log activity" }).click();
    await dialog(page).getByLabel("Type").selectOption(type);
    await dialog(page).getByLabel("What happened").fill(text);
    await dialog(page).getByLabel("When").fill(when);
    if (type === "email")
      await dialog(page).getByLabel("Follow-up date").fill("2026-11-25");
    await dialog(page).getByRole("button", { name: "Log activity" }).click();
    await expect(dialog(page)).toBeHidden();
  }
  await expect(entries(page)).toHaveCount(before + 3);
  await expect(entries(page).nth(0)).toContainText("E2E email with the quote");
  await expect(entries(page).nth(0)).toContainText("Follow-up: 25 Nov 2026");
  await expect(entries(page).nth(1)).toContainText("E2E call with the buyer");
  await expect(entries(page).nth(2)).toContainText("E2E note about pricing");
  await page.reload();
  await expect(entries(page).nth(0)).toContainText("E2E email with the quote");

  // edit
  await entries(page).nth(1).getByRole("button", { name: "Edit call" }).click();
  await dialog(page).getByLabel("What happened").fill("E2E call, edited");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(entries(page).nth(1)).toContainText("E2E call, edited");

  // follow-up done and reopen
  await entries(page).nth(0).getByRole("button", { name: "Mark done" }).click();
  await expect(entries(page).nth(0)).toContainText("Done: 25 Nov 2026");
  await entries(page).nth(0).getByRole("button", { name: "Reopen" }).click();
  await expect(entries(page).nth(0)).toContainText("Follow-up: 25 Nov 2026");

  // delete
  await entries(page)
    .nth(2)
    .getByRole("button", { name: "Delete note" })
    .click();
  await expect(dialog(page)).toContainText("Delete this activity?");
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await expect(entries(page)).toHaveCount(before + 2);
  await page.reload();
  await expect(entries(page)).toHaveCount(before + 2);
  await expect(page.getByText("E2E note about pricing")).toHaveCount(0);
});

test("a stage change adds a 'Moved from X to Y' entry to the timeline and to recent activity", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Dispatch optimisation" }).click();
  await page.getByLabel("Stage", { exact: true }).selectOption("negotiation");
  await expect(entries(page).first()).toContainText(
    "Moved from Proposal to Negotiation",
  );
  await expect(
    entries(page).first().getByRole("button", { name: /^Edit/ }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(
    page.getByTestId("recent-activity").locator("li").first(),
  ).toContainText("Moved from Proposal to Negotiation");
  await expect(
    page.getByTestId("recent-activity").locator("li").first(),
  ).toContainText("Dispatch optimisation");
});

test("activities on a contact appear in their timeline, along with their deals' activities", async ({
  page,
}) => {
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Hannah Brooks" }).click();
  await logActivity(page, "call", "E2E intro call with Hannah", "2026-11-19");
  await expect(entries(page).first()).toContainText(
    "E2E intro call with Hannah",
  );
  await expect(entries(page).first()).toContainText("Follow-up: 19 Nov 2026");
  await page.reload();
  await expect(entries(page).first()).toContainText(
    "E2E intro call with Hannah",
  );
});

test("moving a deal on the pipeline board logs the stage change on the deal", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Appointment reminders" }).click();
  await page.getByLabel("Stage", { exact: true }).selectOption("lost");
  await expect(entries(page).first()).toContainText(
    "Moved from Qualified to Lost",
  );
  await expect(page.getByLabel("Stage", { exact: true })).toHaveValue("lost");
});
