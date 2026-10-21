import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility tests (`npm run e2e`).
 *
 * BASE_URL defaults to the shared dev server (http://localhost:3100, DECISIONS
 * D-01). To test the static export instead: `npm run build && npm run serve:out`
 * then BASE_URL=http://localhost:<port> npm run e2e.
 * WebKit runs in CI (or with E2E_WEBKIT=1) because it must be installed first:
 *   npx playwright install webkit
 */
const baseURL = process.env.BASE_URL || "http://localhost:3100";
const webkit = Boolean(process.env.CI || process.env.E2E_WEBKIT);

export default defineConfig({
  testDir: "tests/e2e",
  // E2E_OUTPUT lets parallel package runs keep separate artifact folders (WP5 request 7).
  outputDir: process.env.E2E_OUTPUT || "test-results/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(webkit ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }] : []),
  ],
});
