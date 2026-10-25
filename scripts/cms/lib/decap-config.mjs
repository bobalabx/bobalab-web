/**
 * Pure generator: zod field models (./zod-model.mjs) + the editor-facing source
 * (cms/source.mjs) → a Decap CMS 3.x config object, plus the admin page CSP.
 * No file I/O here; scripts/cms/build-config.mjs writes the files and the unit
 * tests (tests/unit/cms) call it in memory.
 */

/** https only: the validator rejects http:// (E_HTTP_URL), so the CMS does too. */
export const HTTPS_URL_RE = "^https://\\S+$";
/** zod urlField: an https URL or a site path starting with "/" (not "//host" or "/\host"). */
export const URL_OR_PATH_RE = "^(?:https://\\S+|/(?![/\\\\])\\S*)$";

const FORMAT_RULES = {
  url: { re: URL_OR_PATH_RE, msg: "Use a full https:// address or a site path starting with /." },
  "https-url": { re: HTTPS_URL_RE, msg: "Use a full address starting with https://." },
  email: { msg: "Use an email address such as name@berkeley.edu." },
  date: { msg: "Use a date YYYY-MM-DD." },
  "date-or-datetime": { msg: "Use a date YYYY-MM-DD (optionally with a time)." },
  "year-month": { msg: "Use YYYY or YYYY-MM, e.g. 2026-09." },
  "partial-date": { msg: "Use YYYY, YYYY-MM or YYYY-MM-DD." },
};

/** Lookahead that bounds the length: (?=^[\s\S]{min,max}$). */
export function lengthLookahead(min, max) {
  if (min == null && max == null) return null;
  return `(?=^[\\s\\S]{${min ?? 0},${max ?? ""}}$)`;
}

/**
 * One Decap `pattern` regex for every string constraint of a node: length
 * bounds and each regex become anchored lookaheads, so they all must hold.
 * Returns null when the string is unconstrained.
 */
export function stringPattern(node) {
  const parts = [];
  // min 1 on a required field is what `required` already enforces.
  const min =
    node.minLength != null && node.minLength > (node.required ? 1 : 0) ? node.minLength : null;
  const len = lengthLookahead(min, node.maxLength);
  if (len) parts.push(len);
  const rule = node.format ? FORMAT_RULES[node.format] : null;
  if (rule?.re) parts.push(`(?=${rule.re})`);
  for (const p of node.patterns ?? []) parts.push(`(?=${p.source})`);
  if (!parts.length) return null;
  const msgs = [];
  if (node.maxLength != null) msgs.push(`At most ${node.maxLength} characters.`);
  if (min != null) msgs.push(`At least ${min} characters.`);
  if (rule) msgs.push(rule.msg);
  return { regex: parts.join(""), message: msgs.join(" ") || "Check the format." };
}

function humanize(name) {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relationProps(target, relations, path) {
  const r = relations[target];
  if (!r) throw new Error(`${path}: unknown relation target "${target}"`);
  return {
    widget: "relation",
    collection: r.collection,
    value_field: "{{slug}}",
    search_fields: r.search_fields,
    display_fields: r.display_fields,
    ...(r.filters ? { filters: r.filters } : {}),
    options_length: 100,
  };
}

/** Widgets that never get a `pattern` (see buildField). */
export const NO_PATTERN_WIDGETS = new Set(["richtext", "markdown", "file", "image"]);

const UI_KEYS = new Set([
  "label",
  "hint",
  "widget",
  "relation",
  "options",
  "fields",
  "field",
  "keys",
  "message",
]);

function passThrough(ui) {
  const out = {};
  for (const [k, v] of Object.entries(ui)) if (!UI_KEYS.has(k)) out[k] = v;
  return out;
}

function enumOptions(node, ui, path) {
  const labels = ui.options;
  if (!labels) throw new Error(`${path}: enum field needs \`options\` labels in cms/source.mjs`);
  const keys = Object.keys(labels);
  const missing = node.values.filter((v) => !keys.includes(v));
  const extra = keys.filter((k) => !node.values.includes(k));
  if (missing.length || extra.length) {
    throw new Error(
      `${path}: options do not match the schema enum (missing: ${missing.join(", ") || "-"}; extra: ${extra.join(", ") || "-"})`,
    );
  }
  return node.values.map((value) => ({ label: labels[value], value }));
}

/**
 * Build one Decap field from a zod node and its UI entry.
 * @param {string} name
 * @param {object} node   zod field model
 * @param {object|undefined} ui
 * @param {object} ctx    { relations, path }
 */
export function buildField(name, node, ui, ctx) {
  const path = ctx.path ? `${ctx.path}.${name}` : name;
  if (!ui) throw new Error(`${path}: in the zod schema but missing from cms/source.mjs`);
  const f = { label: ui.label ?? humanize(name), name };
  const extra = passThrough(ui);
  const put = (k, v) => {
    if (v !== undefined) f[k] = v;
  };
  const sub = { ...ctx, path };

  // A retired field kept in the schema so old files still parse: editors never see
  // it, but it keeps the schema's required flag and default (redesign home-2).
  if (ui.widget === "hidden") f.widget = "hidden";
  else
    switch (node.kind) {
      case "string": {
        if (node.format === "slug") {
          if (!ui.relation) throw new Error(`${path}: slug field needs \`relation\``);
          Object.assign(f, relationProps(ui.relation, ctx.relations, path), { multiple: false });
          break;
        }
        const widget = ui.widget ?? (node.format === "date" ? "datetime" : "string");
        f.widget = widget;
        if (widget === "datetime" && !ui.format) {
          // Without `format` Decap stores a Date, which YAML would not keep as our string.
          throw new Error(`${path}: datetime field needs an explicit storage \`format\``);
        }
        const pat = stringPattern(node);
        // No pattern on file/image widgets: MEASURED in Decap 3.17.1 a valid
        // https:// value in a file widget fails pattern validation, which blocks
        // saving. Uploads always produce /uploads/… paths; a typed http:// link is
        // still caught by the validator (E_HTTP_URL) in the validate-content check.
        if (pat && !NO_PATTERN_WIDGETS.has(widget))
          put("pattern", [pat.regex, ui.message ?? pat.message]);
        break;
      }
      case "number":
        f.widget = "number";
        f.value_type = node.int ? "int" : "float";
        put("min", node.min);
        if (!node.dynamicMax) put("max", node.max);
        if (node.int) f.step = 1;
        break;
      case "boolean":
        f.widget = "boolean";
        break;
      case "enum":
        f.widget = "select";
        f.options = enumOptions(node, ui, path);
        f.multiple = false;
        break;
      case "array": {
        const items = node.items;
        if (items.kind === "string" && items.format === "slug" && !ui.field) {
          if (!ui.relation) throw new Error(`${path}: list of slugs needs \`relation\``);
          Object.assign(f, relationProps(ui.relation, ctx.relations, path), { multiple: true });
          put("min", node.minItems);
          put("max", node.maxItems);
          break;
        }
        f.widget = "list";
        if (items.kind === "object") {
          if (!ui.fields) throw new Error(`${path}: list of objects needs \`fields\``);
          f.fields = buildFields(items, ui.fields, sub);
          f.collapsed = true;
        } else {
          const itemUi = ui.field ?? { label: humanize(name) };
          const itemName = (itemUi.label ?? "item").toLowerCase().replace(/[^a-z0-9]+/g, "_");
          f.field = buildField(itemName, { ...items, required: true }, itemUi, sub);
        }
        f.allow_add = true;
        put("min", node.minItems);
        put("max", node.maxItems);
        break;
      }
      case "object": {
        if (!ui.fields) throw new Error(`${path}: object needs \`fields\``);
        f.widget = "object";
        // Decap enforces `required` subfields even when an optional object is left
        // empty, so inside an optional object they become optional in the editor and
        // cms-hooks.js enforces "all or nothing" on save (rules from allOrNothingRules).
        const objCtx = node.required ? sub : { ...sub, optionalParent: { path, label: f.label } };
        f.fields = buildFields(node, ui.fields, objCtx);
        break;
      }
      case "record": {
        if (!ui.keys) throw new Error(`${path}: record needs \`keys\``);
        f.widget = "object";
        f.fields = Object.entries(ui.keys).map(([k, kUi]) =>
          buildField(k, { ...node.values, required: false }, kUi, sub),
        );
        break;
      }
      default:
        throw new Error(`${path}: unsupported kind ${node.kind}`);
    }

  f.required = node.required;
  if (node.required && ctx.optionalParent) {
    f.required = false;
    ctx.rules?.push({
      object: ctx.optionalParent.path,
      label: ctx.optionalParent.label,
      field: name,
      fieldLabel: f.label,
    });
  }
  if (node.default !== undefined && !(node.kind === "object" || node.kind === "record")) {
    f.default = node.default;
  }
  if (ui.hint) f.hint = ui.hint;
  // Explicit editor options last (collapsed, summary, datetime formats, media, a datetime default…).
  for (const [k, v] of Object.entries(extra)) {
    if (k === "default" && node.default !== undefined && v !== node.default) {
      throw new Error(`${path}: default ${JSON.stringify(v)} differs from the schema default`);
    }
    f[k] = v;
  }
  return f;
}

/** Fields of an object node, in the source's order, failing on either-side gaps. */
export function buildFields(objectNode, uiFields, ctx) {
  const zodNames = objectNode.fields.map((x) => x.name);
  const uiNames = Object.keys(uiFields);
  const extra = uiNames.filter((n) => !zodNames.includes(n));
  if (extra.length) {
    throw new Error(
      `${ctx.path || "(root)"}: cms/source.mjs has field(s) the zod schema lacks: ${extra.join(", ")}`,
    );
  }
  const missing = zodNames.filter((n) => !uiNames.includes(n));
  if (missing.length) {
    throw new Error(
      `${ctx.path || "(root)"}: zod field(s) missing from cms/source.mjs: ${missing.join(", ")}`,
    );
  }
  return uiNames.map((n) =>
    buildField(n, objectNode.fields.find((x) => x.name === n).node, uiFields[n], ctx),
  );
}

/**
 * The whole Decap config.
 * @param {Record<string, object>} models  contentModels(schemaModule)
 * @param {object} source                 cms/source.mjs namespace
 * @param {{ mode?: "production" | "local", localSiteUrl?: string, proxyUrl?: string, rules?: object[] }} [opts]
 */
export function buildDecapConfig(models, source, opts = {}) {
  const rules = opts.rules ?? [];
  const mode = opts.mode ?? "production";
  const local = mode === "local";
  const relations = source.relations;
  const siteUrl = local ? (opts.localSiteUrl ?? "http://localhost:3100") : source.SITE_URL;

  const folder = source.collections.map((c) => {
    const model = models[c.name];
    if (!model) throw new Error(`collection ${c.name}: no zod schema of that name`);
    const col = {
      name: c.name,
      label: c.label,
      label_singular: c.label_singular,
      description: c.description,
      folder: c.folder,
      create: true,
      // Archive instead of deleting; deleting a published file would also have
      // to bypass the protected main branch (docs/EDITING.md).
      delete: false,
      extension: "md",
      format: "frontmatter",
      slug: c.slug,
      identifier_field: c.identifier_field,
      summary: c.summary,
      sortable_fields: c.sortable_fields,
      view_filters: c.view_filters,
      view_groups: c.view_groups,
      fields: buildFields(model, c.fields, {
        relations,
        path: c.name,
        rules: scoped(rules, c.name),
      }),
    };
    for (const k of Object.keys(col)) if (col[k] === undefined) delete col[k];
    return col;
  });

  const files = source.fileCollections.map((fc) => ({
    name: fc.name,
    label: fc.label,
    description: fc.description,
    delete: false,
    ...(fc.preview === false ? { editor: { preview: false } } : {}),
    files: fc.files.map((file) => {
      const model = models[file.schema];
      if (!model) throw new Error(`file ${file.name}: unknown schema ${file.schema}`);
      const out = {
        name: file.name,
        label: file.label,
        file: file.file,
        ...(file.description ? { description: file.description } : {}),
        fields: buildFields(model, file.fields, {
          relations,
          path: `${fc.name}/${file.name}`,
          rules: scoped(rules, `${fc.name}/${file.name}`),
        }),
      };
      return out;
    }),
  }));

  const config = {
    backend: { ...source.backend },
    ...(local ? { local_backend: opts.proxyUrl ? { url: opts.proxyUrl } : true } : {}),
    publish_mode: local ? "simple" : "editorial_workflow",
    site_url: siteUrl,
    display_url: siteUrl,
    // Relative to /admin/, so it also works under a base path (github.io/<repo>/admin/).
    logo: { src: "logo.svg", show_in_header: false },
    show_preview_links: false,
    media_folder: source.media.media_folder,
    public_folder: source.media.public_folder,
    slug: { encoding: "ascii", clean_accents: true, sanitize_replacement: "-" },
    editor: { preview: true },
    collections: [...folder, ...files],
  };
  return config;
}

/** A push-only view of the rules array that tags each rule with its scope and data path. */
function scoped(rules, scope) {
  return {
    push(r) {
      const object = r.object.slice(scope.length + 1).split(".");
      rules.push({ scope, object, label: r.label, field: r.field, fieldLabel: r.fieldLabel });
    },
  };
}

/**
 * "All or nothing" rules for optional objects with required subfields (e.g. a
 * news link needs both text and address): [{ scope, object: [path], label, fields, fieldLabels }].
 * scope = folder collection name, or "<files collection>/<file name>".
 */
export function allOrNothingRules(models, source) {
  const flat = [];
  buildDecapConfig(models, source, { rules: flat });
  const byKey = new Map();
  for (const r of flat) {
    const key = `${r.scope}:${r.object.join(".")}`;
    if (!byKey.has(key))
      byKey.set(key, {
        scope: r.scope,
        object: r.object,
        label: r.label,
        fields: [],
        fieldLabels: [],
      });
    byKey.get(key).fields.push(r.field);
    byKey.get(key).fieldLabels.push(r.fieldLabel);
  }
  return [...byKey.values()];
}

/** Content-Security-Policy for /admin/ (a <meta>, so no frame-ancestors). */
export function adminCsp(source, { local = false, extraConnect = [] } = {}) {
  const c = source.csp;
  // blob: Decap reads its own object URLs back with fetch (draft backups, media previews).
  const connect = [
    "'self'",
    "blob:",
    ...c.connect,
    ...c.oauth,
    ...(local ? [...c.localConnect, ...extraConnect] : []),
  ];
  const directives = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", ...(c.unsafeEval ? ["'unsafe-eval'"] : [])]],
    // Decap's UI (emotion) and the preview iframe inject <style> elements.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...c.img]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connect],
    // No media-src, frame-src or worker-src: they fall back to default-src 'self'.
    // decap-cms 3.17.1 starts no workers, plays no media in this config, and its
    // preview pane is a srcdoc iframe (WP6 review: removed the blob: sources there).
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'none'"]],
  ];
  return directives.map(([k, v]) => `${k} ${[...new Set(v)].join(" ")}`).join("; ");
}
