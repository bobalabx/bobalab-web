/**
 * WP1 (editor v2, spec §2.12): the route files under src/app are thin wrappers
 * around the shared, synchronous page views in src/components/views (and the
 * existing PersonProfile), which the editor live preview renders
 * too. For every fixture set in tests/fixtures/content, in production and in
 * preview mode, every route and every static param renders the same markup
 * through the route as through its view.
 * (Byte-identity of the exported site with main is checked on the real build;
 * see the WP1 notes.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";

// next/link needs the App Router at runtime; a plain anchor is enough here.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    transitionTypes,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    transitionTypes?: string[];
  }) => (
    <a href={href} data-transition={transitionTypes?.join(" ")} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { getContent } from "@/lib/content/load";
import {
  directionDetail,
  newsDetail,
  projectDetail,
  publicationDetail,
} from "@/lib/content/queries";
import HomePage from "@/app/page";
import ResearchPage from "@/app/research/page";
import DirectionPage, {
  generateStaticParams as directionParams,
} from "@/app/research/[direction]/page";
import ProjectsPage from "@/app/projects/page";
import ProjectPage, { generateStaticParams as projectParams } from "@/app/projects/[slug]/page";
import PublicationsPage from "@/app/publications/page";
import PublicationPage, {
  generateStaticParams as publicationParams,
} from "@/app/publications/[slug]/page";
import PersonPage, { generateStaticParams as personParams } from "@/app/people/[slug]/page";
import NewsPage from "@/app/news/page";
import NewsItemPage, { generateStaticParams as newsParams } from "@/app/news/[slug]/page";
import JoinPage from "@/app/join/page";
import AboutPage from "@/app/about/page";
import AccessibilityPage from "@/app/accessibility/page";
import PrivacyPage from "@/app/privacy/page";
import { HomeView } from "@/components/views/HomeView";
import { ResearchView } from "@/components/views/ResearchView";
import { DirectionPageView } from "@/components/views/DirectionPageView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { ProjectDetailView } from "@/components/views/ProjectDetailView";
import { PublicationsView } from "@/components/views/PublicationsView";
import { PublicationDetailView } from "@/components/views/PublicationDetailView";
import { NewsListView } from "@/components/views/NewsListView";
import { NewsArticleView } from "@/components/views/NewsArticleView";
import { JoinView } from "@/components/views/JoinView";
import { AboutView } from "@/components/views/AboutView";
import { TextPageView } from "@/components/views/TextPageView";
import { PersonProfile } from "@/components/people/PersonProfile";
import { buildPersonProfile } from "@/components/people/model";
import { CitationBlock } from "@/components/publications/CitationBlock";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const SETS = fs
  .readdirSync(FIX, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(FIX, d.name, "site.yml")))
  .map((d) => d.name)
  .sort();
const ENV = { ...process.env };
afterAll(() => {
  process.env = ENV;
});

function useFixture(set: string, drafts: boolean) {
  process.env.CONTENT_DIR = path.join(FIX, set);
  process.env.INCLUDE_DRAFTS = drafts ? "1" : "0";
}

const html = (el: ReactElement) => renderToStaticMarkup(el);
/** A route's markup, or "notFound" when the route calls notFound(). */
async function route(el: ReactElement | Promise<ReactElement>): Promise<string> {
  try {
    return html(await el);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_NOT_FOUND") return "notFound";
    throw e;
  }
}

describe("route files render exactly their shared view", () => {
  it("finds the fixture sets", () => {
    expect(SETS.length).toBeGreaterThanOrEqual(8);
    expect(SETS).toContain("n4");
  });

  for (const set of SETS) {
    for (const drafts of [false, true]) {
      const mode = drafts ? "preview" : "production";

      it(`${set} (${mode}): the index and text pages`, async () => {
        useFixture(set, drafts);
        const c = getContent();
        expect(await route(HomePage())).toBe(html(<HomeView c={c} />));
        expect(await route(ResearchPage())).toBe(html(<ResearchView c={c} />));
        expect(await route(ProjectsPage())).toBe(html(<ProjectsView c={c} />));
        expect(await route(PublicationsPage())).toBe(html(<PublicationsView c={c} />));
        expect(await route(NewsPage())).toBe(html(<NewsListView c={c} />));
        expect(await route(JoinPage())).toBe(html(<JoinView c={c} />));
        expect(await route(AboutPage())).toBe(html(<AboutView c={c} />));
        expect(await route(AccessibilityPage())).toBe(
          html(<TextPageView c={c} name="accessibility" />),
        );
        expect(await route(PrivacyPage())).toBe(html(<TextPageView c={c} name="privacy" />));
      });

      it(`${set} (${mode}): every static param of the detail pages`, async () => {
        useFixture(set, drafts);
        const c = getContent();
        const p = <T,>(v: T) => ({ params: Promise.resolve(v) });
        let pages = 0;

        for (const { direction } of directionParams()) {
          const d = directionDetail(c, direction);
          const got = await route(DirectionPage(p({ direction })));
          expect(got).toBe(d ? html(<DirectionPageView c={c} detail={d} />) : "notFound");
          pages++;
        }
        for (const { slug } of projectParams()) {
          const d = projectDetail(c, slug);
          const got = await route(ProjectPage(p({ slug })));
          expect(got).toBe(d ? html(<ProjectDetailView c={c} d={d} />) : "notFound");
          pages++;
        }
        for (const { slug } of publicationParams()) {
          const d = publicationDetail(c, slug);
          const got = await route(PublicationPage(p({ slug })));
          const want = d
            ? html(
                <PublicationDetailView
                  c={c}
                  d={d}
                  citation={<CitationBlock pub={d.publication} />}
                />,
              )
            : "notFound";
          expect(got).toBe(want);
          pages++;
        }
        for (const { slug } of newsParams()) {
          const d = newsDetail(c, slug);
          const got = await route(NewsItemPage(p({ slug })));
          expect(got).toBe(d ? html(<NewsArticleView c={c} d={d} />) : "notFound");
          pages++;
        }
        for (const { slug } of personParams()) {
          const m = buildPersonProfile(c, slug);
          const got = await route(PersonPage(p({ slug })));
          expect(got).toBe(m ? html(<PersonProfile content={c} model={m} />) : "notFound");
          pages++;
        }
        expect(pages).toBeGreaterThan(0);
      });
    }
  }

  it("the citation slot is drawn only for a paper with a public version", () => {
    useFixture("n4", true);
    const c = getContent();
    const slot = <p data-testid="citation-slot">Citation box</p>;
    let withVersion = 0;
    let without = 0;
    for (const pub of c.publications) {
      const d = publicationDetail(c, pub.slug)!;
      const out = html(<PublicationDetailView c={c} d={d} citation={slot} />);
      expect(out.includes("citation-slot"), pub.slug).toBe(pub.publicVersion);
      if (pub.publicVersion) withVersion++;
      else without++;
      // No slot: the page simply has no citation box (the preview's placeholder case).
      expect(html(<PublicationDetailView c={c} d={d} />)).not.toContain("citation-slot");
    }
    expect(withVersion).toBeGreaterThan(0);
    expect(without + withVersion).toBe(c.publications.length);
  });
});
