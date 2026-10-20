/**
 * Site footer (brief §D1): affiliation + address, lab email, About & contact,
 * Accessibility, Privacy, RSS, "Site issue?" mailto (same place on every page,
 * WCAG 3.2.6), maintainers, "Last updated", and the Reduce motion toggle.
 */
import Link from "next/link";
import type { SiteData } from "@/lib/content/schema";
import { DateText } from "@/components/ui/DateText";
import { Icon } from "@/components/ui/icons";
import { withBasePath } from "@/lib/site/paths";
import { MotionToggle } from "./MotionToggle";

export function SiteFooter({ site, lastUpdated }: { site: SiteData; lastUpdated: string }) {
  const issueHref = `mailto:${site.email}?subject=${encodeURIComponent(`${site.name} website: site issue`)}`;
  return (
    <footer className="bl-footer">
      <div className="bl-container bl-footer__grid">
        <section aria-labelledby="ft-lab">
          <h2 id="ft-lab">{site.name}</h2>
          <p>{site.long_name}</p>
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
              <a href={withBasePath("/news/feed.xml")}>
                <Icon name="rss" /> <span>RSS feed</span>
              </a>
            </li>
          </ul>
        </nav>
        <section aria-labelledby="ft-help">
          <h2 id="ft-help">Help</h2>
          <ul>
            <li>
              <a href={issueHref}>Site issue? Email us</a>
            </li>
          </ul>
          <div style={{ marginTop: "var(--s-3)" }}>
            <MotionToggle />
          </div>
        </section>
      </div>
      <div className="bl-container">
        <div className="bl-footer__base">
          <p>
            {site.maintainers
              ? `Site maintained by ${site.maintainers}.`
              : "Site maintained by the lab."}
          </p>
          <p>
            Last updated <DateText value={lastUpdated} />
          </p>
        </div>
      </div>
    </footer>
  );
}
