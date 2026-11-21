import type { Page } from "@playwright/test";
import {
  expect,
  signIn,
  signOut,
  test,
  TEST_EMAIL,
  TEST_PASSWORD,
} from "./fixtures";

test.use({ signedIn: false });

const SECTIONS = [
  "/",
  "/organizations",
  "/contacts",
  "/deals",
  "/pipeline",
  "/organizations/1",
  "/deals/1",
];

async function fillAndSubmit(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const signInButton = (page: Page) =>
  page.getByRole("button", { name: "Sign in" });
// Signed in means the top bar has the user menu, which holds Sign out.
const signOutButton = (page: Page) =>
  page.getByRole("button", { name: "User menu" });

test("a signed-out visit to every section shows only the sign-in screen", async ({
  page,
}) => {
  for (const path of SECTIONS) {
    await page.goto(path);
    await expect(signInButton(page)).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(signOutButton(page)).toHaveCount(0);
    await expect(page.getByText(/sign up|forgot/i)).toHaveCount(0);
  }
});

test("a direct API request without a token answers 401", async ({ page }) => {
  for (const route of ["/api/me", "/api/deals", "/api/organizations"]) {
    const res = await page.request.get(route);
    expect(res.status(), route).toBe(401);
  }
  const health = await page.request.get("/healthz");
  expect(health.status()).toBe(200);
});

test("a wrong password shows an error and stays on the sign-in screen", async ({
  page,
}) => {
  await page.goto("/deals");
  await fillAndSubmit(page, TEST_EMAIL, "not-the-password");
  await expect(page.getByText("Email or password is wrong")).toBeVisible();
  await expect(signInButton(page)).toBeVisible();
  await expect(signOutButton(page)).toHaveCount(0);
});

test("signing in opens the page that was asked for", async ({ page }) => {
  await page.goto("/deals");
  await fillAndSubmit(page, TEST_EMAIL, TEST_PASSWORD);
  await expect(signOutButton(page)).toBeVisible();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(signInButton(page)).toHaveCount(0);
});

test("the session survives a reload", async ({ page }) => {
  await page.goto("/contacts");
  await fillAndSubmit(page, TEST_EMAIL, TEST_PASSWORD);
  await expect(signOutButton(page)).toBeVisible();
  await page.reload();
  await expect(signOutButton(page)).toBeVisible();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(signInButton(page)).toHaveCount(0);
});

test("signing out shows the sign-in screen, and Back and a reload do not bring the app back", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/organizations");
  await expect(signOutButton(page)).toBeVisible();
  await page.goto("/deals");
  await expect(signOutButton(page)).toBeVisible();

  await signOut(page);
  await page.goBack();
  await expect(signInButton(page)).toBeVisible();
  await expect(signOutButton(page)).toHaveCount(0);
  await page.reload();
  await expect(signInButton(page)).toBeVisible();
  await expect(signOutButton(page)).toHaveCount(0);
});

test("after signing out, signing in again opens the address the person was on", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/deals");
  await signOut(page);
  await expect(page).toHaveURL(/\/deals$/);
  await fillAndSubmit(page, TEST_EMAIL, TEST_PASSWORD);
  await expect(signOutButton(page)).toBeVisible();
  await expect(page).toHaveURL(/\/deals$/);
});
