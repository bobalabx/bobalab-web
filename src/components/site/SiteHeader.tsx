/**
 * Site header: small pearl mark + mono "BOBALAB" lockup (link home) + Research ·
 * Publications · People · News · Join. The large wordmark appears only in the
 * home hero, so there is one large wordmark per screen (D-02a, JUDGE.md fix 11).
 * Sticky from 48rem; carries view-transition-name "site-header" (via CSS) so it
 * stays put during page transitions.
 */
import Link from "next/link";
import { PearlMark } from "@/components/brand/PearlMark";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="bl-header">
      <div className="bl-container bl-header__inner">
        <Link href="/" className="bl-header__brand" aria-label="BOBALAB home">
          <PearlMark size="1.25rem" />
          <span className="bl-header__name" aria-hidden="true">
            BOBALAB
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
