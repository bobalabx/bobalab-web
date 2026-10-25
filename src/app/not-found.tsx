/**
 * Root not-found UI (brief §D12, §C9): the site's only pun, a link home and
 * the live research directions as a ruled list (each with its 16 px line
 * segment). The export writes it to out/404.html, which GitHub Pages serves
 * for unknown paths. Its <title> comes only from the metadata below (the
 * built-in 404 UI, which adds a second <title>, is replaced).
 * Next adds <meta name="robots" content="noindex"> itself.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content/load";
import { DraftBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/pages/PageHeader";
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
      <PageHeader
        side="Page not found (error 404)"
        title="This page got stuck in the straw"
        lead="We could not find the page you asked for. It may have moved, or the address may be mistyped."
      >
        <p className="pg-404__actions">
          <Link href="/" className="bl-cta">
            Go to the home page
          </Link>
        </p>
      </PageHeader>

      {directions.length ? (
        <section className="pg-row" aria-labelledby="nf-directions">
          <div className="pg-row__label">
            <h2 id="nf-directions">Research directions</h2>
          </div>
          <ul className="pg-dirs">
            {directions.map((d) => (
              <li key={d.slug}>
                <Link href={`/research/${d.slug}/`} data-swatch={d.color}>
                  <span className="bl-seg" aria-hidden="true" />
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

      <p className="pg-fn pg-track">
        Followed a link that should work?{" "}
        <a href={mailtoHref(site.email, `${site.name} website: broken link`)}>
          Tell us at {site.email}
        </a>
        .
      </p>
    </div>
  );
}
