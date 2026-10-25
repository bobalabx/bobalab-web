import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Plain <img> is intentional: static export with images.unoptimized and
      // our own srcset manifest (src/components/ui/Img.tsx).
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
    "public/admin/**",
    "src/components/brand/wordmark-geometry.ts",
    // Standalone design prototypes and research artefacts (not site code).
    "docs/**",
  ]),
]);

export default eslintConfig;
