/**
 * PARITY (brief §I WP6 #2): every field and constraint of the zod content schema
 * (src/lib/content/schema.ts) exists in public/admin/config.yml, and vice versa.
 *
 * Reads the generated config.yml from disk (so hand edits and stale files are
 * caught) and walks it side by side with the zod schema:
 *  - the same collections/files and the same field names at every level;
 *  - `required`, defaults, enum options, number bounds, list min/max;
 *  - slug fields are relation widgets pointing at an existing collection;
 *  - string constraints are checked by BEHAVIOUR: boundary and format samples
 *    must be accepted by the Decap `pattern` exactly when zod accepts them
 *    (plus, on URL fields, the validator's https rule E_HTTP_URL; the validator
 *    also rejects "http://" at the start of any other text, which the CMS leaves
 *    to the validate-content check).
 * Documented, deliberate differences (each asserted, not skipped):
 *  - year fields: zod's maximum is "next year" (computed at load); the CMS has
 *    the minimum only, so the config does not go stale every January 1;
 *  - required parts of an OPTIONAL object (news.link) are optional in the editor
 *    and enforced all-or-nothing by cms-hooks.js (rules in cms-data.js);
 *  - file/image widgets carry no pattern (Decap 3.17.1 rejects valid values);
 *    the validator still checks them;
 *  - cross-field rules (object-level .refine: a person's end ≥ start, a project's
 *    end_year ≥ start_year) cannot be Decap field options; cms-hooks.js enforces
 *    them on save (rules in cms-data.js), and each refinement must have one.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import * as S from "@/lib/content/schema";
import { contentModels } from "../../../scripts/cms/lib/zod-model.mjs";
import { ROOT, runAdminScripts } from "./helpers";

type Cfg = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Node = Cfg;

const config: Cfg = parse(fs.readFileSync(path.join(ROOT, "public/admin/config.yml"), "utf8"));
const models = contentModels(S) as unknown as Record<string, Node>;
const rules: Array<{ scope: string; object: string[]; fields: string[] }> = (
  runAdminScripts(["cms-data.js"]).window.BOBALAB_CMS as Cfg
).rules.allOrNothing;

const zodRoots: Record<string, ZodType> = {
  ...S.COLLECTION_SCHEMAS,
  ...Object.fromEntries(Object.entries(S.PAGE_SCHEMAS).map(([k, v]) => [`pages/${k}`, v])),
  site: S.siteSchema,
} as Record<string, ZodType>;

/** Config scopes keyed like the models: folder collections by name, files by path. */
function scopes(): Array<{ key: string; scope: string; fields: Cfg[] }> {
  const out: Array<{ key: string; scope: string; fields: Cfg[] }> = [];
  for (const c of config.collections as Cfg[]) {
    if (c.folder) out.push({ key: c.name, scope: c.name, fields: c.fields });
    for (const f of (c.files ?? []) as Cfg[]) {
      const key = String(f.file)
        .replace(/^content\//, "")
        .replace(/\.ya?ml$/, "");
      out.push({ key, scope: `${c.name}/${f.name}`, fields: f.fields });
    }
  }
  return out;
}

// --- zod navigation for behavioural checks ---------------------------------
const def = (s: unknown): Cfg => (s as Cfg)._zod.def;
function unwrap(s: unknown): unknown {
  let cur = s;
  for (;;) {
    const d = def(cur);
    if (d.type === "optional" || d.type === "default") cur = d.innerType;
    else if (d.type === "pipe" && def(d.in).type === "transform") cur = d.out;
    else return cur;
  }
}
function zodChild(s: unknown, name: string): ZodType {
  const d = def(unwrap(s));
  if (d.type === "object") return d.shape[name];
  throw new Error(`not an object at ${name}`);
}
function zodItems(s: unknown): ZodType {
  return def(unwrap(s)).element;
}

const SAMPLES = [
  "abc",
  "one line",
  "two\nlines",
  "<b>bold</b>",
  "https://example.org/a?b=c",
  "http://example.org/a",
  "/uploads/a.pdf",
  "/research/old-slug/",
  "/Research/old/",
  "research/old/",
  "ftp://example.org",
  "https://",
  "a@b.co",
  "name@berkeley.edu",
  "a@b",
  "10.1287/mnsc.2023.01234",
  "10.12/x",
  "doi:10.1287/x",
  "2026",
  "2026-10",
  "2026-10-20",
  "2026-13",
  "2026-10-32",
  "2026-10-20T15:00",
  "2026-10-20 15:00:30Z",
  "20261020",
  "kebab-case-slug",
];

function stringSamples(node: Node): string[] {
  const s = new Set(SAMPLES);
  for (const n of [node.maxLength, node.minLength]) {
    if (typeof n === "number") {
      s.add("a".repeat(n));
      s.add("a".repeat(n + 1));
      if (n > 1) s.add("a".repeat(n - 1));
    }
  }
  return [...s];
}

const NO_PATTERN_WIDGETS = new Set(["file", "image", "richtext", "markdown"]);

function compareField(
  cfg: Cfg | undefined,
  node: Node,
  zod: ZodType,
  at: string,
  ctx: Ctx,
  problems: string[],
) {
  const p = (m: string) => problems.push(`${at}: ${m}`);
  if (!cfg) return p("missing in config.yml");
  if (!cfg.label) p("no label");
  const cfgRequired = cfg.required !== false;
  const conditional = node.required && ctx.optionalParent;
  if (conditional) {
    if (cfgRequired) p("required inside an optional object must be optional in the editor");
    const rule = rules.find(
      (r) => r.scope === ctx.scope && r.object.join(".") === ctx.optionalParent,
    );
    if (!rule?.fields.includes(cfg.name)) p("missing all-or-nothing rule in cms-data.js");
  } else if (cfgRequired !== node.required) p(`required ${cfgRequired} ≠ zod ${node.required}`);

  if (node.default !== undefined && !["object", "record"].includes(node.kind)) {
    if (JSON.stringify(cfg.default) !== JSON.stringify(node.default))
      p(`default ${JSON.stringify(cfg.default)} ≠ zod ${JSON.stringify(node.default)}`);
  } else if (
    cfg.default !== undefined &&
    !(cfg.widget === "datetime" && cfg.default === "{{now}}")
  ) {
    p(`config default ${JSON.stringify(cfg.default)} but zod has none`);
  }

  // A retired field (redesign home-2: site.figure_mode) is hidden from editors; only
  // its presence, required flag and default are compared above.
  if (cfg.widget === "hidden") return;

  switch (node.kind) {
    case "string": {
      if (node.format === "slug") {
        if (cfg.widget !== "relation" || cfg.multiple) p("slug must be a single relation");
        checkRelation(cfg, at, problems);
        break;
      }
      if (cfg.widget === "datetime" && !cfg.format) p("datetime without storage format");
      if (NO_PATTERN_WIDGETS.has(cfg.widget)) {
        if (cfg.pattern) p(`${cfg.widget} widget must not carry a pattern`);
        if (["file", "image"].includes(cfg.widget) && node.format !== "url")
          p("file/image widget on a non-URL field");
        if (
          ["richtext", "markdown"].includes(cfg.widget) &&
          (node.maxLength || node.patterns.length)
        )
          p("constrained string uses an unconstrained rich-text widget");
        break;
      }
      const minMatters = node.minLength != null && node.minLength > (node.required ? 1 : 0);
      const constrained =
        node.maxLength != null || minMatters || node.patterns.length || node.format;
      if (constrained && !cfg.pattern) p("constrained in zod but no pattern in config");
      if (!constrained && cfg.pattern) p("pattern in config but unconstrained in zod");
      if (cfg.pattern) {
        const re = new RegExp(cfg.pattern[0]);
        const isUrl = node.format === "url" || node.format === "https-url";
        for (const v of stringSamples(node)) {
          const zodOk = zod.safeParse(v).success && !(isUrl && /^http:\/\//i.test(v.trim()));
          if (re.test(v) !== zodOk)
            p(`sample ${JSON.stringify(v)}: CMS ${re.test(v)} vs zod ${zodOk}`);
        }
      }
      break;
    }
    case "number":
      if (cfg.widget !== "number") p(`widget ${cfg.widget} for a number`);
      if ((cfg.value_type === "int") !== node.int) p(`value_type ${cfg.value_type}`);
      if (cfg.min !== node.min) p(`min ${cfg.min} ≠ ${node.min}`);
      if (node.dynamicMax) {
        if (cfg.max !== undefined) p("year max must be left to the schema (it moves every year)");
      } else if (cfg.max !== node.max) p(`max ${cfg.max} ≠ ${node.max}`);
      break;
    case "boolean":
      if (cfg.widget !== "boolean") p(`widget ${cfg.widget} for a boolean`);
      break;
    case "enum": {
      if (cfg.widget !== "select" || cfg.multiple) p("enum must be a single select");
      const values = (cfg.options ?? []).map((o: Cfg) => (typeof o === "string" ? o : o.value));
      if (JSON.stringify(values) !== JSON.stringify(node.values))
        p(`options ${JSON.stringify(values)} ≠ zod ${JSON.stringify(node.values)}`);
      break;
    }
    case "array": {
      if (cfg.min !== node.minItems) p(`min ${cfg.min} ≠ ${node.minItems}`);
      if (cfg.max !== node.maxItems) p(`max ${cfg.max} ≠ ${node.maxItems}`);
      const items = node.items;
      if (cfg.widget === "relation") {
        if (!(items.kind === "string" && items.format === "slug"))
          p("relation list over non-slug items");
        if (!cfg.multiple) p("list of slugs must be a multiple relation");
        checkRelation(cfg, at, problems);
      } else if (cfg.widget === "list") {
        if (items.kind === "object") {
          compareFields(
            cfg.fields,
            items,
            zodItems(zod),
            at,
            { ...ctx, optionalParent: undefined },
            problems,
          );
        } else {
          if (!cfg.field) p("list of values needs `field`");
          else
            compareField(
              { ...cfg.field, required: true },
              { ...items, required: true },
              zodItems(zod),
              `${at}[]`,
              ctx,
              problems,
            );
        }
      } else p(`widget ${cfg.widget} for a list`);
      break;
    }
    case "object":
      if (cfg.widget !== "object") p(`widget ${cfg.widget} for an object`);
      compareFields(
        cfg.fields,
        node,
        zod,
        at,
        node.required ? ctx : { ...ctx, optionalParent: at.split(".").slice(1).join(".") },
        problems,
      );
      break;
    case "record": {
      if (cfg.widget !== "object") p("record must be an object of fixed keys");
      const valueZod = def(unwrap(zod)).valueType as ZodType;
      for (const sub of cfg.fields ?? []) {
        if (sub.required !== false) p(`record key ${sub.name} must be optional`);
        const re = sub.pattern ? new RegExp(sub.pattern[0]) : null;
        for (const v of SAMPLES) {
          const zodOk = valueZod.safeParse(v).success && !/^http:\/\//i.test(v);
          if ((re ? re.test(v) : true) !== zodOk)
            p(`${sub.name} sample ${JSON.stringify(v)} disagrees`);
        }
      }
      break;
    }
    default:
      p(`unknown kind ${node.kind}`);
  }
}

interface Ctx {
  scope: string;
  optionalParent?: string;
}

function compareFields(
  cfgFields: Cfg[] | undefined,
  obj: Node,
  zod: ZodType,
  at: string,
  ctx: Ctx,
  problems: string[],
) {
  const cfgNames = (cfgFields ?? []).map((f) => f.name);
  const zodNames = obj.fields.map((f: Cfg) => f.name);
  for (const n of zodNames)
    if (!cfgNames.includes(n)) problems.push(`${at}.${n}: in zod, missing in config.yml`);
  for (const n of cfgNames)
    if (!zodNames.includes(n)) problems.push(`${at}.${n}: in config.yml, not in zod`);
  for (const f of obj.fields as Array<{ name: string; node: Node }>) {
    const cfg = (cfgFields ?? []).find((c) => c.name === f.name);
    if (cfg) compareField(cfg, f.node, zodChild(zod, f.name), `${at}.${f.name}`, ctx, problems);
  }
}

function checkRelation(cfg: Cfg, at: string, problems: string[]) {
  const target = (config.collections as Cfg[]).find((c) => c.name === cfg.collection);
  if (!target?.folder) problems.push(`${at}: relation to unknown collection ${cfg.collection}`);
  if (cfg.value_field !== "{{slug}}")
    problems.push(`${at}: relation must store the slug ({{slug}})`);
  for (const f of cfg.search_fields ?? [])
    if (!target?.fields?.some((x: Cfg) => x.name === f))
      problems.push(`${at}: search field ${f} not in ${cfg.collection}`);
}

describe("config.yml ↔ zod schema parity", () => {
  it("has exactly the schema's collections, pages and site", () => {
    expect(
      scopes()
        .map((s) => s.key)
        .sort(),
    ).toEqual(Object.keys(models).sort());
  });

  for (const s of scopes()) {
    it(`${s.key}: fields and constraints match both ways`, () => {
      const problems: string[] = [];
      compareFields(
        s.fields,
        models[s.key]!,
        zodRoots[s.key]!,
        s.key,
        { scope: s.scope },
        problems,
      );
      expect(problems).toEqual([]);
    });
  }

  it("every object-level refinement in zod (cross-field rule) has an enforced rule in cms-data.js", () => {
    const order = (
      runAdminScripts(["cms-data.js"]).window.BOBALAB_CMS as {
        rules: { order: Array<{ scope: string; earlier: string; later: string }> };
      }
    ).rules.order;
    for (const [key, model] of Object.entries(models)) {
      const n = (model.refinements as number | undefined) ?? 0;
      const rulesHere = order.filter((r) => r.scope === key);
      expect({ key, rules: rulesHere.length }).toEqual({ key, rules: n });
      for (const r of rulesHere) {
        // The rule mirrors zod: a value earlier than its partner is rejected by both.
        const schema = zodRoots[key]!;
        const base =
          key === "people" ? { name: "A B", role: "phd" } : { title: "T", status: "active" };
        const [lo, hi] = key === "people" ? ["2023", "2024"] : [2023, 2024];
        expect(schema.safeParse({ ...base, [r.earlier]: hi, [r.later]: lo }).success).toBe(false);
        expect(schema.safeParse({ ...base, [r.earlier]: lo, [r.later]: hi }).success).toBe(true);
      }
    }
  });

  it("the folder of each collection is content/<name>/ (the loader's layout)", () => {
    for (const c of config.collections as Cfg[])
      if (c.folder) {
        expect(c.folder).toBe(`content/${c.name}`);
        expect(c.extension).toBe("md");
        expect(c.format).toBe("frontmatter");
      }
  });

  it("the parity checker itself catches drift (self-test on a mutated copy)", () => {
    const news = (config.collections as Cfg[]).find((c) => c.name === "news")!;
    const mutated = structuredClone(news.fields) as Cfg[];
    mutated.find((f) => f.name === "title")!.pattern = ["^[\\s\\S]{0,999}$", "x"]; // too permissive
    mutated.find((f) => f.name === "type")!.options.pop(); // option dropped
    mutated.push({ name: "extra", label: "Extra", widget: "string" }); // unknown field
    const problems: string[] = [];
    compareFields(mutated, models.news!, zodRoots.news!, "news", { scope: "news" }, problems);
    expect(problems.some((x) => x.startsWith("news.title: sample"))).toBe(true);
    expect(problems.some((x) => x.startsWith("news.type: options"))).toBe(true);
    expect(problems).toContain("news.extra: in config.yml, not in zod");
  });
});
