import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// A1 92a43f4 playwright.config.ts: retain serial desktop/mobile browser checks,
// replace A1's local webServer with the team's isolated Docker Compose stack.
const here = __dirname;
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "../../test-results/e2e",
  globalSetup: "./tests/e2e/setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: path.resolve(here, "../../playwright-report"),
        open: "never",
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:3200",
    browserName: "chromium",
    channel:
      process.env.PLAYWRIGHT_CHANNEL ||
      (process.platform === "win32" ? "msedge" : undefined),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
