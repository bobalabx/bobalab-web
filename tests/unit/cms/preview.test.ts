/**
 * public/admin/preview-templates.js: preview templates exist for news, person and
 * publication (brief §I WP6 #6), use the stable preview.css, mirror the site's
 * wording, and show the site's rules (draft badge, consent gating, counting rule).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NEWS_TYPE_LABELS, PUBLICATION_STATUS_LABELS } from "@/components/ui/labels";
import { EVIDENCE_LABELS } from "@/components/ui/EvidenceLabel";
import { ROLE_LABELS } from "@/lib/content/people";
import { CONFUSABLE_PAIRS, SWATCHES } from "@/lib/content/palette";
import { ROOT, entry, findAll, fromJS, runAdminScripts, textOf } from "./helpers";

const { reg } = runAdminScripts(["cms-data.js", "cms-hooks.js", "preview-templates.js"]);

function render(
  collection: string,
  data: Record<string, unknown>,
  meta: Record<string, unknown> = {},
) {
  const tpl = reg.templates[collection]!;
  const e = entry(collection, "slug", data);
  return tpl({
    entry: e,
    widgetFor: (name: string) => ({ type: "md", props: {}, children: [String(data[name] ?? "")] }),
    getAsset: (p: string) => ({ toString: () => `blob:${p}` }),
    fieldsMetaData: fromJS(meta),
  });
}

describe("preview templates", () => {
  it("registers templates for every collection with a preview (news, people, publications required) and the stable preview.css", () => {
    expect(Object.keys(reg.templates).sort()).toEqual([
      "about",
      "accessibility",
      "directions",
      "home",
      "join",
      "news",
      "opportunities",
      "people",
      "privacy",
      "projects",
      "publications",
    ]);
    expect(reg.styles).toEqual(["http://localhost:3100/admin/preview.css"]);
    const css = fs.readFileSync(path.join(ROOT, "public/admin/preview.css"), "utf8");
    // Built from the site tokens (both modes) and component classes the templates use.
    for (const s of [
      "--paper: #ffffff",
      "--paper: #101210",
      ".bl-news",
      ".bl-person",
      ".bl-pub",
      ".bl-badge--draft",
      ".prose",
    ])
      expect(css).toContain(s);
    expect(css).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/); // no timestamps: stable output
  });

  it("news: full date, site type label, draft badge, upcoming flag, summary and body", () => {
    const tree = render("news", {
      date: "2026-10-07",
      type: "talk",
      title: "Talk at INFORMS",
      summary: "Park presents.",
      event_date: "2999-01-02T10:00",
      location: "Atlanta",
      draft: true,
      body: "Long text",
    });
    const text = textOf(tree);
    expect(text).toContain("Oct 7, 2026");
    expect(text).toContain(NEWS_TYPE_LABELS.talk);
    expect(text).toContain("Draft · pending lab review");
    expect(text).toContain("Upcoming");
    expect(text).toContain("Event: Jan 2, 2999 · Atlanta");
    expect(text).toContain("Long text");
    expect(findAll(tree, (n) => n.type === "h1")).toHaveLength(1);
  });

  it("news without optional fields renders no empty sections", () => {
    const text = textOf(render("news", { date: "2026-10-07", type: "award", title: "Award" }));
    expect(text).not.toContain("Event:");
    expect(text).not.toContain("Draft");
    expect(text).not.toContain("Upcoming");
  });

  it("person: consent gating mirrors the site (photo, email, now at) and unlisted warning", () => {
    const base = {
      name: "Jane Q. Doe",
      role: "phd",
      end: "2001",
      photo: "/uploads/jane.jpg",
      photo_alt: "Portrait of Jane",
      email: "jane@berkeley.edu",
      now_at: "Stanford",
      links: { website: "https://jane.example.org" },
    };
    const hidden = render("people", { ...base, listed: false });
    const t1 = textOf(hidden);
    expect(t1).toContain("Not listed");
    expect(t1).toContain(`Alumni · ${ROLE_LABELS.phd.one}`);
    expect(t1).not.toContain("Now at Stanford");
    expect(findAll(hidden, (n) => n.type === "img")).toHaveLength(0);
    expect(findAll(hidden, (n) => String(n.props.href ?? "").startsWith("mailto:"))).toHaveLength(
      0,
    );
    expect(t1).toContain("JD"); // initials pearl instead of the photo

    const shown = render("people", {
      ...base,
      listed: true,
      photo_consent: true,
      email_public: true,
      now_at_public: true,
    });
    const t2 = textOf(shown);
    expect(t2).not.toContain("Not listed");
    expect(t2).toContain("Now at Stanford");
    const img = findAll(shown, (n) => n.type === "img");
    expect(img).toHaveLength(1);
    expect(img[0]!.props.alt).toBe("Portrait of Jane");
    expect(findAll(shown, (n) => n.props.href === "mailto:jane@berkeley.edu")).toHaveLength(1);
  });

  it("publication: authors, status line with as-of and self-reported wording, materials named with the title", () => {
    const tree = render(
      "publications",
      {
        title: "Precise or Broad?",
        authors: [
          { name: "A. Coauthor" },
          { name: "Park Sinchaisri", person: "park-sinchaisri" },
          { name: "B. C" },
        ],
        type: "working-paper",
        status: "major-revision",
        status_note: "at M&SOM",
        status_source: "self-reported",
        as_of: "2026-04",
        doi: "10.1287/x.1",
        links: { ssrn: "https://ssrn.com/abstract=1" },
        directions: ["algorithmic-advice"],
        in_brief: "Short plain summary.",
      },
      {
        directions: { directions: { "algorithmic-advice": { short_label: "Algorithmic Advice" } } },
      },
    );
    const text = textOf(tree);
    expect(text).toContain("A. Coauthor, Park Sinchaisri, and B. C");
    expect(text).toContain(
      `${PUBLICATION_STATUS_LABELS["major-revision"]} at M&SOM · as of Apr 2026 · reported by the lab`,
    );
    expect(text).toContain("Algorithmic Advice");
    expect(text).toContain("In brief");
    expect(text).not.toContain("In progress only");
    const materials = findAll(
      tree,
      (n) => n.props["aria-label"] === "Materials for Precise or Broad?",
    );
    expect(materials).toHaveLength(1);
    expect(findAll(tree, (n) => n.props.href === "https://doi.org/10.1287/x.1")).toHaveLength(1);
  });

  it("publication without a public version is flagged as in progress only (D-05)", () => {
    const text = textOf(
      render("publications", {
        title: "WIP",
        authors: [{ name: "X" }],
        type: "work-in-progress",
        status: "in-progress",
        presentations: [{ event: "Seminar" }],
      }),
    );
    expect(text).toContain("In progress only");
  });

  it("direction: swatch band, colour name, confusable-pair warning, archived note, findings with site evidence labels", () => {
    const tree = render("directions", {
      title: "Algorithmic Advice & Human Decisions",
      short_label: "Algorithmic Advice",
      color: "taro",
      status: "archived",
      archived_on: "2026-10",
      findings: [{ text: "Tips help.", evidence: "published" }],
      methods: ["Field experiments", "RL"],
    });
    const text = textOf(tree);
    expect(text).toContain("Archived.");
    expect(text).toContain("Oct 2026");
    expect(text).toContain(SWATCHES.taro.name);
    expect(text).toContain("reserve colour");
    const pair = CONFUSABLE_PAIRS.find((p) => p.includes("taro"))!;
    expect(text).toContain(SWATCHES[pair[0] === "taro" ? pair[1] : pair[0]].name);
    expect(text).toContain(EVIDENCE_LABELS.published);
    expect(text).toContain("Methods: Field experiments · RL");
    expect(findAll(tree, (n) => n.props["data-swatch"] === "taro").length).toBeGreaterThan(0);
  });

  it("direction tags carry the direction's colour dot, as on the site (PearlTag)", () => {
    const tree = render(
      "news",
      { date: "2026-10-07", type: "award", title: "A", directions: ["ai-at-work"] },
      {
        directions: {
          directions: { "ai-at-work": { short_label: "AI at Work", color: "lychee" } },
        },
      },
    );
    const tag = findAll(tree, (n) => n.props.className === "bl-tag");
    expect(tag).toHaveLength(1);
    expect(tag[0]!.props["data-swatch"]).toBe("lychee");
    expect(findAll(tree, (n) => n.props.className === "bl-dot")).toHaveLength(1);
    expect(textOf(tag[0])).toBe("AI at Work");
  });

  it("project: card meta like ProjectCard, team names, consent-gated collaborators and partners", () => {
    const tree = render(
      "projects",
      {
        title: "Authority Design for AI Agents",
        status: "active",
        start_year: 2025,
        directions: ["ai-at-work"],
        team: ["park-sinchaisri"],
        collaborators: [
          { name: "Shown Person", affiliation: "MIT", consent: true },
          { name: "Hidden Person", consent: false },
        ],
        partners: [{ name: "Secret Co", public: false }],
        outputs: [{ type: "code", label: "Replication code", url: "https://github.com/x" }],
        draft: true,
      },
      {
        team: { people: { "park-sinchaisri": { name: "Park Sinchaisri" } } },
        directions: {
          directions: { "ai-at-work": { short_label: "AI at Work", color: "lychee" } },
        },
      },
    );
    const text = textOf(tree);
    expect(text).toContain("Active");
    expect(text).toContain("Since 2025");
    expect(text).toContain("Draft · pending lab review");
    expect(text).toContain("Park Sinchaisri");
    expect(text).toContain("Shown Person");
    expect(text).not.toContain("Hidden Person");
    expect(text).not.toContain("Secret Co");
    expect(text).toContain("1 collaborator without consent; 1 partner not public");
    expect(findAll(tree, (n) => n.props.href === "https://github.com/x")).toHaveLength(1);
    expect(findAll(tree, (n) => n.type === "h1")).toHaveLength(1);
  });

  it("opportunity: status wording and Apply only while open (OpportunityCard rules)", () => {
    const open = textOf(
      render("opportunities", {
        title: "RAs",
        audience: "students",
        status: "rolling",
        as_of: "2026-10",
        route: "Email the lab",
        apply_url: "https://forms.example.org",
        email: "lab@berkeley.edu",
      }),
    );
    expect(open).toContain("Open, rolling");
    expect(open).toContain("as of Oct 2026");
    expect(open).toContain("How to join: Email the lab");
    expect(open).toContain("Apply");
    const closed = render("opportunities", {
      title: "RAs",
      audience: "partners",
      status: "open",
      closes_on: "2001-01-01",
      apply_url: "https://forms.example.org",
    });
    expect(textOf(closed)).toContain("Closed");
    expect(findAll(closed, (n) => n.props.href === "https://forms.example.org")).toHaveLength(0);
    expect(
      textOf(render("opportunities", { title: "X", audience: "press", status: "unknown" })),
    ).toContain("Status not confirmed");
  });

  it("text pages, Join and Home: page header, markdown sections, empty sections left out", () => {
    const about = textOf(
      render("about", {
        title: "About BOBALAB",
        intro: "Intro.",
        body: "Body text",
        last_reviewed: "2026-10-20",
      }),
    );
    expect(about).toContain("About BOBALAB");
    expect(about).toContain("Last reviewed Oct 20, 2026");
    expect(about).toContain("Body text");
    expect(textOf(render("privacy", {}))).toContain("Privacy"); // fallback title

    const join = textOf(
      render("join", {
        intro: "Hi.",
        students: "Students text",
        data_statement: "We keep data safe.",
      }),
    );
    expect(join).toContain("Join the lab");
    expect(join).toContain("Students & research assistants");
    expect(join).toContain("How we handle data");
    expect(join).not.toContain("Press"); // no press text → no section

    const home = textOf(
      render(
        "home",
        {
          mission: "We study work.",
          featured_findings: [{ text: "Tips help.", evidence: "published", publication: "p1" }],
        },
        { featured_findings: { publications: { p1: { title: "Paper One" } } } },
      ),
    );
    expect(home).toContain("We study work.");
    expect(home).toContain("What we’ve learned");
    expect(home).toContain(EVIDENCE_LABELS.published);
    expect(home).toContain("Paper One");
  });
});
