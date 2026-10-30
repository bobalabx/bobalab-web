/**
 * Redesign integration: behaviour added while applying the change requests in
 * docs/change-requests/redesign/. One block per request, named after it.
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
import { markdownToHtml } from "@/lib/content/markdoc";
import { homePageSchema } from "@/lib/content/schema";
import { typeset } from "@/lib/content/typeset";
import { PublicationEntry, statusLine } from "@/components/ui/PublicationEntry";
import { CompactProjectList } from "@/components/projects/CompactProjectList";
import { urlLabel } from "@/components/pages/OpportunityCard";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const content = () => getContent({ dir: path.join(ROOT, "content"), preview: true });

describe("home-1: the home statement is content", () => {
  it("accepts a statement of at most 80 characters", () => {
    expect(homePageSchema.parse({ statement: "How people learn" }).statement).toBe(
      "How people learn",
    );
    expect(() => homePageSchema.parse({ statement: "x".repeat(81) })).toThrow();
    expect(() => homePageSchema.parse({ statement: "  " })).toThrow();
  });
  it("content/pages/home.yml carries it", () => {
    expect(content().pages.home?.statement).toBe("How people learn to work with algorithms");
  });
});

describe("publications-2: shared row uses the type word and drops a repeated status", () => {
  it("drops a bare Work in progress status on work in progress", () => {
    const base = { status: "in-progress", as_of: "2026-10-20", status_source: "self-reported" };
    expect(statusLine(base as never, "work-in-progress")).toBeNull();
    expect(statusLine({ ...base, status_note: "draft soon" } as never, "work-in-progress")).toMatch(
      /draft soon/,
    );
  });
  it("calls the MIT S.M. thesis a Thesis, not Other", () => {
    const thesis = content().publications.find((p) => p.slug === "sinchaisri-2016-mit-sm-thesis")!;
    const html = renderToStaticMarkup(<PublicationEntry pub={thesis} />);
    expect(html).toContain(">Thesis<");
    expect(html).not.toContain(">Other<");
  });
});

describe("pages-1: the Draft marker in compact project rows sits on its own line", () => {
  it("wraps the badge in the draft line", () => {
    const draft = content().projects.find((p) => p.draft);
    if (!draft) return; // no draft project in this content
    const html = renderToStaticMarkup(<CompactProjectList projects={[draft]} label="Projects" />);
    expect(html).toMatch(/<\/a><span class="bl-draft-line">/);
  });
});

describe("content-4a: typographic quotes in display text", () => {
  it("converts apostrophes and quotes", () => {
    expect(typeset("the lab's work")).toBe("the lab’s work");
    expect(typeset('the "Reduce motion" switch')).toBe("the “Reduce motion” switch");
    expect(typeset("drivers' decisions")).toBe("drivers’ decisions");
    expect(typeset("neighborhood 'vibrancy' and")).toBe("neighborhood ‘vibrancy’ and");
    expect(typeset("since '26")).toBe("since ’26");
    expect(typeset("no quotes")).toBe("no quotes");
  });
  it("leaves code spans as typed in Markdown", () => {
    const html = markdownToHtml("The lab's `code's` \"text\"");
    expect(html).toContain("The lab’s");
    expect(html).toContain("<code>code's</code>");
    expect(html).toContain("“text”");
  });
  it("applies to plain display fields from the loader, not to titles", () => {
    const c = content();
    const d = c.directions.find((x) => x.slug === "learning-on-the-job")!;
    expect(d.question).toContain("app’s");
    const p = c.publications.find((x) => x.slug === "keppler-2026-teachers-knapsack");
    if (p) expect(p.title).toContain("Teacher's");
  });
});

describe("content-4b: opportunity links say where they go", () => {
  it("names the destination", () => {
    expect(urlLabel("https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753")).toBe(
      "URAP listing",
    );
    expect(urlLabel("https://classes.berkeley.edu/node/170856")).toBe("Class listing");
    expect(urlLabel("https://parksinchaisri.github.io/#bobalab")).toBe("Park Sinchaisri’s website");
    expect(urlLabel("https://www.example.org/x")).toBe("example.org");
  });
});
