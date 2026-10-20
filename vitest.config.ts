import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Unit tests (`npm run test`): every package's tests/unit/** in a node environment. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "out/**", ".next/**"],
    reporters: ["default"],
  },
});
