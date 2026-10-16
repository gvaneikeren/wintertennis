import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: process.env.E2E_BASE_URL ? undefined : "./e2e/global-setup.ts",
  use: { baseURL, trace: "retain-on-failure", locale: "nl-NL", timezoneId: "Europe/Amsterdam" },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    // The stateful flows run once on a phone; the other devices run the read-only checks.
    { name: "iphone-size", grep: /@public/, use: { ...devices["iPhone 14"], browserName: "chromium", defaultBrowserType: "chromium" } },
    { name: "desktop", grep: /@public/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
