/**
 * Site footer (brief §D1; D-13 item 5, P3 `.ft`): one 1 px ink rule, then the
 * label column with the wordmark and the lab's long name, and three columns:
 *   Visit        affiliation, address, lab email
 *   Site         About & contact, Accessibility, Privacy, RSS feed, site-issue mailto
 *   Lab members  site.yml member_links (e.g. the lab scheduler), then the
 *                "Reduce motion" switch
 * and a base line with "Last updated" and the maintainers. Same place on every
 * page (WCAG 3.2.6). Plain text links: no icons, no arrows.
 */
import Link from "next/link";
import type { SiteData } from "@/lib/content/schema";
import { DateText } from "@/components/ui/DateText";
import { Wordmark } from "@/components/brand/Wordmark";
import { withBasePath } from "@/lib/site/paths";
import { MotionToggle } from "./MotionToggle";

export function SiteFooter({ site, lastUpdated }: { site: SiteData; lastUpdated: string }) {
  const issueHref = `mailto:${site.email}?subject=${encodeURIComponent(`${site.name} website: site issue`)}`;
  return (
    <footer className="bl-footer">
      <div className="bl-container">
        <div className="bl-footer__grid">
          <section className="bl-footer__lab" aria-labelledby="ft-lab">
            <h2 id="ft-lab" className="vh">
              {site.name}
            </h2>
            <span className="bl-footer__mark">
              <Wordmark height="1.125rem" title="" />
            </span>
            <p className="bl-footer__meta">{site.long_name}</p>
          </section>
          <section aria-labelledby="ft-visit">
            <h2 id="ft-visit">Visit</h2>
            <p className="bl-footer__meta">{site.affiliation_text}</p>
            <address className="bl-footer__meta">{site.address}</address>
            <p>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </section>
          <nav aria-labelledby="ft-site">
            <h2 id="ft-site">Site</h2>
            <ul>
              <li>
                <Link href="/about/">About &amp; contact</Link>
              </li>
              <li>
                <Link href="/accessibility/">Accessibility</Link>
              </li>
              <li>
                <Link href="/privacy/">Privacy</Link>
              </li>
              <li>
                <a href={withBasePath("/news/feed.xml")}>RSS feed</a>
              </li>
              <li>
                <a href={issueHref}>Report a site issue</a>
              </li>
            </ul>
          </nav>
          <section aria-labelledby="ft-members">
            <h2 id="ft-members">{site.member_links.length > 0 ? "Lab members" : "Display"}</h2>
            {site.member_links.length > 0 ? (
              <ul aria-label="Links for lab members">
                {site.member_links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} rel="noopener noreferrer">
                      {l.label}
                    </a>
                    {l.description ? (
                      <span className="bl-footer__meta bl-footer__desc">{l.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <MotionToggle />
          </section>
          <div className="bl-footer__base">
            <p>
              Last updated <DateText value={lastUpdated} long />
            </p>
            <p>
              {site.maintainers
                ? `Site maintained by ${site.maintainers}.`
                : "Site maintained by the lab."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
