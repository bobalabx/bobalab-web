/**
 * Node module-resolution hook so build scripts can import the project's
 * TypeScript sources (src/lib/content/schema.ts) directly. Node 24 strips the
 * types itself; this hook only adds the missing ".ts" to extensionless
 * relative imports (`import { SWATCH_IDS } from "./palette"`), which the
 * bundler-style sources use. Registered by ./load-schema.mjs.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (relative && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
