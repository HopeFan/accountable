import { expect, test, dialog, type Page } from "./fixtures";

// A tall window, so every card is on screen and can be reached with the mouse.
test.use({ viewport: { width: 1440, height: 1500 } });

const col = (page: Page, stage: string) =>
  page.locator(`section[data-stage="${stage}"]`);
const card = (page: Page, name: string) =>
  page.getByTestId("deal-card").filter({ hasText: name });
const money = (text: string | null) =>
  Number((text ?? "").replace(/[^0-9]/g, ""));

/** Pointer events in small steps, which is what the drag library listens to. */
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 18 });
  await page.mouse.move(to.x, to.y + 1, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(250);
}

async function centre(page: Page, name: string) {
  const b = (await card(page, name).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
}

async function names(page: Page, stage: string) {
  // allTextContents doesn't wait, so on a slow machine it can read before the board has loaded.
  await page.getByTestId("deal-card").first().waitFor();
  const texts = await col(page, stage)
    .getByTestId("deal-card")
    .locator("p:first-child")
    .allTextContents();
  return texts.map((t) => t.trim());
}

test("dragging a card to another column changes its stage, probability and the totals at once", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const target = col(page, "proposal");
  const beforeProposal = money(
    await target.getByTestId("column-value").textContent(),
  );
  const beforeNew = money(
    await col(page, "new").getByTestId("column-value").textContent(),
  );
  const beforeExpected = money(
    await page.getByTestId("open-expected").textContent(),
  );
  const beforeOpen = money(await page.getByTestId("open-value").textContent());

  const from = await centre(page, "Driver app refresh"); // New, USD 18,000, 5%
  const tb = (await target.boundingBox())!;
  await drag(page, from, { x: tb.x + tb.width / 2, y: tb.y + 180 });

  // no refresh
  await expect(target.getByText("Driver app refresh")).toBeVisible();
  await expect(col(page, "new").getByText("Driver app refresh")).toHaveCount(0);
  expect(money(await target.getByTestId("column-value").textContent())).toBe(
    beforeProposal + 18000,
  );
  expect(
    money(await col(page, "new").getByTestId("column-value").textContent()),
  ).toBe(beforeNew - 18000);
  // expected revenue of that deal goes from 5% to 40% of 18,000: +6,300
  expect(money(await page.getByTestId("open-expected").textContent())).toBe(
    beforeExpected + 6300,
  );
  expect(money(await page.getByTestId("open-value").textContent())).toBe(
    beforeOpen,
  );
  await expect(page.getByText("Moved from New to Proposal")).toBeVisible();
  await expect(
    target.getByTestId("deal-card").filter({ hasText: "Driver app refresh" }),
  ).toContainText("40%");

  // the deals list shows the stage and probability
  await page.goto("/deals");
  await page.getByRole("searchbox").fill("Driver app refresh");
  await expect(page.locator("tbody tr")).toContainText("Proposal");
  await expect(page.locator("tbody tr")).toContainText("40%");
});

test("a card dropped at the top, middle and bottom of a column stays there after a refresh", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const original = await names(page, "qualified");
  expect(original).toHaveLength(6);
  const last = original[5];

  // to the top
  let from = await centre(page, last);
  const top = await centre(page, original[0]);
  await drag(page, from, { x: top.x, y: top.box.y + 4 });
  const expected = [last, ...original.slice(0, 5)];
  expect(await names(page, "qualified")).toEqual(expected);
  await page.reload();
  expect(await names(page, "qualified")).toEqual(expected);

  // to the middle (onto the fourth card)
  from = await centre(page, expected[0]);
  const fourth = await centre(page, expected[3]);
  await drag(page, from, { x: fourth.x, y: fourth.y + 10 });
  const afterMiddle = await names(page, "qualified");
  expect(afterMiddle[3]).toBe(expected[0]);
  expect([...afterMiddle].sort()).toEqual([...expected].sort());
  await page.reload();
  expect(await names(page, "qualified")).toEqual(afterMiddle);

  // to the bottom
  from = await centre(page, afterMiddle[1]);
  const bottom = await centre(page, afterMiddle[5]);
  await drag(page, from, {
    x: bottom.x,
    y: bottom.box.y + bottom.box.height - 3,
  });
  const afterBottom = await names(page, "qualified");
  expect(afterBottom[5]).toBe(afterMiddle[1]);
  await page.reload();
  expect(await names(page, "qualified")).toEqual(afterBottom);
});

test("a card can be dropped in the middle of another column", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const before = await names(page, "proposal");
  const from = await centre(page, "Driver app refresh");
  const mid = await centre(page, before[2]);
  await drag(page, from, { x: mid.x, y: mid.y - 6 });
  const after = await names(page, "proposal");
  expect(after).toHaveLength(before.length + 1);
  expect(after.indexOf("Driver app refresh")).toBe(2);
  await page.reload();
  expect(await names(page, "proposal")).toEqual(after);
});

test("a card dragged to Won sets the close date and leaves the open totals", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const openBefore = money(await page.getByTestId("open-value").textContent());
  const from = await centre(page, "Dock booking system"); // Negotiation, USD 37,000
  const tb = (await col(page, "won").boundingBox())!;
  await drag(page, from, { x: tb.x + tb.width / 2, y: tb.y + 120 });
  await expect(col(page, "won").getByText("Dock booking system")).toBeVisible();
  expect(money(await page.getByTestId("open-value").textContent())).toBe(
    openBefore - 37000,
  );
  await page.goto("/deals");
  await page.getByRole("searchbox").fill("Dock booking");
  await expect(page.locator("tbody tr")).toContainText("Won");
  await expect(page.locator("tbody tr")).toContainText("100%");
  await expect(page.locator("tbody tr")).toContainText("17 Nov 2026");
});

test("keyboard: space picks a card up, arrows move it, space drops it", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const c = card(page, "Supplier portal"); // first in... New column
  await c.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  await expect(
    col(page, "qualified").getByText("Supplier portal"),
  ).toBeVisible();
  await page.reload();
  await expect(
    col(page, "qualified").getByText("Supplier portal"),
  ).toBeVisible();
});

test("adding a deal in a column starts it at that stage", async ({ page }) => {
  await page.goto("/pipeline");
  const before = await col(page, "proposal")
    .getByTestId("column-count")
    .textContent();
  await col(page, "proposal")
    .getByRole("button", { name: /Add deal/ })
    .click();
  await expect(dialog(page).getByLabel("Stage")).toHaveValue("proposal");
  await expect(dialog(page).getByLabel("Probability of close (%)")).toHaveValue(
    "40",
  );
  await dialog(page).getByLabel("Name").fill("Board-added deal");
  await dialog(page)
    .getByLabel("Organization")
    .selectOption({ label: "Atlas Freight Systems" });
  await dialog(page).getByLabel("Value (USD)").fill("12000");
  await dialog(page).getByRole("button", { name: "Add deal" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(
    col(page, "proposal").getByText("Board-added deal"),
  ).toBeVisible();
  expect(
    Number(
      await col(page, "proposal").getByTestId("column-count").textContent(),
    ),
  ).toBe(Number(before) + 1);
  await page.goto("/deals");
  await page.getByRole("searchbox").fill("Board-added");
  await expect(page.locator("tbody tr")).toContainText("Proposal");
});

test("late deals stand out on their cards", async ({ page }) => {
  await page.goto("/pipeline");
  const late = page.locator('[data-testid="deal-card"][data-late]');
  await expect(late).toHaveCount(4);
  for (const c of await late.all())
    await expect(c.getByText("Late", { exact: true })).toBeVisible();
  await expect(col(page, "won").locator("[data-late]")).toHaveCount(0);
});

test("Won and Lost show their latest cards and count the earlier ones", async ({
  page,
}) => {
  await page.goto("/pipeline");
  await expect(col(page, "won").getByTestId("deal-card")).toHaveCount(5);
  await expect(
    col(page, "won").getByText("+ 7 earlier won deals"),
  ).toBeVisible();
  await expect(col(page, "lost").getByTestId("deal-card")).toHaveCount(5);
});

test("a move the server refuses goes back and says why", async ({
  page,
  problems,
}) => {
  problems.allow.push(/status of 409/);
  await page.route("**/api/deals/*/move", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Someone else changed this deal" }),
    }),
  );
  await page.goto("/pipeline");
  const target = col(page, "proposal");
  const before = {
    proposal: await target.getByTestId("column-value").textContent(),
    open: await page.getByTestId("open-expected").textContent(),
    newCards: await names(page, "new"),
  };
  const from = await centre(page, "Driver app refresh");
  const tb = (await target.boundingBox())!;
  await drag(page, from, { x: tb.x + tb.width / 2, y: tb.y + 180 });

  await expect(
    page.getByText(
      "Couldn't move Driver app refresh: Someone else changed this deal",
    ),
  ).toBeVisible();
  await expect(col(page, "new").getByText("Driver app refresh")).toBeVisible();
  await expect(target.getByText("Driver app refresh")).toHaveCount(0);
  await expect(target.getByTestId("column-value")).toHaveText(before.proposal!);
  await expect(page.getByTestId("open-expected")).toHaveText(before.open!);
  expect(await names(page, "new")).toEqual(before.newCards);
});
