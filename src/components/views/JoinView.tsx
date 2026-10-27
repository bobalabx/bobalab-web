/**
 * The Join page body (/join/), shared by the static route and the editor live
 * preview (src/app/editor-preview). Synchronous and pure: everything comes from
 * Content. Three audiences, each a label-column row; positions only from
 * content/opportunities (src/app/join/page.tsx).
 */
import type { Content, OpportunityView } from "@/lib/content/build";
import type { OpportunityEntry } from "@/lib/content/schema";
import { DraftBadge } from "@/components/ui/Badge";
import { Prose } from "@/components/ui/Prose";
import { PageHeader } from "@/components/pages/PageHeader";
import { MailLink, linksEmail } from "@/components/pages/MailLink";
import {
  OpportunityCard,
  compareOpportunities,
  statusLabel,
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

export function JoinView({ c }: { c: Content }) {
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
                  {/* No "Status" head over rows that show none (a status the lab has not set). */}
                  {opps.some((o) => statusLabel(o) || o.draft) ? <span>Status</span> : null}
                </div>
              ) : null}
              {opps.length ? (
                <ul className="pg-opps" aria-label={`Opportunities: ${s.nav}`}>
                  {opps.map((o) => (
                    <li key={o.slug}>
                      <OpportunityCard o={o} labEmail={site.email} />
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
    </div>
  );
}
