/**
 * The editor's site check (spec §3.6e): would the deploy's content check reject
 * the site after this save? It runs the deploy's own rules (validateContent,
 * which includes E_LINK_HIDDEN and W_PUBLISHED_HIDDEN, plus copyRuleIssues) on
 * the saved site WITH and WITHOUT the change, and blocks only what the change
 * introduces, in any file:
 *
 *   if (!baseLoaded || !complete) return {available:false}
 *   rawA = rawFromBase(base, {publishedSlugs})            ALL drafts; cached per base
 *   A    = errors(rawA)
 *   rawB, schemaIssues = applyStrict(rawA, entry, data)   the data Save would write
 *   B    = errors(rawB) ∪ schemaIssues
 *   blocking = B − A        keyed by code|file|field|message
 *   if (isNew) drop E_SLUG and E_NEWS_SLUG_DATE on the edited file (cms-hooks owns new slugs)
 *   warnings = warnings(rawB) − warnings(rawA)
 *
 * Errors that exist without the change never block (a saved entry the preview
 * could not read, a data-shape difference); errors the change causes in OTHER
 * files do (a duplicate title lands on the other paper; hiding a project that a
 * news item links to). A schema problem the saved version of the same entry
 * already had (W_PREVIEW_SCHEMA in rawA) does not block either.
 *
 * liveProblems() runs the same algorithm for the live bar, with the schema
 * problems split off as `stillNeeded` (shown neutrally while typing).
 *
 * Pure (no DOM); tests/unit/preview/check.test.ts covers the cases of spec §9.
 */
import type { Issue, RawContent } from "@/lib/content/parse";
import { buildContent } from "@/lib/content/build";
import { copyRuleIssues } from "@/lib/content/copy-rules";
import { todayInLab } from "@/lib/content/dates";
import { validateContent } from "@/lib/content/validate";
import { BASE_SCHEMA_CODE, rawFromBase } from "./base";
import { applyStrict, entryOf } from "./overlay";
import type { EntryRef, LiveProblems, PreviewBase, PreviewIssue, PublishedSlugs } from "./protocol";
import { fileOf } from "./targets";

export interface CheckState {
  /** The saved site from the content manager, or null before `bobalab:base`. */
  base: Partial<PreviewBase> | null;
  /** Every collection loaded and counted (spec §2.2); false makes the check unavailable. */
  complete: boolean;
  publishedSlugs: PublishedSlugs;
  /** 'YYYY-MM-DD' in the lab's time zone; defaults to today. */
  today?: string;
  /** The site's own origins for E_LINK_HIDDEN; defaults to validateContent's. */
  origins?: string[];
}

export interface CheckInput {
  entry: EntryRef;
  isNew: boolean;
  /** Exactly the data Save would write (the preSave data). */
  data: Record<string, unknown>;
}

export interface CheckResult {
  available: boolean;
  blocking: PreviewIssue[];
  warnings: PreviewIssue[];
}

/** Codes cms-hooks.js (slugProblem) owns for a new entry, whose address is a prediction. */
const NEW_SLUG_CODES = new Set(["E_SLUG", "E_NEWS_SLUG_DATE"]);

const keyOf = (i: { code: string; file?: string; field?: string; message: string }) =>
  `${i.code}|${i.file ?? ""}|${i.field ?? ""}|${i.message}`;

export function toPreviewIssue(i: Issue): PreviewIssue {
  const out: PreviewIssue = { code: i.code, file: i.file ?? "", message: i.message };
  if (i.field) out.field = i.field;
  return out;
}

interface Split {
  errors: Issue[];
  warnings: Issue[];
}

/** The deploy's content check: validateContent plus the homepage copy rules. */
export function siteIssues(raw: RawContent, today: string, origins?: string[]): Split {
  const all = [...validateContent(raw, { today, origins })];
  try {
    all.push(...copyRuleIssues(raw, buildContent(raw, { preview: true, today })));
  } catch {
    // buildContent throws only on structural errors, which already block; the
    // copy rules are skipped for this run.
  }
  return {
    errors: all.filter((i) => i.severity === "error"),
    warnings: all.filter((i) => i.severity === "warning"),
  };
}

interface BaseCache {
  publishedSlugs: PublishedSlugs;
  raw: RawContent;
  /** siteIssues(raw) per "today|origins". */
  issues: Map<string, Split>;
}
const cache = new WeakMap<object, BaseCache>();

/**
 * rawFromBase(base) for this state, cached per base object (each `bobalab:base`
 * message is a new object). Treat the result as read-only.
 */
export function baseRaw(state: Pick<CheckState, "base" | "publishedSlugs">): RawContent | null {
  if (!state.base) return null;
  return baseEntry(state.base, state.publishedSlugs).raw;
}

function baseEntry(base: Partial<PreviewBase>, publishedSlugs: PublishedSlugs): BaseCache {
  let hit = cache.get(base);
  if (!hit || hit.publishedSlugs !== publishedSlugs) {
    hit = { publishedSlugs, raw: rawFromBase(base, { publishedSlugs }), issues: new Map() };
    cache.set(base, hit);
  }
  return hit;
}

function baseIssues(state: CheckState, today: string): { raw: RawContent; split: Split } {
  const hit = baseEntry(state.base!, state.publishedSlugs);
  const k = `${today}|${(state.origins ?? []).join(" ")}`;
  let split = hit.issues.get(k);
  if (!split) {
    split = siteIssues(hit.raw, today, state.origins);
    hit.issues.set(k, split);
  }
  return { raw: hit.raw, split };
}

interface Diff {
  blocking: Issue[];
  warnings: Issue[];
  schemaIssues: Issue[];
}

function diff(state: CheckState, input: CheckInput, today: string): Diff {
  const { raw: rawA, split: A } = baseIssues(state, today);
  const entry = entryOf(input.entry);
  const file = fileOf(entry);
  const strict = applyStrict(rawA, entry, input.data);
  // A schema problem the saved version of this entry already had is not new.
  const before = new Set(
    rawA.issues
      .filter((i) => i.code === BASE_SCHEMA_CODE && i.file === file)
      .map((i) => `${i.field ?? ""}|${i.message}`),
  );
  const schemaIssues = strict.schemaIssues.filter(
    (i) => !before.has(`${i.field ?? ""}|${i.message}`),
  );
  const B = strict.raw === rawA ? A : siteIssues(strict.raw, today, state.origins);
  const errA = new Set(A.errors.map(keyOf));
  const warnA = new Set(A.warnings.map(keyOf));
  const dropNew = (i: Issue) => input.isNew && i.file === file && NEW_SLUG_CODES.has(i.code);
  return {
    blocking: B.errors.filter((i) => !errA.has(keyOf(i)) && !dropNew(i)),
    warnings: B.warnings.filter((i) => !warnA.has(keyOf(i))),
    schemaIssues,
  };
}

const unavailable = (): CheckResult => ({ available: false, blocking: [], warnings: [] });

/** The site check for one save (spec §3.6e), on exactly the posted data. */
export function checkSave(state: CheckState, input: CheckInput): CheckResult {
  if (!state.base || !state.complete) return unavailable();
  const today = state.today ?? todayInLab(new Date());
  const d = diff(state, input, today);
  return {
    available: true,
    blocking: [...d.schemaIssues, ...d.blocking].map(toPreviewIssue),
    warnings: d.warnings.map(toPreviewIssue),
  };
}

/**
 * The live bar's problems for the form as it is now: the site check's result,
 * with the schema problems of the edited entry as `stillNeeded` instead of
 * `blocking`. Without an overlay there is nothing to report. The schema
 * problems are listed even when the check itself is unavailable.
 */
export function liveProblems(state: CheckState, overlay: CheckInput | null): LiveProblems {
  const available = !!state.base && state.complete;
  const empty: LiveProblems = { available, blocking: [], warnings: [], stillNeeded: [] };
  if (!overlay || !state.base) return empty;
  const today = state.today ?? todayInLab(new Date());
  if (!available) {
    const raw = baseRaw(state)!;
    const strict = applyStrict(raw, overlay.entry, overlay.data);
    return { ...empty, stillNeeded: strict.schemaIssues.map(toPreviewIssue) };
  }
  const d = diff(state, overlay, today);
  return {
    available,
    blocking: d.blocking.map(toPreviewIssue),
    warnings: d.warnings.map(toPreviewIssue),
    stillNeeded: d.schemaIssues.map(toPreviewIssue),
  };
}
