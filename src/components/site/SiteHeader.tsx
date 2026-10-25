/**
 * Site header (D-13 items 1–2; P3 `.hd`): the outlined wordmark (BOBALAB in
 * Archivo condensed bold, the first O a pearl) as the home link, and
 * Research · Publications · People · News · Join, over a 1 px ink rule that
 * spans the content column. Not sticky (P3). Carries view-transition-name
 * "site-header" (via CSS) so it stays put during page transitions.
 */
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="bl-header">
      <div className="bl-container">
        <div className="bl-header__inner">
          <Link href="/" className="bl-header__brand" aria-label="BOBALAB home">
            <Wordmark className="bl-header__mark" height="1.375rem" title="" />
          </Link>
          <SiteNav />
        </div>
      </div>
    </header>
  );
}
