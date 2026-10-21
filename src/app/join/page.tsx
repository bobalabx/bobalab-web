/**
 * /join/: Join / work with us (brief §D11, DECISIONS D-05). Three audiences:
 * students & RAs, partners & data collaborators, press. Text comes from
 * content/pages/join.yml; positions, routes and open/closed status (with the
 * "as of" date) come only from content/opportunities. One contact address
 * (site.yml → email) as a mailto: link. Nothing is invented: no deadlines or
 * positions that content does not list.
 */
import type { Metadata } from "next";
import { getContent, type OpportunityView } from "@/lib/content/load";
import type { OpportunityEntry } from "@/lib/content/schema";
import { markdownToText } from "@/lib/content/markdoc";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { DraftBadge } from "@/components/ui/Badge";
import { Prose } from "@/components/ui/Prose";
import { PageHeader } from "@/components/pages/PageHeader";
import { MailLink, linksEmail } from "@/components/pages/MailLink";
import { OpportunityCard, compareOpportunities } from "@/components/pages/OpportunityCard";

type Audience = OpportunityEntry["audience"];

interface AudienceSection {
  id: string;
  title: string;
  nav: string;
  audiences: Audience[];
  prose?: string;
  /** Extra subsection (partners: the PI's data-handling statement). */
  extra?: { title: string; markdown?: string };
  subject: string;
}

export function generateMetadata(): Metadata {
  const { pages, site } = getContent();
  // markdownToText joins inline nodes with spaces ("…the lab: x@y.edu ."); tidy
  // the space it leaves before punctuation so the description reads normally.
  const intro = pages.join?.intro
    ? markdownToText(pages.join.intro).replace(/\s+([.,;:!?])/g, "$1")
    : undefined;
  return pageMetadata({
    title: "Work with us",
    description:
      clipDescription(intro) ??
      `How students, research partners and journalists can work with ${site.name}.`,
    path: "/join/",
  });
}

export default function JoinPage() {
  const c = getContent();
  const { site } = c;
  const join = c.pages.join;
  const sections: AudienceSection[] = [
    {
      id: "students",
      title: "Students & research assistants",
      nav: "Students & RAs",
      audiences: ["students", "phd-postdoc"],
      prose: join?.students,
      subject: `${site.name}: student research inquiry`,
    },
    {
      id: "partners",
      title: "Partners & data collaborators",
      nav: "Partners & data collaborators",
      audiences: ["partners"],
      prose: join?.partners,
      extra: { title: "How we handle data", markdown: join?.data_statement },
      subject: `${site.name}: collaboration inquiry`,
    },
    {
      id: "press",
      title: "Press",
      nav: "Press",
      audiences: ["press"],
      prose: join?.press,
      subject: `${site.name}: media request`,
    },
  ];
  const oppsFor = (audiences: Audience[]): OpportunityView[] =>
    c.opportunities.filter((o) => audiences.includes(o.audience)).sort(compareOpportunities);

  return (
    <div className="bl-container pg">
      <PageHeader
        eyebrow="Join"
        title="Work with us"
        leadMarkdown={join?.intro}
        meta={join?.draft ? <DraftBadge /> : null}
      >
        <nav aria-label="On this page">
          <ul className="pg-jump">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.nav}</a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      {sections.map((s) => {
        const opps = oppsFor(s.audiences);
        const extra = s.extra?.markdown?.trim() ? s.extra : undefined;
        const hasSide = opps.length > 0 || Boolean(extra);
        const showMail =
          !linksEmail(s.prose, site.email) && !linksEmail(extra?.markdown, site.email);
        return (
          <section key={s.id} className="pg-section" aria-labelledby={s.id}>
            <div className={hasSide ? "pg-audience" : "pg-audience pg-audience--solo"}>
              <div className="pg-audience__intro">
                <h2 id={s.id}>{s.title}</h2>
                {s.prose?.trim() ? <Prose source={s.prose} /> : null}
                {showMail ? (
                  <MailLink email={site.email} subject={s.subject} label="Email" />
                ) : null}
              </div>
              {hasSide ? (
                <div className="pg-audience__body">
                  {opps.length ? (
                    <ul className="pg-opps" aria-label={`Opportunities: ${s.nav}`}>
                      {opps.map((o) => (
                        <li key={o.slug}>
                          <OpportunityCard o={o} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {extra ? (
                    <div className="pg-panel">
                      <h3 className="pg-subhead">{extra.title}</h3>
                      <Prose source={extra.markdown} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
