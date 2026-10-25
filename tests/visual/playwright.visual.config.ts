import { defineConfig, devices } from "@playwright/test";

/**
 * Home + Fig. 1 visual QA (redesign). Runs against an already running server
 * (default: the shared dev server http://localhost:3100); it never starts one.
 *   npx playwright test -c tests/visual/playwright.visual.config.ts
 * Screenshots land in test-results/redesign-home/.
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.visual\.ts$/,
  outputDir: "../../test-results/redesign-home/pw",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3100",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
