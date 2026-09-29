import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, TEST_ENV, TEST_PORT } from "./tests/helpers/env";

// Tests share one SQLite file and one offering, and each test resets that
// state at its start, so they run one at a time.
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --port ${TEST_PORT}`,
    // robots.txt does not touch the database, so the server does not open
    // test.db before globalSetup has recreated it.
    url: `${BASE_URL}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...TEST_ENV, NEXT_TELEMETRY_DISABLED: "1" },
  },
});
