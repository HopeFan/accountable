import { dialog, expect, test } from "./fixtures";

test("the main flows work with every outside request blocked", async ({
  page,
  context,
}) => {
  const blocked: string[] = [];
  await context.route(
    (url) => !["127.0.0.1", "localhost"].includes(url.hostname),
    (route) => {
      blocked.push(route.request().url());
      return route.abort();
    },
  );
  await page.goto("/");
  await expect(page.getByTestId("tile-pipeline")).toBeVisible();
  await expect(
    page.getByTestId("revenue-chart").locator(".recharts-line"),
  ).toBeVisible();

  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).first().click();
  await dialog(page).getByLabel("Name").fill("Offline Works Ltd");
  await dialog(page).getByRole("button", { name: "Add organization" }).click();
  await expect(
    page.getByRole("link", { name: "Offline Works Ltd" }),
  ).toBeVisible();

  await page.goto("/pipeline");
  await expect(page.getByTestId("deal-card").first()).toBeVisible();
  await page.goto("/contacts");
  await expect(page.locator("tbody tr")).toHaveCount(35);

  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return Array.from(document.fonts).filter((f) => f.status === "loaded")
      .length;
  });
  expect(fonts).toBeGreaterThan(0);
  expect(blocked).toEqual([]);
});
