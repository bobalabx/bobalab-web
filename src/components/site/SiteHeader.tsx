/**
 * Site header: wordmark (link home) + Research · Publications · People · News · Join.
 * Sticky from 48rem; carries view-transition-name "site-header" (via CSS) so it
 * stays put during page transitions.
 */
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="bl-header">
      <div className="bl-container bl-header__inner">
        <Link href="/" className="bl-header__brand" aria-label="BOBALAB home">
          <Wordmark height="1.6rem" title="" />
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
