/**
 * About page fact sheet (brief §D11): the lab's name, the PI with links
 * (including the Haas faculty profile when the person record carries one),
 * affiliation, mailing address and email. Every value comes from content
 * (site.yml and the PI's person file); nothing here is hard-coded.
 */
import Link from "next/link";
import type { SiteData } from "@/lib/content/schema";
import type { PublicPerson } from "@/lib/content/people";
import { ROLE_LABELS, initials } from "@/lib/content/people";
import { Pearl } from "@/components/ui/Pearl";
import { Icon } from "@/components/ui/icons";
import { isExternalUrl, withBasePath } from "@/lib/site/paths";
import { MailLink } from "./MailLink";
import "./pages.css";

/** Link labels, in display order. `haas` is read if the person schema provides it. */
const PI_LINKS: Array<[key: string, label: string]> = [
  ["haas", "Haas faculty profile"],
  ["website", "Personal website"],
  ["scholar", "Google Scholar"],
  ["orcid", "ORCID"],
  ["cv", "CV"],
  ["linkedin", "LinkedIn"],
  ["github", "GitHub"],
];

export function piLinks(pi: PublicPerson): Array<{ key: string; label: string; href: string }> {
  const links = (pi.links ?? {}) as Record<string, string | undefined>;
  return PI_LINKS.flatMap(([key, label]) => {
    const href = links[key];
    return href ? [{ key, label, href }] : [];
  });
}

export function LabFacts({ site, pi }: { site: SiteData; pi: PublicPerson | undefined }) {
  const links = pi ? piLinks(pi) : [];
  return (
    <div className="pg-panel">
      <h2 id="about-facts" className="pg-panel__title">
        At a glance
      </h2>
      <dl className="pg-facts">
        <div>
          <dt>Lab</dt>
          <dd>
            {site.long_name} ({site.name})
          </dd>
        </div>
        {pi ? (
          <div>
            <dt>{ROLE_LABELS.pi.one}</dt>
            <dd>
              <div className="pg-person">
                <Pearl size="row" initials={initials(pi.name)} />
                <div>
                  <p className="pg-person__name">
                    {pi.hasProfile ? <Link href={`/people/${pi.slug}/`}>{pi.name}</Link> : pi.name}
                  </p>
                  {pi.title ? <p className="pg-person__title">{pi.title}</p> : null}
                </div>
              </div>
              {links.length ? (
                <ul className="pg-links pg-links--spaced" aria-label={`Links for ${pi.name}`}>
                  {links.map((l) => {
                    const external = isExternalUrl(l.href);
                    return (
                      <li key={l.key}>
                        <a
                          href={external ? l.href : withBasePath(l.href)}
                          rel={external ? "noopener noreferrer" : undefined}
                        >
                          {l.label}
                          {external ? <Icon name="external" /> : null}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Affiliation</dt>
          <dd>{site.affiliation_text}</dd>
        </div>
        <div>
          <dt>Mailing address</dt>
          <dd>
            <address>{site.address}</address>
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <MailLink email={site.email} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
