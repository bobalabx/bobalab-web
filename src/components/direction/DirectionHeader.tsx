/**
 * Direction page header (P3 `research.html` `.dr-head`; D-13).
 *
 * Label column: what this is ("Research direction", or "Earlier research"
 * with its archive date), the derived counts sentence, the papers it shares
 * with other directions, and "All directions", which returns to Fig. 1 with
 * the reverse morph (`pearl-close`). Track: the condensed h1 and the guiding
 * question as the dek. No band, no tint, no pearl here: the direction's pearl
 * heads Figure 2 at "now" (Figure2.tsx), which is the morph target.
 * <h1 tabIndex={-1}> so RouteFocus can land on it after a client navigation.
 */
import Link from "next/link";
import { Fragment } from "react";
import type { DirectionView } from "@/lib/content/load";
import { TRANSITION } from "@/lib/vt";
import { DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { countsSentence, plural, type SharedCount } from "./model";

export function DirectionHeader({
  direction: d,
  shared,
  asOf,
}: {
  direction: DirectionView;
  shared: SharedCount[];
  asOf: string;
}) {
  const archived = d.status === "archived" || d.index == null;
  return (
    <header className="dr-head" data-swatch={d.color}>
      <div className="dr-head__side">
        {archived ? (
          <p className="dr-kind">
            <b>Earlier research</b>
            {d.archived_on && (
              <>
                , archived <DateText value={d.archived_on} long />
              </>
            )}
            .
          </p>
        ) : (
          <p className="dr-kind">
            <b>Research direction</b>
            {d.status === "emerging" ? ", emerging" : null}
            {d.active_since ? `, since ${d.active_since}` : null}
          </p>
        )}
        <p className="dr-status">
          {countsSentence(d.counts)}, as of {asOf}.
        </p>
        {shared.length > 0 && (
          <p className="dr-shares">
            Shares{" "}
            {shared.map((s, i) => (
              <Fragment key={s.direction.slug}>
                {i > 0 ? (i === shared.length - 1 ? " and " : ", ") : null}
                {i === 0 ? plural(s.count, "paper") : s.count} with{" "}
                <Link href={`/research/${s.direction.slug}/`}>{s.direction.short_label}</Link>
              </Fragment>
            ))}
            .
          </p>
        )}
        <p className="dr-backline">
          {archived ? (
            <Link href="/research/" className="dr-back">
              All research
            </Link>
          ) : (
            <Link href="/" className="dr-back" transitionTypes={[TRANSITION.pearlClose]}>
              All directions
            </Link>
          )}
        </p>
      </div>
      <div className="dr-head__main">
        <h1 tabIndex={-1} className="dr-title">
          {d.title}
        </h1>
        {d.question && <p className="dr-question">{d.question}</p>}
        {(d.openToRAs || d.draft) && (
          <p className="dr-flags">
            {d.openToRAs && <OpenToRAsBadge />}
            <DraftBadge show={d.draft} />
          </p>
        )}
      </div>
    </header>
  );
}
