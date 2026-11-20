import fs from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const OUT = path.resolve(__dirname, "../test-results/screens");
test.use({ viewport: { width: 1280, height: 800 } });

const SCREENS: [string, string][] = [
  ["dashboard", "/"],
  ["organizations", "/organizations"],
  ["organization-page", "/organizations/1"],
  ["contacts", "/contacts"],
  ["contact-page", "/contacts/1"],
  ["deals", "/deals"],
  ["deal-page", "/deals/30"],
  ["pipeline", "/pipeline"],
];

test("every screen loads, has no sideways scroll and uses the brand fonts", async ({
  page,
}) => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, url] of SCREENS) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${name} scrolls sideways`).toBeLessThanOrEqual(0);
    await page.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage: true,
    });
  }
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      sans: document.fonts.check('14px "Instrument Sans"'),
      mono: document.fonts.check('14px "JetBrains Mono"'),
      serif: document.fonts.check('40px "Instrument Serif"'),
      loaded: Array.from(document.fonts)
        .filter((f) => f.status === "loaded")
        .map((f) => f.family.replace(/"/g, "")),
    };
  });
  expect(fonts.loaded).toEqual(
    expect.arrayContaining(["Instrument Sans", "JetBrains Mono"]),
  );
  expect(fonts.sans && fonts.mono).toBe(true);
});

test("the dashboard has a line chart, a bar chart and the pipeline visual", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByTestId("revenue-chart").locator("svg path.recharts-line-curve"),
  ).toBeVisible();
  await expect(
    page.getByTestId("deals-chart").locator(".recharts-bar-rectangle").first(),
  ).toBeVisible();
  await expect(page.getByTestId("pipeline-strip")).toBeVisible();
  await expect(page.getByTestId("funnel")).toBeVisible();
  // the greeting is in the serif face, numbers in mono
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "font-family",
    /Instrument Serif/,
  );
  await expect(page.getByTestId("tile-pipeline")).toHaveCSS(
    "font-family",
    /JetBrains Mono/,
  );
  await expect(
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Dashboard" }),
  ).toHaveCSS("background-color", "rgb(6, 214, 160)");
  // chart tooltips show the exact figure
  const chart = page.getByTestId("revenue-chart");
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
  await expect(chart.locator(".recharts-tooltip-wrapper")).toContainText("USD");
  await page.screenshot({ path: path.join(OUT, "dashboard-tooltip.png") });
});
