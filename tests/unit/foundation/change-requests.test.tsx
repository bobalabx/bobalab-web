/**
 * WP0 behaviour added while applying the parallel-phase change requests
 * (docs/change-requests/**). One block per request, named after it.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { getContent } from "@/lib/content/load";
import { markdownToText, markdownToHtml } from "@/lib/content/markdoc";
import { avatarSwatch } from "@/lib/content/people";
import { profilePageLd } from "@/lib/seo/jsonld";
import { pageMetadata, FEED_ALTERNATE_TYPES } from "@/lib/seo/metadata";
import { scholarMeta } from "@/lib/seo/scholar";
import { PearlTag } from "@/components/ui/PearlTag";
import { FilterChips } from "@/components/ui/FilterChips";
import { PublicationEntry, statusLine } from "@/components/ui/PublicationEntry";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const content = () => getContent({ dir: path.join(ROOT, "content"), preview: true });

describe("WP2 request 2 / WP4 request 2: PearlTag small dot", () => {
  it("renders two well-formed classes", () => {
    const html = renderToStaticMarkup(<PearlTag label="x" swatch="matcha" size="sm" />);
    expect(html).toContain('class="bl-dot bl-dot--sm"');
    expect(html).not.toMatch(/bl-dotbl-dot/);
  });
});

describe("WP3 request 3: no bare working-paper status echo", () => {
  const base = { status: "working-paper", as_of: "2026-08", status_source: "documented" } as const;
  it("drops a bare working-paper status on a working paper", () => {
    expect(statusLine(base, "working-paper")).toBeNull();
  });
  it("keeps it when there is a note, or on another type", () => {
    expect(statusLine({ ...base, status_note: "v2" }, "working-paper")).toMatch(/v2/);
    expect(statusLine(base, "journal")).toMatch(/^Working paper · as of/);
  });
});

describe("PublicationEntry options (WP1 request 5, WP3 requests 2–3, WP4 request 4)", () => {
  const c = content();
  const all = [...c.countedPublications, ...c.inProgress];
  const awarded = [...all].sort((a, b) => b.awards.length - a.awards.length)[0]!;

  it("lists at most two awards, then links the rest on the paper page", () => {
    expect(awarded.awards.length).toBeGreaterThan(2);
    const html = renderToStaticMarkup(<PublicationEntry pub={awarded} />);
    const items = html.match(/<ul class="bl-pub__awards"[^>]*>(.*?)<\/ul>/)![1]!;
    expect(items.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain(`href="/publications/${awarded.slug}/#awards-h"`);
    expect(html).toContain(`${awarded.awards.length - 2} more awards`);
  });

  it("showAwards={false} leaves the award list out entirely", () => {
    const html = renderToStaticMarkup(<PublicationEntry pub={awarded} showAwards={false} />);
    expect(html).not.toContain("bl-pub__awards");
  });

  it("writes page ranges with an en dash", () => {
    const ranged = all.find((p) => p.pages && /-/.test(p.pages))!;
    const html = renderToStaticMarkup(<PublicationEntry pub={ranged} />);
    expect(html).toContain(ranged.pages!.replace(/-+/, "–"));
  });

  it("does not link the current person's own name", () => {
    const pub = all.find((p) => p.authorList.some((a) => a.person?.hasProfile))!;
    const me = pub.authorList.find((a) => a.person?.hasProfile)!.person!.slug;
    const linked = renderToStaticMarkup(<PublicationEntry pub={pub} />);
    expect(linked).toContain(`href="/people/${me}/"`);
    const own = renderToStaticMarkup(<PublicationEntry pub={pub} currentPerson={me} />);
    expect(own).not.toContain(`href="/people/${me}/"`);
    expect(own).toMatch(/<strong class="bl-pub__author--lab">/);
  });
});

describe("WP4 request 1: shared avatar swatch", () => {
  it("is deterministic and prefers the first direction's colour", () => {
    expect(avatarSwatch("avery-example")).toBe(avatarSwatch("avery-example"));
    expect(avatarSwatch("avery-example", [{ color: "jasmine" }])).toBe("jasmine");
  });
});

describe("WP4 request 3 / D-13: FilterChips direction segment", () => {
  it("renders the 16 px direction segment before the label, as a text toggle", () => {
    const html = renderToStaticMarkup(
      <FilterChips
        legend="Direction"
        options={[{ value: "a", label: "A", swatch: "matcha" }]}
        selected={[]}
        onToggle={() => {}}
      />,
    );
    expect(html).toContain(
      '<button type="button" class="bl-chip press" aria-pressed="false"><span class="bl-seg" data-swatch="matcha" aria-hidden="true"></span><span class="bl-chip__label">A</span></button>',
    );
  });
});

describe("WP4 request 5 / WP5 request 1: Person JSON-LD", () => {
  it("keeps identity links in sameAs (CV left out) and names the employer", () => {
    const site = content().site;
    const ld = profilePageLd(
      {
        name: "Avery Example",
        title: "Professor",
        links: {
          cv: "https://x.example/cv.pdf",
          orcid: "https://orcid.org/0",
          haas: "https://haas.berkeley.edu/faculty/x/",
        },
      },
      "/people/avery-example/",
      site,
    ) as unknown as { mainEntity: { sameAs: string[]; worksFor: { name: string } } };
    expect(ld.mainEntity.sameAs).toEqual([
      "https://haas.berkeley.edu/faculty/x/",
      "https://orcid.org/0",
    ]);
    expect(ld.mainEntity.worksFor.name).toBe(site.long_name);
  });
});

describe("WP5 request 6: RSS discovery on every page", () => {
  it("pageMetadata keeps the feed alternate next to the canonical", () => {
    const m = pageMetadata({ title: "X", path: "/research/" });
    expect(m.alternates?.canonical).toBe("research/");
    expect(m.alternates?.types).toEqual(FEED_ALTERNATE_TYPES);
  });
});

describe("WP5 request 9: Markdown text and links", () => {
  it("adds no space before punctuation after an inline element", () => {
    expect(markdownToText("Email [a@b.c](mailto:a@b.c).")).toBe("Email a@b.c.");
    expect(markdownToText("One **two**, three.\n\nNext paragraph.")).toBe(
      "One two, three. Next paragraph.",
    );
  });
  it("leaves fragments, mailto and absolute links alone", () => {
    const html = markdownToHtml("[a](#x) [b](mailto:a@b.c) [c](https://x.example/) [d](/join/)");
    expect(html).toContain('href="#x"');
    expect(html).toContain('href="mailto:a@b.c"');
    expect(html).toContain('href="https://x.example/"');
    expect(html).toMatch(/href="[^"]*\/join\/"/);
  });
});

describe("WP3 request 5: Scholar institution tags are the caller's job", () => {
  it("does not copy the venue into an institution tag", () => {
    const meta = scholarMeta({
      title: "T",
      authors: [{ name: "A B" }],
      type: "working-paper",
      venue: "SSRN working paper 1",
      year: 2026,
    } as Parameters<typeof scholarMeta>[0]);
    expect(meta.citation_technical_report_institution).toBeUndefined();
  });
});
