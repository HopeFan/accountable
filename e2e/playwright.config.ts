import { defineConfig } from "@playwright/test";
import path from "node:path";

export const PORT = 8100;
export const TEST_DB = path.resolve(__dirname, "../data/e2e.db");
export const TEST_TODAY = "2026-11-17";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../playwright-report" }],
  ],
  outputDir: "../test-results",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome", // the installed Google Chrome
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    // Builds the app, then serves the API and the built frontend on one port, on a test database and a fixed date.
    command: `npm run build && uv run uvicorn app.main:app --app-dir backend --port ${PORT}`,
    cwd: path.resolve(__dirname, ".."),
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ACCOUNTABLE_DB: TEST_DB, ACCOUNTABLE_TODAY: TEST_TODAY },
  },
});
