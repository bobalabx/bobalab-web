/**
 * Direction page header (P3 `research.html` `.dr-head`; D-13).
 *
 * Label column: what this is ("Research direction", or "Earlier research")
 * and "All directions", which returns to Fig. 1 with
 * the reverse morph (`pearl-close`). No counts or shares sentences (copy
 * sweep): the sections below carry the papers and projects, and Figure 1 the
 * shared papers. Track: the condensed h1 and the guiding question as the dek.
 * No band, no tint, no pearl here: the direction's pearl heads the direction's
 * figure at "now" (Figure2.tsx), which is the morph target.
 * <h1 tabIndex={-1}> so RouteFocus can land on it after a client navigation.
 */
import Link from "next/link";
import type { DirectionView } from "@/lib/content/load";
import { TRANSITION } from "@/lib/vt";
import { DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";

export function DirectionHeader({ direction: d }: { direction: DirectionView }) {
  const archived = d.status === "archived" || d.index == null;
  return (
    <header className="dr-head" data-swatch={d.color}>
      <div className="dr-head__side">
        {archived ? (
          <p className="dr-kind">
            <b>Earlier research</b>
          </p>
        ) : (
          <p className="dr-kind">
            <b>Research direction</b>
            {d.status === "emerging" ? ", emerging" : null}
            {d.active_since ? `, since ${d.active_since}` : null}
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
