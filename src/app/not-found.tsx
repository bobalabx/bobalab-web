/**
 * Root not-found UI (brief §D12, §C9): the site's only pun, a link home and
 * the live research directions. The export writes it to out/404.html, which
 * GitHub Pages serves for unknown paths. Its <title> comes only from the
 * metadata below (the built-in 404 UI, which adds a second <title>, is replaced).
 * Next adds <meta name="robots" content="noindex"> itself.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content/load";
import { Icon } from "@/components/ui/icons";
import { Pearl } from "@/components/ui/Pearl";
import { DraftBadge } from "@/components/ui/Badge";
import { mailtoHref } from "@/components/pages/MailLink";
import "@/components/pages/pages.css";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you asked for does not exist or has moved.",
};

export default function NotFound() {
  const { directions, site } = getContent();
  return (
    <div className="bl-container pg pg-404">
      <header className="pg-404__head">
        <p className="pg-404__code">Error 404 · Page not found</p>
        <h1 tabIndex={-1}>This page got stuck in the straw</h1>
        <p className="pg-lead">
          We could not find the page you asked for. It may have moved, or the address may be
          mistyped.
        </p>
        <p className="pg-404__actions">
          <Link href="/" className="bl-cta">
            Go to the home page <Icon name="arrow-right" />
          </Link>
        </p>
      </header>

      {directions.length ? (
        <section className="pg-section" aria-labelledby="nf-directions">
          <h2 id="nf-directions">Research directions</h2>
          <ul className="pg-dirs">
            {directions.map((d) => (
              <li key={d.slug}>
                <Link href={`/research/${d.slug}/`} data-swatch={d.color}>
                  <Pearl swatch={d.color} size="row" index={d.index} />
                  <span>
                    <span className="pg-dirs__title">{d.title}</span>
                    {d.question ? <span className="pg-dirs__q">{d.question}</span> : null}
                    <DraftBadge show={d.draft} line />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="t-sm t-muted">
        Followed a link that should work?{" "}
        <a href={mailtoHref(site.email, `${site.name} website: broken link`)}>
          Tell us at {site.email}
        </a>
        .
      </p>
    </div>
  );
}
