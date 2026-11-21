import type { Page } from "@playwright/test";
import { TEST_EMAIL, expect, openUserMenu, signOut, test } from "./fixtures";

const trigger = (page: Page) => page.getByRole("button", { name: "User menu" });

test("the button shows the first two letters of the email in capitals", async ({
  page,
}) => {
  await page.goto("/");
  await expect(trigger(page)).toHaveText("TE");
});

test("the menu holds the email, the theme choice and Sign out", async ({
  page,
}) => {
  await page.goto("/");
  await openUserMenu(page);
  const menu = page.getByRole("menu");
  await expect(menu.getByText(TEST_EMAIL)).toBeVisible();
  await expect(page.getByRole("menuitemradio")).toHaveText([
    "Light",
    "Dark",
    "System",
  ]);
  await expect(
    page.getByRole("menuitemradio", { name: "System" }),
  ).toBeChecked();
  await expect(page.getByRole("menuitemradio", { checked: true })).toHaveCount(
    1,
  );
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
});

test("it opens and closes with the keyboard and shows a focus ring", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await trigger(page).focus();
  await expect(trigger(page)).toBeFocused();
  const outline = await trigger(page).evaluate(
    (el) => getComputedStyle(el).outlineStyle,
  );
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  // Opened by keyboard, Radix moves focus to the first item once it has
  // mounted. Wait for that before moving on, or ArrowDown can arrive first.
  await expect(
    page.getByRole("menuitemradio", { name: "Light" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitemradio", { name: "Dark" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("menu")).toBeVisible();
});

test("it closes on a click outside", async ({ page }) => {
  await page.goto("/");
  await openUserMenu(page);
  await page.mouse.click(400, 500);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("Sign out leads to the sign-in screen", async ({ page }) => {
  await page.goto("/deals");
  await signOut(page);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(trigger(page)).toHaveCount(0);
});
