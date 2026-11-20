import { dialog, expect, test, type Page } from "./fixtures";

interface Deal {
  id: number;
  name: string;
  stage: string;
  value: number;
  probability: number;
  close_date: string | null;
}
interface FollowUp {
  follow_up_state: string;
}

const num = (text: string | null) =>
  Number((text ?? "").replace(/[^0-9]/g, ""));
const getJson = async <T>(page: Page, url: string) =>
  (await (await page.request.get(`/api${url}`)).json()) as T;

test("the figures match the data", async ({ page }) => {
  const deals = await getJson<Deal[]>(page, "/deals");
  const followUps = await getJson<FollowUp[]>(page, "/follow-ups");
  const open = deals.filter((d) =>
    ["new", "qualified", "proposal", "negotiation"].includes(d.stage),
  );
  const wonThisMonth = deals.filter(
    (d) => d.stage === "won" && d.close_date?.startsWith("2026-11"),
  );
  const lost = deals.filter((d) => d.stage === "lost");

  await page.goto("/");
  expect(num(await page.getByTestId("tile-pipeline").textContent())).toBe(
    open.reduce((s, d) => s + d.value, 0),
  );
  expect(num(await page.getByTestId("tile-expected").textContent())).toBe(
    Math.round(open.reduce((s, d) => s + (d.value * d.probability) / 100, 0)),
  );
  expect(num(await page.getByTestId("tile-won").textContent())).toBe(
    wonThisMonth.reduce((s, d) => s + d.value, 0),
  );
  await expect(
    page.getByText(`${wonThisMonth.length} deals won`),
  ).toBeVisible();
  await expect(page.getByTestId("tile-overdue")).toHaveText(
    String(followUps.filter((f) => f.follow_up_state === "overdue").length),
  );
  await expect(page.getByTestId("tile-overdue")).toHaveText("3");

  // the strip has a block for each open stage, with the right counts
  for (const stage of ["new", "qualified", "proposal", "negotiation"]) {
    const n = open.filter((d) => d.stage === stage).length;
    await expect(
      page.getByTestId("pipeline-strip").locator(`[data-stage="${stage}"]`),
    ).toContainText(`${n} deal`);
  }

  // charts: 12 months, and the totals agree with the Won deals in range
  const won = deals.filter((d) => d.stage === "won");
  expect(num(await page.getByTestId("deals-won-total").textContent())).toBe(
    won.length,
  );
  expect(num(await page.getByTestId("revenue-total").textContent())).toBe(
    won.reduce((s, d) => s + d.value, 0),
  );
  await expect(
    page.getByTestId("revenue-chart").locator(".recharts-line"),
  ).toBeVisible();
  await expect(
    page.getByTestId("deals-chart").locator(".recharts-bar-rectangle"),
  ).not.toHaveCount(0);

  // funnel and the Lost figure
  await expect(page.getByTestId("funnel-lost")).toContainText(
    `USD ${lost.reduce((s, d) => s + d.value, 0).toLocaleString("en-US")}`,
  );
  const newRow = page.getByTestId("funnel").locator('[data-stage="new"]');
  await expect(newRow).toContainText(
    `USD ${deals
      .filter((d) => d.stage !== "lost")
      .reduce((s, d) => s + d.value, 0)
      .toLocaleString("en-US")}`,
  );
});

test("ticking a follow-up removes it and updates the overdue count", async ({
  page,
}) => {
  await page.goto("/");
  const list = page.getByTestId("follow-ups");
  const boxes = list.getByRole("checkbox");
  await expect(boxes.first()).toBeVisible();
  const before = await boxes.count();
  expect(before).toBeGreaterThanOrEqual(10);
  await expect(page.getByTestId("tile-overdue")).toHaveText("3");
  // overdue ones are listed first and marked
  await expect(list.getByText(/^Overdue · /).first()).toBeVisible();
  const first = boxes.first();
  const label = (await first.getAttribute("aria-label"))!.replace(
    "Mark done: ",
    "",
  );
  await first.click();
  await expect(boxes).toHaveCount(before - 1);
  await expect(list.getByText(label, { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("tile-overdue")).toHaveText("2");
  await page.reload();
  await expect(
    page.getByTestId("follow-ups").getByRole("checkbox"),
  ).toHaveCount(before - 1);
  await expect(page.getByTestId("tile-overdue")).toHaveText("2");
});

test("marking a deal won changes the tiles, charts and funnel", async ({
  page,
}) => {
  await page.goto("/");
  const pipeline = num(await page.getByTestId("tile-pipeline").textContent());
  const won = num(await page.getByTestId("tile-won").textContent());
  const revenue = num(await page.getByTestId("revenue-total").textContent());
  const dealsWon = num(await page.getByTestId("deals-won-total").textContent());
  const funnelWon = await page
    .getByTestId("funnel")
    .locator('[data-stage="won"]')
    .textContent();

  await page.goto("/deals");
  await page.getByRole("link", { name: "Dock booking system" }).click(); // Negotiation, USD 37,000
  await page.getByLabel("Stage", { exact: true }).selectOption("won");
  await expect(page.getByText("Deal moved to Won")).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByTestId("tile-pipeline")).toHaveText(
    `USD ${(pipeline - 37000).toLocaleString("en-US")}`,
  );
  await expect(page.getByTestId("tile-won")).toHaveText(
    `USD ${(won + 37000).toLocaleString("en-US")}`,
  );
  await expect(page.getByTestId("revenue-total")).toHaveText(
    `USD ${(revenue + 37000).toLocaleString("en-US")}`,
  );
  await expect(page.getByTestId("deals-won-total")).toHaveText(
    String(dealsWon + 1),
  );
  await expect(
    page.getByTestId("funnel").locator('[data-stage="won"]'),
  ).not.toHaveText(funnelWon!);
  await expect(
    page.getByTestId("recent-activity").locator("li").first(),
  ).toContainText("Moved from Negotiation to Won");
});

test("a new follow-up appears on the dashboard", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Fraud alerts" }).click();
  await page.getByRole("button", { name: "Log activity" }).click();
  await dialog(page)
    .getByLabel("What happened")
    .fill("Ask legal about the data clause");
  await dialog(page).getByLabel("Follow-up date").fill("2026-11-16");
  await dialog(page).getByRole("button", { name: "Log activity" }).click();
  await expect(dialog(page)).toBeHidden();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByTestId("tile-overdue")).toHaveText("4");
  const item = page
    .getByTestId("follow-ups")
    .locator("li")
    .filter({ hasText: "Ask legal about the data clause" });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Overdue · 16 Nov 2026");
  await expect(item.getByRole("link", { name: "Fraud alerts" })).toBeVisible();
});
