import { expect, test } from "./fixtures";

test("opens on the dashboard with sample data on every screen", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Accountable");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Good (morning|afternoon|evening)/,
  );
  await expect(page.getByText("Tuesday 17 November 2026")).toBeVisible();
  for (const id of [
    "tile-pipeline",
    "tile-expected",
    "tile-won",
    "tile-overdue",
  ]) {
    await expect(page.getByTestId(id)).not.toHaveText(/^$/);
  }
  await expect(page.getByTestId("pipeline-strip")).toBeVisible();
  await expect(page.getByTestId("revenue-chart")).toBeVisible();
  await expect(page.getByTestId("deals-chart")).toBeVisible();
  await expect(page.getByTestId("funnel").locator("[data-stage]")).toHaveCount(
    5,
  );
  await expect(
    page.getByTestId("follow-ups").getByRole("checkbox").first(),
  ).toBeVisible();
  await expect(page.getByTestId("recent-activity").locator("li")).toHaveCount(
    10,
  );

  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [link, rows] of [
    ["Organizations", 12],
    ["Contacts", 35],
    ["Deals", 40],
  ] as const) {
    await nav.getByRole("link", { name: link }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: link }),
    ).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(rows);
  }
  await nav.getByRole("link", { name: "Pipeline" }).click();
  await expect(page.getByTestId("deal-card").first()).toBeVisible();
  await expect(page.locator("section[data-stage]")).toHaveCount(6);
});
