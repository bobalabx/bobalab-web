/**
 * /join/: Join / work with us (brief §D11, DECISIONS D-05). Three audiences:
 * students & RAs, partners & data collaborators, press, each a label-column
 * row. Text comes from content/pages/join.yml; positions, routes and
 * open/closed status (with the "as of" date) come only from
 * content/opportunities, shown as a ruled ledger. One footnote states the
 * shared "as of" date and what a dash means (D-13 item 7: no repeated
 * "Status not confirmed"). One contact address (site.yml → email) as a mailto:
 * link. Nothing is invented: no deadlines or positions that content does not list.
 */
import type { Metadata } from "next";
import { getContent, type OpportunityView } from "@/lib/content/load";
import type { OpportunityEntry } from "@/lib/content/schema";
import { markdownToText } from "@/lib/content/markdoc";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Prose } from "@/components/ui/Prose";
import { PageHeader } from "@/components/pages/PageHeader";
import { MailLink, linksEmail } from "@/components/pages/MailLink";
import {
  OpportunityCard,
  compareOpportunities,
  isUnconfirmed,
  sharedAsOf,
} from "@/components/pages/OpportunityCard";

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
    title: "Join the lab",
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
  const asOf = sharedAsOf(c.opportunities);
  const anyUnconfirmed = c.opportunities.some(isUnconfirmed);

  return (
    <div className="bl-container pg">
      <PageHeader
        title="Join the lab"
        leadMarkdown={join?.intro}
        meta={join?.draft ? <DraftBadge /> : null}
        metaFirst
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
        const showMail =
          !linksEmail(s.prose, site.email) && !linksEmail(extra?.markdown, site.email);
        return (
          <section key={s.id} className="pg-row pg-section" aria-labelledby={s.id}>
            <div className="pg-row__label">
              <h2 id={s.id}>{s.title}</h2>
            </div>
            <div className="pg-audience">
              {s.prose?.trim() ? <Prose source={s.prose} /> : null}
              {showMail ? <MailLink email={site.email} subject={s.subject} label="Email" /> : null}
              {opps.length ? (
                <div className="pg-opps__h" aria-hidden="true">
                  <span>Opportunity</span>
                  <span>Status</span>
                </div>
              ) : null}
              {opps.length ? (
                <ul className="pg-opps" aria-label={`Opportunities: ${s.nav}`}>
                  {opps.map((o) => (
                    <li key={o.slug}>
                      <OpportunityCard o={o} asOfInNote={Boolean(asOf)} labEmail={site.email} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {extra ? (
                <>
                  <h3 className="pg-subhead">{extra.title}</h3>
                  <Prose source={extra.markdown} />
                </>
              ) : null}
            </div>
          </section>
        );
      })}

      {c.opportunities.length && (asOf || anyUnconfirmed) ? (
        <p className="pg-fn pg-track" id="join-note">
          {asOf ? (
            <>
              Statuses as of <DateText value={asOf} />.{" "}
            </>
          ) : null}
          {anyUnconfirmed
            ? "A dash marks an opportunity whose status the lab has not confirmed; email the lab to ask."
            : null}
        </p>
      ) : null}
    </div>
  );
}
