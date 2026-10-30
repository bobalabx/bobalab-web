/**
 * public/admin/cms-hooks.js: the preSave listener that tidies data before Decap
 * writes a file, and blocks saves that the content validator would reject.
 */
import { describe, expect, it } from "vitest";
import { Files, codes, errors } from "../../content/helpers";
import { FakeList, FakeMap, entry, fromJS, runAdminScripts, toJS } from "./helpers";

const { reg, window } = runAdminScripts(["cms-data.js", "cms-hooks.js"]);
const hooks = window.BobalabCmsHooks as {
  clean: (v: unknown) => unknown;
  missingAlt: (d: unknown) => string[];
  incompleteGroups: (d: unknown, scope: string, rules: unknown) => string[];
  preSave: (a: { entry: FakeMap }) => FakeMap;
};
const save = (collection: string, data: Record<string, unknown>, slug = "x") =>
  toJS(reg.events[0]!.handler({ entry: entry(collection, slug, data) }));

describe("cms-hooks.js", () => {
  it("registers the preSave listeners: the main one, then the asynchronous colour check", () => {
    expect(reg.events.map((e) => e.name)).toEqual(["preSave", "preSave"]);
  });

  it("drops cleared optional values and trims text, keeping false, 0 and empty lists", () => {
    const cleaned = toJS(
      hooks.clean(
        fromJS({
          title: "  A title  ",
          summary: "",
          location: "   ",
          event_date: null,
          draft: false,
          rank: 0,
          people: [],
          link: { label: "", url: "" },
          links: { pdf: "", ssrn: "https://ssrn.com/x" },
          methods: ["Field experiments", ""],
          authors: [{ name: "A", person: "", url: "" }, { name: "" }],
        }),
      ),
    );
    expect(cleaned).toEqual({
      title: "A title",
      draft: false,
      rank: 0,
      people: [],
      links: { ssrn: "https://ssrn.com/x" },
      methods: ["Field experiments"],
      authors: [{ name: "A" }],
    });
  });

  it("keeps Immutable-like types (maps stay maps, lists stay lists)", () => {
    const out = hooks.clean(fromJS({ a: [1], b: { c: "x" } })) as FakeMap;
    expect(out).toBeInstanceOf(FakeMap);
    expect(out.get("a")).toBeInstanceOf(FakeList);
    expect(out.get("b")).toBeInstanceOf(FakeMap);
  });

  it("blocks a save when an image has no alt text (E_ALT_MISSING)", () => {
    expect(() => save("news", { title: "T", image: { image: "/uploads/a.jpg" } })).toThrow(
      /alt text/i,
    );
    expect(() => save("directions", { figure: { image: "/uploads/f.png", alt: " " } })).toThrow(
      /Figure/,
    );
    expect(() => save("people", { name: "A B", photo: "/uploads/p.jpg" })).toThrow(/Photo/);
    expect(
      save("news", { title: "T", image: { image: "/uploads/a.jpg", alt: "A chart" } }),
    ).toEqual({
      title: "T",
      image: { image: "/uploads/a.jpg", alt: "A chart" },
    });
    // alt without an image is harmless
    expect(save("projects", { hero: { alt: "x" }, draft: true })).toEqual({
      hero: { alt: "x" },
      draft: true,
    });
  });

  it("enforces all-or-nothing groups from cms-data.js (news link needs text and address)", () => {
    const rules = (window.BOBALAB_CMS as { rules: { allOrNothing: Array<{ scope: string }> } })
      .rules.allOrNothing;
    expect(rules.some((r) => r.scope === "news")).toBe(true);
    expect(() => save("news", { title: "T", link: { url: "https://x.org" } })).toThrow(/Link text/);
    expect(() => save("news", { title: "T", link: { label: "Programme" } })).toThrow(/Address/);
    expect(save("news", { title: "T", link: { label: "", url: "" } })).toEqual({ title: "T" });
    expect(save("news", { title: "T", link: { label: "P", url: "https://x.org" } })).toEqual({
      title: "T",
      link: { label: "P", url: "https://x.org" },
    });
  });

  it("blocks a save that breaks a cross-field rule (person End before Start, project years)", () => {
    expect(() => save("people", { name: "A B", start: "2024-05", end: "2023" })).toThrow(
      /End \(2023\) is before Start \(2024-05\)/,
    );
    expect(save("people", { name: "A B", start: "2024", end: "2024-06" })).toEqual({
      name: "A B",
      start: "2024",
      end: "2024-06",
    });
    expect(() =>
      save("projects", { title: "P", directions: ["d"], start_year: 2025, end_year: 2024 }),
    ).toThrow(/End year \(2024\) is before Start year \(2025\)/);
    expect(
      save("projects", { title: "P", directions: ["d"], start_year: 2025, end_year: "" }),
    ).toEqual({
      title: "P",
      directions: ["d"],
      start_year: 2025,
    });
  });

  describe("file names of new entries (D-05 slugs, validator E_SLUG)", () => {
    const cfg = window.BOBALAB_CMS as {
      rules: { slugs: Record<string, { template: string; identifier: string }> };
    };
    const slugs = cfg.rules.slugs;
    const ext = hooks as unknown as {
      expectedSlug: (t: string, d: unknown, id: string, now: Date) => string | null;
      slugProblem: (e: FakeMap, d: unknown, rules: unknown) => string | null;
    };
    const now = new Date("2026-10-20T12:00:00Z");
    const expected = (c: string, data: Record<string, unknown>) =>
      ext.expectedSlug(slugs[c]!.template, fromJS(data), slugs[c]!.identifier, now);
    const newEntry = (c: string, data: Record<string, unknown>) =>
      fromJS({ collection: c, slug: "", newRecord: true, data }) as FakeMap;

    it("re-computes Decap's names: news, publications, people, directions, projects", () => {
      expect(expected("news", { date: "2026-10-20", title: "CMS smoke test (delete me)" })).toBe(
        "2026-10-20-cms-smoke-test-delete-me",
      );
      expect(
        expected("publications", {
          title: "Managing Multihoming Workers in the Gig Economy",
          authors: [{ name: "Wichinpong Park Sinchaisri" }, { name: "Gad Allon" }],
        }),
      ).toBe("wichinpong-park-sinchaisri-2026-managing-multihoming-workers");
      expect(expected("people", { name: "José Ñúñez-O'Neil" })).toBe("jose-nunez-oneil");
      expect(expected("directions", { title: "x", short_label: "AI at Work" })).toBe("ai-at-work");
      expect(expected("projects", { title: "Authority Design for AI Agents" })).toBe(
        "authority-design-for-ai-agents",
      );
    });

    it("the PI as first author with a long title stays within 60 characters", () => {
      const s = expected("publications", {
        title: "A very long working paper title that goes on and on and on",
        authors: [{ name: "Wichinpong Park Sinchaisri" }],
      })!;
      expect(s.length).toBeLessThanOrEqual(60);
      expect(
        ext.slugProblem(
          newEntry("publications", {
            title: "A very long working paper title that goes on and on and on",
            authors: [{ name: "Wichinpong Park Sinchaisri" }],
          }),
          fromJS({
            title: "A very long working paper title that goes on and on and on",
            authors: [{ name: "Wichinpong Park Sinchaisri" }],
          }),
          slugs,
        ),
      ).toBeNull();
    });

    it("blocks the first save when the name would break the rule, with advice", () => {
      const pub = {
        title: "Learning on the Go",
        type: "journal",
        status: "published",
        directions: ["d"],
        authors: [{ name: "Maximiliana Alexandra von Hohenberg-Ostrowski" }],
      };
      expect(() => save("publications", pub)).not.toThrow(); // existing entry: no check
      const msg = ext.slugProblem(newEntry("publications", pub), fromJS(pub), slugs);
      expect(msg).toMatch(/at most 60 are allowed/);
      expect(msg).toMatch(/last name/);
      expect(() => reg.events[0]!.handler({ entry: newEntry("publications", pub) })).toThrow(
        /Not saved/,
      );

      const person = { name: "Madonna", role: "undergrad" };
      expect(ext.slugProblem(newEntry("people", person), fromJS(person), slugs)).toMatch(
        /first and a last name/,
      );
      const ok = { name: "Jane Doe", role: "undergrad" };
      expect(ext.slugProblem(newEntry("people", ok), fromJS(ok), slugs)).toBeNull();
    });

    it("lets through what it cannot evaluate (never a false block)", () => {
      expect(ext.expectedSlug("{{fields.x | unknown}}", fromJS({ x: "a" }), "x", now)).toBeNull();
      expect(ext.expectedSlug("{{hour}}-{{slug}}", fromJS({ t: "a" }), "t", now)).toBeNull();
      const rules = {
        news: {
          template: "{{fields.d | nope}}",
          identifier: "t",
          pattern: "^x$",
          hint: "x",
          max: 1,
        },
      };
      expect(ext.slugProblem(newEntry("news", { d: "1" }), fromJS({ d: "1" }), rules)).toBeNull();
    });
  });

  it("returns the cleaned data for Decap to write", () => {
    expect(save("news", { title: "T", summary: "", draft: false })).toEqual({
      title: "T",
      draft: false,
    });
  });
});

type Rule = { code: string; scope: string; message: string };
const cfgRules = (window.BOBALAB_CMS as { rules: { required: Rule[]; unique: Rule[] } }).rules;
const ext2 = window.BobalabCmsHooks as unknown as {
  clean: (v: unknown) => unknown;
  requiredProblems: (d: unknown, scope: string, rules: unknown) => string[];
  uniqueProblems: (d: unknown, scope: string, rules: unknown) => string[];
  editorRoute: (h: string) => unknown;
  routeProblem: (e: FakeMap, h: string) => string | null;
  publicationAdvice: (e: FakeMap, d: unknown, rules: unknown, now: Date) => string | null;
  rememberCollectionLoader: (fn: unknown) => void;
  colourConflicts: (
    slug: string,
    colour: string,
    list: unknown,
    pairs: unknown,
  ) => { same: Array<{ slug: string }>; confusable: Array<{ slug: string; color: string }> };
};

describe("cms-hooks.js: rules the validator enforces as errors (CMS-04)", () => {
  const ALL = [...cfgRules.required, ...cfgRules.unique];
  const RULE_CODES = new Set(ALL.map((r) => r.code));
  /** Codes of the CMS rules this data breaks (each message belongs to one rule). */
  const hookCodes = (scope: string, data: Record<string, unknown>) => {
    const d = ext2.clean(fromJS(data));
    const required = ext2
      .requiredProblems(d, scope, cfgRules.required)
      .map((m) => cfgRules.required.find((r) => r.scope === scope && r.message === m)!.code);
    const unique = ext2.uniqueProblems(d, scope, cfgRules.unique).length
      ? cfgRules.unique.filter((r) => r.scope === scope).map((r) => r.code)
      : [];
    return [...new Set([...required, ...unique])].sort();
  };
  /** Validator error codes (only those the CMS mirrors) for one file after an edit. */
  const validatorCodes = (file: string, edit: (d: Record<string, unknown>) => void) => {
    const issues = Files.of("n4").edit(file, edit).validate();
    return [
      ...new Set(codes(errors(issues).filter((i) => i.file === file && RULE_CODES.has(i.code)))),
    ].sort();
  };
  const PUB = "publications/example-2018-fixture-paper-32.md";
  const PROJECT = "projects/advice-project.md";
  const read = (file: string) => {
    let data: Record<string, unknown> = {};
    Files.of("n4").edit(file, (d) => {
      data = structuredClone(d);
    });
    return data;
  };
  const NO_PUBLIC_VERSION = (d: Record<string, unknown>) => {
    delete d.year;
    delete d.doi;
    delete d.links;
    d.type = "work-in-progress";
    d.status = "in-progress";
    d.as_of = "2026";
    d.status_source = "documented";
  };

  const cases: Array<[string, string, string, (d: Record<string, unknown>) => void]> = [
    ["publication as it is", "publications", PUB, () => {}],
    [
      "work in progress without As of and Status source",
      "publications",
      PUB,
      (d) => {
        d.status = "in-progress";
      },
    ],
    [
      "work in progress with As of and Status source",
      "publications",
      PUB,
      (d) => {
        d.status = "in-progress";
        d.as_of = "2026-10";
        d.status_source = "self-reported";
      },
    ],
    [
      "paper without directions",
      "publications",
      PUB,
      (d) => {
        d.directions = [];
      },
    ],
    [
      "draft paper without directions",
      "publications",
      PUB,
      (d) => {
        d.directions = [];
        d.draft = true;
      },
    ],
    [
      "work in progress without directions",
      "publications",
      PUB,
      (d) => {
        d.directions = [];
        d.type = "work-in-progress";
      },
    ],
    [
      "public version (DOI, PDF) without a year",
      "publications",
      PUB,
      (d) => {
        delete d.year;
      },
    ],
    [
      "only a presentation link, no year",
      "publications",
      PUB,
      (d) => {
        NO_PUBLIC_VERSION(d);
        d.presentations = [{ event: "INFORMS", year: 2025, url: "https://example.org/p" }];
      },
    ],
    [
      "a presentation without a link and no year",
      "publications",
      PUB,
      (d) => {
        NO_PUBLIC_VERSION(d);
        d.presentations = [{ event: "INFORMS", year: 2025 }];
      },
    ],
    ["no public version and no year", "publications", PUB, NO_PUBLIC_VERSION],
    [
      "project without directions",
      "projects",
      PROJECT,
      (d) => {
        d.directions = [];
      },
    ],
    [
      "archived project without directions",
      "projects",
      PROJECT,
      (d) => {
        d.directions = [];
        d.status = "archived";
      },
    ],
    [
      "draft project without directions",
      "projects",
      PROJECT,
      (d) => {
        d.directions = [];
        d.draft = true;
      },
    ],
  ];

  for (const [name, scope, file, edit] of cases) {
    it(`agrees with the validator: ${name}`, () => {
      const data = read(file);
      edit(data);
      expect(hookCodes(scope, data)).toEqual(validatorCodes(file, edit));
    });
  }

  it("the cases above include every validator error the CMS mirrors (not only passing ones)", () => {
    const fired = new Set(
      cases.flatMap(([, scope, file, edit]) => {
        const d = read(file);
        edit(d);
        return hookCodes(scope, d);
      }),
    );
    expect([...fired].sort()).toEqual([
      "E_AS_OF_MISSING",
      "E_DIRECTIONS_EMPTY",
      "E_STATUS_SOURCE_MISSING",
      "E_YEAR_MISSING",
    ]);
  });

  it("Direction order: a direction listed twice is not saved (E_DIR_ORDER_DUP)", () => {
    const order = ["advice", "platforms", "advice", "ai-work"];
    const issues = Files.of("n4")
      .edit("site.yml", (d) => {
        d.direction_order = order;
      })
      .validate();
    expect(codes(errors(issues))).toContain("E_DIR_ORDER_DUP");
    expect(() => save("settings", { direction_order: order }, "site")).toThrow(
      /“Direction order” lists “advice” more than once/,
    );
    expect(save("settings", { direction_order: ["advice", "platforms"] }, "site")).toEqual({
      direction_order: ["advice", "platforms"],
    });
  });

  it("names every problem in one message", () => {
    expect(() =>
      save("publications", { title: "T", type: "working-paper", status: "in-progress" }),
    ).toThrow(/^Not saved: “As of” is needed.*; “Status source” is needed.*; choose at least one/);
  });
});

describe("cms-hooks.js: a photo needs consent before it is saved (CMS-06)", () => {
  it("blocks a photo while Photo consent is off, and explains that uploads are public", () => {
    const p = { name: "A B", photo: "/uploads/p.jpg", photo_alt: "Portrait of A B" };
    expect(() => save("people", p)).toThrow(/Photo consent.*public as soon as they are published/);
    expect(() => save("people", { ...p, photo_consent: false })).toThrow(/Photo consent/);
    expect(save("people", { ...p, photo_consent: true })).toEqual({ ...p, photo_consent: true });
    expect(save("people", { name: "A B", photo_consent: false })).toEqual({
      name: "A B",
      photo_consent: false,
    });
  });
});

describe("cms-hooks.js: the entry saved is the one the address names (CMS-02)", () => {
  it("parses editor routes", () => {
    expect(ext2.editorRoute("#/collections/directions/entries/ai-at-work")).toEqual({
      collection: "directions",
      slug: "ai-at-work",
      isNew: false,
    });
    expect(ext2.editorRoute("#/collections/news/new?title=x")).toEqual({
      collection: "news",
      slug: null,
      isNew: true,
    });
    expect(ext2.editorRoute("#/collections/settings/entries/site")).toMatchObject({
      collection: "settings",
      slug: "site",
    });
    expect(ext2.editorRoute("#/collections/news")).toBeNull();
    expect(ext2.editorRoute("#/workflow")).toBeNull();
    expect(ext2.editorRoute("")).toBeNull();
  });

  it("refuses a save when the editor still shows the previous entry", () => {
    const stale = entry("directions", "ai-at-work", { title: "Generative & Agentic AI at Work" });
    expect(ext2.routeProblem(stale, "#/collections/projects/entries/learning-on-the-go")).toMatch(
      /still shows “directions\/ai-at-work”.*Reload the page/,
    );
    expect(ext2.routeProblem(stale, "#/collections/directions/entries/platform-work")).toMatch(
      /Reload/,
    );
    expect(ext2.routeProblem(stale, "#/collections/directions/entries/ai-at-work")).toBeNull();
    expect(ext2.routeProblem(stale, "#/collections/directions")).toBeNull();
    const fresh = fromJS({ collection: "news", slug: "", newRecord: true, data: {} }) as FakeMap;
    expect(ext2.routeProblem(fresh, "#/collections/news/new")).toBeNull();
    expect(ext2.routeProblem(fresh, "#/collections/news/entries/2026-01-01-x")).toMatch(/Reload/);
    expect(ext2.routeProblem(stale, "#/collections/directions/new")).toMatch(/Reload/);
  });

  it("is part of preSave when the page has an address", () => {
    const { reg: r2, window: w2 } = runAdminScripts(["cms-data.js", "cms-hooks.js"]);
    w2.location = { hash: "#/collections/projects/entries/learning-on-the-go" };
    const stale = entry("directions", "ai-at-work", { title: "Generative & Agentic AI at Work" });
    expect(() => r2.events[0]!.handler({ entry: stale })).toThrow(/address bar names another/);
    w2.location = { hash: "#/collections/directions/entries/ai-at-work" };
    expect(toJS(r2.events[0]!.handler({ entry: stale }))).toEqual({
      title: "Generative & Agentic AI at Work",
    });
  });
});

describe("cms-hooks.js: advice before a new publication's first save (CMS-11)", () => {
  const slugRules = (window.BOBALAB_CMS as { rules: { slugs: unknown } }).rules.slugs;
  const now = new Date("2026-10-20T12:00:00Z");
  const fresh = (data: Record<string, unknown>) =>
    fromJS({ collection: "publications", slug: "", newRecord: true, data }) as FakeMap;

  it("suggests the last name once for a multi-word first author; a second save goes through", () => {
    const data = {
      title: "CMS test publication on algorithmic advice",
      authors: [{ name: "Wichinpong Park Sinchaisri" }],
    };
    const first = ext2.publicationAdvice(fresh(data), fromJS(data), slugRules, now);
    expect(first).toMatch(/^Not saved yet: check the address first/);
    expect(first).toContain("wichinpong-park-sinchaisri-2026-cms-test-publication-on-algo");
    expect(first).toMatch(/type only “Sinchaisri”/);
    expect(first).toMatch(/save again/);
    expect(ext2.publicationAdvice(fresh(data), fromJS(data), slugRules, now)).toBeNull();
  });

  it("mentions the year when the paper is from another year; quiet for a last name and this year", () => {
    const old = { title: "Old paper title", year: 2023, authors: [{ name: "Doe" }] };
    expect(ext2.publicationAdvice(fresh(old), fromJS(old), slugRules, now)).toMatch(
      /year the entry is created \(2026\), not the paper’s year \(2023\)/,
    );
    const ok = { title: "Fine paper title", year: 2026, authors: [{ name: "Doe" }] };
    expect(ext2.publicationAdvice(fresh(ok), fromJS(ok), slugRules, now)).toBeNull();
    const existing = fromJS({ collection: "publications", slug: "x", data: old }) as FakeMap;
    expect(ext2.publicationAdvice(existing, fromJS(old), slugRules, now)).toBeNull();
  });
});

describe("cms-hooks.js: each live direction keeps its own colour (CMS-07)", () => {
  const dir = (slug: string, short_label: string, color: string, status = "active") => ({
    slug,
    data: { short_label, color, status },
  });
  const dirs = [
    dir("algorithmic-advice", "Algorithmic Advice", "butterfly-pea"),
    dir("learning-on-the-job", "Learning on the Job", "matcha"),
    dir("platform-work", "Platform Work", "oolong"),
    dir("cities-communities", "Cities", "black-sesame", "archived"),
  ];
  const loader = async (name: string) => (name === "directions" ? dirs.map((d) => fromJS(d)) : []);

  it("finds directions with the same or a confusable colour, ignoring archived ones and itself", () => {
    const pairs = [
      ["matcha", "thai-tea", "ΔE 6.4"],
      ["oolong", "thai-tea", "ΔE 3.3"],
    ];
    const r = ext2.colourConflicts("platform-work", "thai-tea", dirs, pairs);
    expect(r.same).toEqual([]);
    expect(r.confusable.map((x) => x.slug)).toEqual(["learning-on-the-job"]);
    expect(ext2.colourConflicts("x", "matcha", dirs, []).same.map((x) => x.slug)).toEqual([
      "learning-on-the-job",
    ]);
    expect(ext2.colourConflicts("learning-on-the-job", "matcha", dirs, []).same).toEqual([]);
    expect(ext2.colourConflicts("x", "black-sesame", dirs, []).same).toEqual([]);
  });

  it("blocks saving a live direction with a colour another live direction uses", async () => {
    const { reg: r2, window: w2 } = runAdminScripts(["cms-data.js", "cms-hooks.js"]);
    const colour = r2.events[1]!.handler as (a: { entry: FakeMap }) => Promise<unknown> | undefined;
    const save2 = (slug: string, data: Record<string, unknown>) =>
      colour({ entry: entry("directions", slug, data) });
    // Without Decap's getCollection (no preview has rendered yet) the check is skipped.
    expect(save2("platform-work", { color: "matcha", status: "active" })).toBeUndefined();
    (w2.BobalabCmsHooks as typeof ext2).rememberCollectionLoader(loader);
    await expect(save2("platform-work", { color: "matcha", status: "active" })).rejects.toThrow(
      /Not saved: Matcha is already the colour of “Learning on the Job”/,
    );
    await expect(
      save2("platform-work", { color: "lychee", status: "active" }),
    ).resolves.toBeUndefined();
    await expect(
      save2("platform-work", { color: "oolong", status: "active" }),
    ).resolves.toBeUndefined();
    expect(save2("platform-work", { color: "matcha", status: "archived" })).toBeUndefined();
    await expect(save2("new-one", { color: "matcha" })).rejects.toThrow(/Matcha/);
    expect(colour({ entry: entry("news", "n", { color: "matcha" }) })).toBeUndefined();
  });
});
