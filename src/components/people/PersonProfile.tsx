/**
 * Person page body (brief §D9 "Person page"): header (avatar, role, name,
 * title/program, the lab affiliation for the PI, tenure, direction tags,
 * links, email only when public), then — each only when it has content — bio,
 * publications (as a linked author, D-05 counted), work in progress, projects,
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
import { ProjectCard } from "@/components/ui/ProjectCard";
import { NewsItem } from "@/components/ui/NewsItem";
import { JsonLd } from "@/components/ui/JsonLd";
import { Icon } from "@/components/ui/icons";
import { PersonAvatar } from "./PersonAvatar";
import { PersonLinks } from "./PersonLinks";
import { Breadcrumb } from "./Breadcrumb";
import type { PersonProfileModel } from "./model";
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
    <div className="bl-container pp-page pp-profile">
      <Breadcrumb trail={[{ href: "/people/", label: "People" }]} current={p.name} />

      <header className="pp-profile__head">
        <PersonAvatar
          person={p}
          swatch={model.item.swatch}
          initials={model.item.initials}
          size="profile"
        />
        <div className="pp-profile__id">
          <p className="t-eyebrow">{model.eyebrow}</p>
          <h1 tabIndex={-1} className="pp-profile__name">
            {p.name}
          </h1>
          {model.lead && <p className="pp-profile__lead">{model.lead}</p>}
          {/* The lab's affiliation (site.yml) under the Faculty Director's title. */}
          {p.role === "pi" && content.site.affiliation_text && (
            <p className="pp-profile__affil">{content.site.affiliation_text}</p>
          )}
          {/* "Alumni" is already in the eyebrow, so no separate badge. */}
          {(model.tenure || p.now_at || p.draft) && (
            <div className="pp-profile__meta">
              {model.tenure && <span className="t-mono">{model.tenure}</span>}
              {p.now_at && <span>Now at {p.now_at}</span>}
              <DraftBadge show={p.draft} />
            </div>
          )}
          {p.interests.length > 0 && (
            <p className="pp-profile__interests">
              <span className="vh">Interests: </span>
              {p.interests.slice(0, 3).join(" · ")}
            </p>
          )}
          {/* Directions are a few tags: they sit with the identity, not in a section of their own. */}
          <PearlTagList items={model.directions} label={`Research directions of ${p.name}`} />
          <PersonLinks name={p.name} links={model.links} variant="buttons" />
        </div>
      </header>

      {sections.length > 1 && (
        <nav className="pp-toc" aria-label="On this page">
          <ul role="list">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="pp-toc__label">{s.label}</span>
                  {s.count !== undefined && (
                    <span className="pp-toc__n">
                      <span className="vh"> (</span>
                      {s.count}
                      <span className="vh">)</span>
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="pp-profile__body">
        {hasBio && (
          <section className="pp-section" aria-labelledby="about">
            <h2 id="about">About</h2>
            <Prose source={p.body} />
          </section>
        )}

        {model.publications.length > 0 && (
          <section className="pp-section" aria-labelledby="publications">
            <div className="pp-section__head">
              <h2 id="publications">Publications</h2>
              {/* Every paper is already listed here, so the link offers the filterable
                  list (search, BibTeX), not "see all". */}
              <Link
                className="pp-section__more"
                href={`/publications/?member=${encodeURIComponent(p.slug)}`}
              >
                View in Publications<span className="vh">, filtered to {p.name}</span>{" "}
                <Icon name="arrow-right" />
              </Link>
            </div>
            <div className="pp-pubs">
              {model.publications.map((pub) => (
                <PublicationEntry key={pub.slug} pub={pub} as="h3" currentPerson={p.slug} />
              ))}
            </div>
          </section>
        )}

        {model.inProgress.length > 0 && (
          <section className="pp-section" aria-labelledby="in-progress">
            <h2 id="in-progress">Work in progress</h2>
            <p className="pp-section__note">Papers in progress, without a public version yet.</p>
            <div className="pp-pubs">
              {model.inProgress.map((pub) => (
                <PublicationEntry key={pub.slug} pub={pub} as="h3" currentPerson={p.slug} />
              ))}
            </div>
          </section>
        )}

        {model.projects.length > 0 && (
          <section className="pp-section" aria-labelledby="projects">
            <h2 id="projects">Projects</h2>
            <ul className="pp-cards" role="list">
              {model.projects.map((pr) => (
                <li key={pr.slug}>
                  <ProjectCard project={pr} as="h3" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {model.news.length > 0 && (
          <section className="pp-section" aria-labelledby="news">
            <h2 id="news">News</h2>
            <div className="pp-news">
              {model.news.map((n) => (
                <NewsItem key={n.slug} item={n} as="h3" />
              ))}
            </div>
          </section>
        )}
      </div>

      <p className="pp-back">
        <Link href="/people/" className="bl-cta bl-cta--quiet">
          All people
        </Link>
      </p>

      {p.role === "pi" && <JsonLd data={profilePageLd(p, path, content.site)} />}
    </div>
  );
}
