/**
 * Load the project's TypeScript content modules (src/lib/content/schema.ts,
 * people.ts, palette.ts, src/components/ui/labels.ts) from a plain Node script.
 * Node 24 runs TypeScript by stripping types (these modules use only erasable
 * syntax); ./ts-hooks.mjs resolves their extensionless relative imports.
 * Vitest imports the same modules natively and does not need this.
 */
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
let registered = false;

/** Import a TypeScript module by repo-relative path, e.g. "src/lib/content/schema.ts". */
export async function loadTs(rel) {
  if (!registered) {
    register(new URL("./ts-hooks.mjs", import.meta.url).href);
    registered = true;
  }
  const prev = process.emitWarning;
  // Silence Node's one-time "Type Stripping is an experimental feature" notice.
  process.emitWarning = (w, ...rest) =>
    String(w).includes("Type Stripping") ? undefined : prev.call(process, w, ...rest);
  try {
    return await import(pathToFileURL(path.join(ROOT, rel)).href);
  } finally {
    process.emitWarning = prev;
  }
}

export const loadSchemaModule = () => loadTs("src/lib/content/schema.ts");
