import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Renders Fig. 1 for every fixture set into static HTML (test-results/redesign-home/gallery/)
 * so the slot templates can be screenshotted without a dev server per fixture:
 *   npx vitest run --config tests/visual/vitest.render.config.ts
 *   npx playwright test -c tests/visual/playwright.visual.config.ts -g gallery
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: "next/link",
        replacement: fileURLToPath(new URL("./link-stub.tsx", import.meta.url)),
      },
      { find: "@", replacement: fileURLToPath(new URL("../../src", import.meta.url)) },
    ],
  },
  css: { postcss: { plugins: [] } },
  test: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
    environment: "node",
    include: ["tests/visual/**/*.render.test.tsx"],
    css: false,
  },
});
