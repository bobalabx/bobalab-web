/**
 * A person's public links (Haas profile, website, Scholar, LinkedIn, GitHub, ORCID, CV) and
 * email only when `email_public` (the loader drops it otherwise). Every link's
 * accessible name includes the person's name (WCAG 2.4.4).
 */
import { isExternalUrl, withBasePath } from "@/lib/site/paths";
import type { PersonLink } from "./model";

export function PersonLinks({
  name,
  links,
  variant = "inline",
}: {
  name: string;
  links: PersonLink[];
  /** inline: compact text links (cards); buttons: outlined pills (profile header). */
  variant?: "inline" | "buttons";
}) {
  if (!links.length) return null;
  return (
    <ul className={`pp-links pp-links--${variant}`} aria-label={`Links for ${name}`}>
      {links.map((l) => {
        const external = isExternalUrl(l.href);
        const mail = l.href.startsWith("mailto:");
        return (
          <li key={l.key}>
            <a
              href={external || mail ? l.href : withBasePath(l.href)}
              rel={external ? "noopener noreferrer" : undefined}
            >
              {l.label}
              <span className="vh">{mail ? ` ${name}` : ` of ${name}`}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
