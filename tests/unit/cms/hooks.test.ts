/**
 * public/admin/cms-hooks.js: the preSave listener that tidies data before Decap
 * writes a file, and blocks saves that the content validator would reject.
 */
import { describe, expect, it } from "vitest";
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
  it("registers exactly one preSave listener", () => {
    expect(reg.events.map((e) => e.name)).toEqual(["preSave"]);
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
    expect(save("projects", { hero: { alt: "x" } })).toEqual({ hero: { alt: "x" } });
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
    expect(() => save("projects", { title: "P", start_year: 2025, end_year: 2024 })).toThrow(
      /End year \(2024\) is before Start year \(2025\)/,
    );
    expect(save("projects", { title: "P", start_year: 2025, end_year: "" })).toEqual({
      title: "P",
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
