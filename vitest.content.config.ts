import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Content validation suite (`npm run validate`, CI job "validate-content").
 * Validates CONTENT_DIR (default ./content) and runs the rule fixtures.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/content/**/*.test.ts"],
    reporters: ["default"],
  },
});
