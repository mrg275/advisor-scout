import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// Point the suite at a deployed site with PLAYWRIGHT_BASE_URL, which also
// skips starting a local server. Used to prove production actually works,
// not just the laptop.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  // These tests sign two people in and compare what each can see, so they
  // must not run at the same time.
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}/sign-in`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
