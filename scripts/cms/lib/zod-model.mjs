/**
 * Turn a zod 4 schema into a small, plain "field model" that the Decap config
 * generator (./decap-config.mjs) and the parity test (tests/unit/cms) both
 * understand. Only the zod features src/lib/content/schema.ts uses are handled;
 * anything else throws, so a schema change can never be silently ignored.
 *
 * Node shape:
 *   { kind: "string",  required, default?, minLength?, maxLength?, patterns: RegExp[], format? }
 *   { kind: "number",  required, default?, int, min?, max?, dynamicMax? }
 *   { kind: "boolean", required, default? }
 *   { kind: "enum",    required, default?, values: string[] }
 *   { kind: "array",   required, default?, minItems?, maxItems?, items: Node }
 *   { kind: "object",  required, default?, fields: Array<{ name, node }>, refinements }
 *   { kind: "record",  required, default?, values: Node }
 * `required` = the key must be present in the file (not optional, no default).
 * `format` is set by identity with the shared field types exported by schema.ts:
 *   url (https URL or site path), https-url, slug, date, date-or-datetime,
 *   year-month, partial-date, email.
 */

const def = (s) => s?._zod?.def;

/** Shared field types in schema.ts → format names (matched by object identity). */
export function formatRefs(m) {
  return new Map(
    [
      [m.urlField, "url"],
      [m.externalUrlField, "https-url"],
      [m.slugRef, "slug"],
      [m.isoDate, "date"],
      [m.isoDateOrDateTime, "date-or-datetime"],
      [m.yearMonth, "year-month"],
      [m.partialDate, "partial-date"],
      [m.yearField, "year"],
    ].filter(([k]) => k),
  );
}

function checksOf(d) {
  return (d.checks ?? []).map((c) => def(c) ?? {});
}

export function modelOf(schema, refs) {
  let required = true;
  let dflt;
  let format;
  let s = schema;
  // Unwrap optional / default / preprocess pipes, noting identity formats on the way.
  for (let guard = 0; guard < 10; guard++) {
    if (refs.has(s) && !format) format = refs.get(s);
    const d = def(s);
    if (!d) throw new Error("not a zod schema");
    if (d.type === "optional") {
      required = false;
      s = d.innerType;
    } else if (d.type === "default") {
      required = false;
      dflt = typeof d.defaultValue === "function" ? d.defaultValue() : d.defaultValue;
      s = d.innerType;
    } else if (d.type === "pipe" && def(d.in)?.type === "transform") {
      s = d.out;
    } else break;
  }
  if (refs.has(s) && !format) format = refs.get(s);
  const d = def(s);
  const base = { required, ...(dflt !== undefined ? { default: dflt } : {}) };

  switch (d.type) {
    case "string": {
      const node = { kind: "string", ...base, patterns: [] };
      if (format && format !== "year") node.format = format;
      if (d.format === "email") {
        node.format = "email";
        node.patterns.push(d.pattern);
      }
      for (const c of checksOf(d)) {
        if (c.check === "min_length") node.minLength = c.minimum;
        else if (c.check === "max_length") node.maxLength = c.maximum;
        else if (c.check === "string_format" && c.format === "regex") node.patterns.push(c.pattern);
        else if (c.check === "string_format" && c.format === "email") {
          node.format = "email";
          node.patterns.push(c.pattern);
        } else if (c.check === "overwrite") node.trim = true;
        else if (c.check === "custom") node.refined = true;
        else throw new Error(`unsupported string check ${c.check}/${c.format}`);
      }
      if (node.refined && !node.format) throw new Error("refined string without a known format");
      return node;
    }
    case "number": {
      const node = { kind: "number", ...base, int: false };
      for (const c of checksOf(d)) {
        if (c.check === "number_format") node.int = /int/.test(c.format);
        else if (c.check === "greater_than") {
          if (!c.inclusive) throw new Error("exclusive minimum unsupported");
          node.min = c.value;
        } else if (c.check === "less_than") {
          if (!c.inclusive) throw new Error("exclusive maximum unsupported");
          node.max = c.value;
        } else throw new Error(`unsupported number check ${c.check}`);
      }
      // yearField's maximum is "next year", computed when the schema loads.
      if (format === "year") node.dynamicMax = true;
      return node;
    }
    case "boolean":
      return { kind: "boolean", ...base };
    case "enum":
      return { kind: "enum", ...base, values: Object.values(d.entries) };
    case "array": {
      const node = { kind: "array", ...base, items: modelOf(d.element, refs) };
      for (const c of checksOf(d)) {
        if (c.check === "min_length") node.minItems = c.minimum;
        else if (c.check === "max_length") node.maxItems = c.maximum;
        else throw new Error(`unsupported array check ${c.check}`);
      }
      return node;
    }
    case "object": {
      const fields = Object.entries(d.shape).map(([name, child]) => ({
        name,
        node: modelOf(child, refs),
      }));
      const refinements = checksOf(d).filter((c) => c.check === "custom").length;
      return { kind: "object", ...base, fields, refinements };
    }
    case "record":
      return { kind: "record", ...base, values: modelOf(d.valueType, refs) };
    default:
      throw new Error(`unsupported zod type "${d.type}"`);
  }
}

/** All content schemas as models, keyed the way the CMS source refers to them. */
export function contentModels(m) {
  const refs = formatRefs(m);
  const out = {};
  for (const [name, schema] of Object.entries(m.COLLECTION_SCHEMAS))
    out[name] = modelOf(schema, refs);
  for (const [name, schema] of Object.entries(m.PAGE_SCHEMAS))
    out[`pages/${name}`] = modelOf(schema, refs);
  out.site = modelOf(m.siteSchema, refs);
  return out;
}
