/**
 * Person page body (brief §D9 "Person page"), on the label-column grid
 * (D-13): header (160 px square photo or initials square, role, name,
 * title/program, the lab affiliation for the PI, tenure, direction tags,
 * links, email only when public), then — each only when it has content — bio,
 * the newest publications (as a linked author, D-05 counted) with a link to the
 * full filtered list, work in progress (collapsed), projects (compact rows),
 * news.
 * The PI's page carries ProfilePage + Person JSON-LD (brief §G3).
 */
import Link from "next/link";
import type { Content } from "@/lib/content/load";
import { profilePageLd } from "@/lib/seo/jsonld";
import { DraftBadge } from "@/components/ui/Badge";
import { PearlTagList } from "@/components/ui/PearlTag";
import { Prose } from "@/components/ui/Prose";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { NewsItem } from "@/components/ui/NewsItem";
import { JsonLd } from "@/components/ui/JsonLd";
import { CompactProjectList } from "@/components/projects/CompactProjectList";
import { PersonAvatar } from "./PersonAvatar";
import { PersonLinks } from "./PersonLinks";
import { Breadcrumb } from "./Breadcrumb";
import type { PersonProfileModel } from "./model";
import "@/components/projects/projects.css";
import "@/components/pages/pages.css";
import "./people.css";

interface SectionLink {
  id: string;
  label: string;
  count?: number;
}

export function PersonProfile({ content, model }: { content: Content; model: PersonProfileModel }) {
  const p = model.item.person;
  const path = `/people/${p.slug}/`;
  const hasBio = Boolean(p.body?.trim());
  const morePubs = model.publications.length > model.shownPublications.length;

  const sections: SectionLink[] = [
    ...(hasBio ? [{ id: "about", label: "About" }] : []),
    ...(model.publications.length
      ? [{ id: "publications", label: "Publications", count: model.publications.length }]
      : []),
    ...(model.inProgress.length
      ? [{ id: "in-progress", label: "Work in progress", count: model.inProgress.length }]
      : []),
    ...(model.projects.length
      ? [{ id: "projects", label: "Projects", count: model.projects.length }]
      : []),
    ...(model.news.length ? [{ id: "news", label: "News", count: model.news.length }] : []),
  ];

  return (
    <div className="bl-container pg pp-page pp-profile">
      <Breadcrumb trail={[{ href: "/people/", label: "People" }]} current={p.name} />

      <header className="pp-profile__head">
        <PersonAvatar
          person={p}
          swatch={model.item.swatch}
          initials={model.item.initials}
          size="profile"
        />
        <div className="pp-profile__id">
          <h1 tabIndex={-1} className="pp-profile__name">
            {p.name}
          </h1>
          {model.lead && <p className="pp-profile__lead">{model.lead}</p>}
          {/* The lab's affiliation (site.yml) under the principal investigator's title. */}
          {p.role === "pi" && content.site.affiliation_text && (
            <p className="pp-profile__affil">{content.site.affiliation_text}</p>
          )}
          {/* The lab role follows the name and title as plain meta (no eyebrow above
              the h1, D-13 item 5). "Alumni" is already in the role line, so no
              separate marker. */}
          <div className="pp-profile__meta">
            <span className="pp-profile__role">{model.eyebrow}</span>
            {model.tenure && <span className="t-num">{model.tenure}</span>}
            {p.now_at && <span>Now at {p.now_at}</span>}
            <DraftBadge show={p.draft} />
          </div>
          {p.interests.length > 0 && (
            <p className="pp-profile__interests">
              <span className="vh">Interests: </span>
              {p.interests.slice(0, 3).join(", ")}
            </p>
          )}
          {/* Directions are a few tags: they sit with the identity, not in a section of their own. */}
          <PearlTagList items={model.directions} label={`Research directions of ${p.name}`} />
          <PersonLinks name={p.name} links={model.links} variant="lead" />
          {sections.length > 1 && (
            <nav className="pp-toc" aria-label="On this page">
              <ul role="list">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>
                      <span className="pp-toc__label">{s.label}</span>
                      {s.count !== undefined && (
                        <>
                          {" "}
                          <span className="pp-toc__n">
                            <span className="vh">(</span>
                            {s.count}
                            <span className="vh">)</span>
                          </span>
                        </>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>

      <div className="pp-profile__body">
        {hasBio && (
          <section className="pg-row pp-section" aria-labelledby="about">
            <div className="pg-row__label">
              <h2 id="about">About</h2>
            </div>
            <Prose source={p.body} />
          </section>
        )}

        {model.publications.length > 0 && (
          <section className="pg-row pp-section" aria-labelledby="publications">
            <div className="pg-row__label">
              <h2 id="publications">Publications</h2>
              <span className="pg-row__count">
                {model.publications.length} {model.publications.length === 1 ? "paper" : "papers"}
              </span>
            </div>
            {/* The newest few; the full list (search, filters, BibTeX) is one link away,
                filtered to this person, so a long record does not bury the page. */}
            <div>
              <div className="pp-pubs">
                {model.shownPublications.map((pub) => (
                  <PublicationEntry key={pub.slug} pub={pub} as="h3" currentPerson={p.slug} />
                ))}
              </div>
              <p className="pp-section__foot">
                <Link
                  className="pp-section__more"
                  href={`/publications/?member=${encodeURIComponent(p.slug)}`}
                >
                  {morePubs
                    ? `All ${model.publications.length} publications`
                    : "View in Publications"}
                  <span className="vh"> by {p.name}</span>
                </Link>
              </p>
            </div>
          </section>
        )}

        {model.inProgress.length > 0 && (
          <section className="pg-row pp-section" aria-labelledby="in-progress">
            <div className="pg-row__label">
              <h2 id="in-progress">Work in progress</h2>
            </div>
            <div>
              {/* Collapsed: titles without a public version are secondary to the papers.
                  The heading stays outside, so the on-page link always lands on it. */}
              <details className="pp-disclosure">
                <summary className="pp-disclosure__summary">
                  <span className="pp-disclosure__show">Show work in progress</span>
                  <span className="pp-disclosure__hide">Hide work in progress</span>
                </summary>
                <div className="pp-pubs">
                  {model.inProgress.map((pub) => (
                    <PublicationEntry key={pub.slug} pub={pub} as="h3" currentPerson={p.slug} />
                  ))}
                </div>
              </details>
            </div>
          </section>
        )}

        {model.projects.length > 0 && (
          <section className="pg-row pp-section" aria-labelledby="projects">
            <div className="pg-row__label">
              <h2 id="projects">Projects</h2>
              <span className="pg-row__count">
                {model.projects.length} {model.projects.length === 1 ? "project" : "projects"}
              </span>
            </div>
            {/* Compact rows (title, directions, years), active first; the full rows live on /projects/. */}
            <CompactProjectList projects={model.projects} label={`Projects of ${p.name}`} />
          </section>
        )}

        {model.news.length > 0 && (
          <section className="pg-row pp-section" aria-labelledby="news">
            <div className="pg-row__label">
              <h2 id="news">News</h2>
            </div>
            <div className="pp-news">
              {model.news.map((n) => (
                <NewsItem key={n.slug} item={n} as="h3" />
              ))}
            </div>
          </section>
        )}
      </div>

      <p className="pp-back pg-track">
        <Link href="/people/" className="bl-cta bl-cta--quiet">
          All people
        </Link>
      </p>

      {p.role === "pi" && <JsonLd data={profilePageLd(p, path, content.site)} />}
    </div>
  );
}
