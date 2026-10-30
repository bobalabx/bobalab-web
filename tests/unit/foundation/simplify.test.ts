/**
 * D-14 "the boba cup" foundation: the optional `home_question` (≤ 90) on
 * directions and `why` on the home page, and the homepage queries
 * (homeQuestion, homeWho, homeHeroCopy, homePearls). docs/simplify/JUDGE.md R1, R7.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { homeHeroCopy, homePearls, homeQuestion, homeWho } from "@/lib/content/queries";
import { directionSchema, homePageSchema } from "@/lib/content/schema";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const REAL = fileURLToPath(new URL("../../../content/", import.meta.url));
const TODAY = "2026-10-25";
const fixture = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });
const real = (edit?: (raw: ReturnType<typeof loadRawContent>) => void): Content => {
  const raw = loadRawContent(REAL);
  edit?.(raw);
  return buildContent(raw, { preview: false, today: TODAY });
};

const base = { title: "T", short_label: "L", color: "matcha" } as const;

describe("schema: directions.home_question", () => {
  it("is optional", () => {
    const d = directionSchema.parse(base);
    expect(d.home_question).toBeUndefined();
  });
  it("accepts up to 90 characters and trims", () => {
    expect(
      directionSchema.parse({ ...base, home_question: `  ${"q".repeat(90)}  ` }).home_question,
    ).toBe("q".repeat(90));
  });
  it("rejects 91 characters and an empty value", () => {
    expect(directionSchema.safeParse({ ...base, home_question: "q".repeat(91) }).success).toBe(
      false,
    );
    expect(directionSchema.safeParse({ ...base, home_question: "   " }).success).toBe(false);
  });
});

describe("schema: pages/home.why", () => {
  it("is optional, ≤ 240 characters, not empty", () => {
    expect(homePageSchema.parse({}).why).toBeUndefined();
    expect(homePageSchema.safeParse({ why: "w".repeat(240) }).success).toBe(true);
    expect(homePageSchema.safeParse({ why: "w".repeat(241) }).success).toBe(false);
    expect(homePageSchema.safeParse({ why: " " }).success).toBe(false);
  });
});

describe("homeQuestion = home_question ?? question", () => {
  it("falls back to the guiding question when home_question is absent (fixtures)", () => {
    const c = fixture("consent-edge-cases");
    expect(c.directions.length).toBeGreaterThan(0);
    for (const d of c.directions) {
      expect(d.home_question).toBeUndefined();
      expect(d.homeQuestion).toBe(d.question);
      expect(homeQuestion(d)).toBe(d.question);
    }
  });
  it("prefers home_question (real content: every live direction has one)", () => {
    const c = real();
    expect(c.directions).toHaveLength(4);
    for (const d of c.directions) {
      expect(d.home_question, d.slug).toBeTruthy();
      expect(d.homeQuestion).toBe(d.home_question);
      expect(homeQuestion(d)).toBe(d.home_question);
      expect(d.homeQuestion).not.toBe(d.question);
    }
  });
  it("is typeset like the other display fields", () => {
    const c = real((raw) => {
      const d = raw.entries.directions.find((x) => x.slug === "platform-work")!;
      d.home_question = "What keeps a driver's shift going?";
    });
    expect(c.getDirection("platform-work")!.homeQuestion).toBe(
      "What keeps a driver’s shift going?",
    );
  });
});

describe("homeWho: built from site.yml and the PI's entry, not hard-coded", () => {
  it("names BOBALAB, Berkeley Haas and Prof. Park Sinchaisri (real content)", () => {
    const w = homeWho(real());
    expect(w.text).toBe(
      "BOBALAB is a research lab at the Haas School of Business, University of California, Berkeley, led by Prof. Park Sinchaisri.",
    );
    expect(w.lab).toBe("BOBALAB");
    expect(w.lead).toEqual({
      name: "Park Sinchaisri",
      honorific: "Prof.",
      slug: "park-sinchaisri",
      href: "/people/park-sinchaisri/",
    });
  });
  it("follows the content: a new affiliation or a PI without a professor title", () => {
    const c = real((raw) => {
      raw.site = { ...raw.site!, name: "LAB", affiliation_text: "UC Berkeley" };
      const pi = raw.entries.people.find((p) => p.role === "pi")!;
      pi.title = "Lecturer";
    });
    expect(homeWho(c).text).toBe("LAB is a research lab at UC Berkeley, led by Park Sinchaisri.");
  });
  it("leaves the lead out when no PI is listed", () => {
    const c = real((raw) => {
      raw.entries.people = raw.entries.people.filter((p) => p.role !== "pi");
    });
    const w = homeWho(c);
    expect(w.lead).toBeUndefined();
    expect(w.text).toBe(
      "BOBALAB is a research lab at the Haas School of Business, University of California, Berkeley.",
    );
  });
});

describe("homeHeroCopy", () => {
  it("statement, who and the why line from home.yml", () => {
    const h = homeHeroCopy(real());
    expect(h.statement).toBe("How people learn to work with algorithms");
    expect(h.why).toMatch(/^Apps assign gig work/);
    expect(h.whyIsMission).toBe(false);
    expect(h.who.text).toContain("Park Sinchaisri");
  });
  it("falls back to the mission when `why` is empty", () => {
    const c = real((raw) => {
      delete raw.pages.home!.why;
    });
    const h = homeHeroCopy(c);
    expect(h.why).toBe(c.pages.home!.mission);
    expect(h.whyIsMission).toBe(true);
  });
  it("hero budget (R1, D-14): statement + who + why ≤ 60 words, why about 30", () => {
    const h = homeHeroCopy(real());
    const words = (s = "") => s.split(/\s+/).filter(Boolean).length;
    expect(words(h.why)).toBeLessThanOrEqual(35);
    expect(words(h.statement) + words(h.who.text) + words(h.why)).toBeLessThanOrEqual(60);
  });
});

describe("homePearls (R7: question, then one finding or a first read)", () => {
  it("one per live direction, in editorial order, with the short question", () => {
    const c = real();
    const ps = homePearls(c);
    expect(ps.map((p) => p.direction.slug)).toEqual(c.site.direction_order);
    for (const p of ps) expect(p.question).toBe(p.direction.home_question);
  });
  it("no findings yet: each pearl offers its own newest published home-direction paper", () => {
    const c = real();
    const ps = homePearls(c);
    for (const p of ps) {
      expect(p.finding).toBeUndefined();
      const read = p.firstRead!;
      expect(read.counted).toBe(true);
      expect(read.status).toBe("published");
      expect(read.directions[0]).toBe(p.direction.slug);
      const newest = c.countedPublications.find(
        (x) => x.status === "published" && x.directions[0] === p.direction.slug,
      );
      expect(read.slug).toBe(newest!.slug);
    }
    // Four different papers: a shared paper is not offered twice.
    expect(new Set(ps.map((p) => p.firstRead!.slug)).size).toBe(ps.length);
  });
  it("a shared paper already offered by an earlier pearl is skipped when another exists", () => {
    const c = real();
    const [a, b] = c.directions;
    const shared = c.countedPublications.find(
      (p) => p.status === "published" && p.directions[0] === a!.slug,
    )!;
    // b loses its own published papers, and a's first read becomes shared with b.
    const c2 = real((raw) => {
      for (const pub of raw.entries.publications) {
        if (pub.slug === shared.slug) pub.directions = [a!.slug, b!.slug];
        else if (pub.directions[0] === b!.slug && pub.status === "published")
          pub.status = "in-progress";
      }
    });
    const ps = homePearls(c2);
    expect(ps[0]!.firstRead!.slug).toBe(shared.slug);
    const others = c2.countedPublications.filter(
      (p) => p.status === "published" && p.directions.includes(b!.slug) && p.slug !== shared.slug,
    );
    // Another published paper of b is preferred over repeating the shared one ...
    if (others.length) expect(ps[1]!.firstRead!.slug).toBe(others[0]!.slug);
    // ... and only when there is none, the shared one is offered again.
    else expect(ps[1]!.firstRead!.slug).toBe(shared.slug);
    // With no published paper at all, the newest counted paper stands in.
    const c3 = real((raw) => {
      for (const pub of raw.entries.publications)
        if (pub.directions.includes(b!.slug) && pub.status === "published")
          pub.status = "in-progress";
    });
    const p3 = homePearls(c3)[1]!;
    expect(p3.firstRead?.slug).toBe(
      c3.countedPublications.find((p) => p.directions.includes(b!.slug))?.slug,
    );
  });
  it("a filled finding replaces the first read (never both)", () => {
    const c = real((raw) => {
      const d = raw.entries.directions.find((x) => x.slug === "algorithmic-advice")!;
      d.findings = [
        { text: "Tips help.", evidence: "published", publication: "bastani-2026-rl-tips" },
      ];
    });
    const p = homePearls(c).find((x) => x.direction.slug === "algorithmic-advice")!;
    expect(p.finding?.text).toBe("Tips help.");
    expect(p.finding?.publication?.slug).toBe("bastani-2026-rl-tips");
    expect(p.firstRead).toBeUndefined();
  });
  it("works for 0 live directions (the empty state) and for fixtures without home_question", () => {
    expect(homePearls(fixture("n0"))).toEqual([]);
    const c = fixture("n4");
    expect(homePearls(c)).toHaveLength(c.directions.length);
    for (const p of homePearls(c)) expect(p.question).toBe(p.direction.question);
  });
});
