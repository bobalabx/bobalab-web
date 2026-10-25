/**
 * Home first screen (DECISIONS D-14; docs/simplify/JUDGE.md §5, R1, R6, R15):
 *
 *   h1    the statement, in the scoped display size (--t-display; the only text
 *         above 2.25rem), the page's only h1;
 *   who   "BOBALAB is a research lab at …, led by Prof. …" (homeWho: site.yml and
 *         the PI's people entry, nothing hard-coded);
 *   why   home.why, else the mission (homeHeroCopy);
 *   links exactly one primary ("Explore the research") and one secondary ("Read
 *         the papers");
 *   cup   the boba cup (src/components/cup), beside the text from 48rem, below
 *         it on phones (h1 → who → why → links → cup → hint).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { DraftBadge } from "@/components/ui/Badge";
import type { HomeHeroCopy } from "@/lib/content/queries";
import "./home.css";

/** The display line until content/pages/home.yml carries `statement`. */
export const HOME_STATEMENT = "How people learn to work with algorithms";

/** Keep "University of California" together (no-break spaces). */
export function affiliationText(text: string): string {
  return text.replace(/University of California/g, "University of California");
}

export function HomeHero({ copy, cup }: { copy: HomeHeroCopy; cup: ReactNode }) {
  return (
    <section className="hm-hero" aria-labelledby="hm-h1">
      <div className="hm-copy">
        <h1 id="hm-h1" className="hm-h1" tabIndex={-1}>
          {copy.statement ?? HOME_STATEMENT}
        </h1>
        <p className="hm-who">{affiliationText(copy.who.text)}</p>
        {copy.why && (
          <p className="hm-why">
            {copy.why}
            {copy.draft && (
              <>
                {" "}
                <DraftBadge />
              </>
            )}
          </p>
        )}
        <ul role="list" className="hm-links">
          <li>
            <Link href="/research/" className="hm-go">
              Explore the research
            </Link>
          </li>
          <li>
            <Link href="/publications/">Read the papers</Link>
          </li>
        </ul>
      </div>
      <div className="hm-cup">{cup}</div>
    </section>
  );
}
