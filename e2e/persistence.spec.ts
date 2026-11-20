import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import { TEST_TODAY } from "./playwright.config";
import { dialog, expect, resetData, test } from "./fixtures";

const ROOT = path.resolve(__dirname, "..");
const PORT = 8101;
const DB = path.join(ROOT, "data", "e2e-persist.db");
const BASE = `http://127.0.0.1:${PORT}`;
const env = {
  ...process.env,
  ACCOUNTABLE_DB: DB,
  ACCOUNTABLE_TODAY: TEST_TODAY,
};

async function start(): Promise<ChildProcess> {
  const child = spawn(
    "uv",
    [
      "run",
      "uvicorn",
      "app.main:app",
      "--app-dir",
      "backend",
      "--port",
      String(PORT),
    ],
    {
      cwd: ROOT,
      env,
      stdio: "ignore",
      detached: true,
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("The backend did not start");
}

async function stop(child: ChildProcess) {
  if (child.pid) process.kill(-child.pid, "SIGTERM");
  await new Promise((r) => setTimeout(r, 800));
}

test("changes survive a restart, and the reset command brings the sample data back", async ({
  page,
}) => {
  resetData(DB);
  let server = await start();
  try {
    await page.goto(`${BASE}/organizations`);
    await page
      .getByRole("button", { name: "Add organization" })
      .first()
      .click();
    await dialog(page).getByLabel("Name").fill("Persistent Partners");
    await dialog(page)
      .getByRole("button", { name: "Add organization" })
      .click();
    await expect(page.getByText("Organization added")).toBeVisible();

    await page.goto(`${BASE}/deals`);
    await page.getByRole("link", { name: "Dispatch optimisation" }).click();
    await page.getByLabel("Stage", { exact: true }).selectOption("negotiation");
    await expect(page.getByText("Deal moved to Negotiation")).toBeVisible();

    await stop(server);
    server = await start();

    await page.goto(`${BASE}/organizations`);
    await expect(
      page.getByRole("link", { name: "Persistent Partners" }),
    ).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(13);
    await page.goto(`${BASE}/deals`);
    await page.getByRole("searchbox").fill("Dispatch");
    await expect(page.locator("tbody tr")).toContainText("Negotiation");

    // the reset command brings the sample data back
    execFileSync("uv", ["run", "python", "backend/seed_cli.py"], {
      cwd: ROOT,
      env,
    });
    await page.goto(`${BASE}/organizations`);
    await expect(page.locator("tbody tr")).toHaveCount(12);
    await expect(
      page.getByRole("link", { name: "Persistent Partners" }),
    ).toHaveCount(0);
    await page.goto(`${BASE}/deals`);
    await page.getByRole("searchbox").fill("Dispatch");
    await expect(page.locator("tbody tr")).toContainText("Proposal");
  } finally {
    await stop(server);
  }
});
