/**
 * Imported FIRST by EditorPreview.tsx, before anything that builds a zod schema
 * (src/lib/content/schema.ts).
 *
 * zod decides at schema construction whether its fast parser may use
 * `new Function`, and finds out by trying it once. Under the site CSP
 * (script-src without 'unsafe-eval') that try is reported as a CSP violation
 * even though zod catches it. In jitless mode zod never tries; parsing gives
 * the same results. Browser only: the server prerender and the public pages
 * are not affected (the public pages never load this module).
 */
import { z } from "zod";

if (typeof window !== "undefined") z.config({ jitless: true });
