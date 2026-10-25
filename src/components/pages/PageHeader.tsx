/**
 * Page header on the label-column grid ("Lines", D-13; P3 .pubs-head): the
 * label column holds short context (a news item's date and type, "Page not
 * found"), the track holds the page's single <h1 tabIndex={-1}> (RouteFocus
 * target), a lead and a meta row. No eyebrows (D-13 item 5).
 * The lead may be Markdown (it is rendered with Prose, raw HTML escaped).
 */
import type { ReactNode } from "react";
import { Prose } from "@/components/ui/Prose";
import "./pages.css";

/** Characters above which an h1 uses the smaller "long title" size. */
export const LONG_TITLE = 90;

export function PageHeader({
  side,
  title,
  lead,
  leadMarkdown,
  meta,
  wide = false,
  titleId,
  metaFirst = false,
  children,
}: {
  /** Short context in the label column (plain muted text). */
  side?: ReactNode;
  title: ReactNode;
  /** Plain-text lead. */
  lead?: string;
  /** Markdown lead (from content). Ignored when `lead` is set. */
  leadMarkdown?: string;
  meta?: ReactNode;
  /** Let a long h1 run wider (news headlines). */
  wide?: boolean;
  /** id on the h1 (for aria-labelledby). */
  titleId?: string;
  /** Put the meta (e.g. a news item's date and type) in the label column. */
  metaFirst?: boolean;
  children?: ReactNode;
}) {
  // Very long titles (news headlines can be up to 160 characters) step down
  // to the 2rem floor of the condensed voice so the h1 stays a few lines.
  const long = typeof title === "string" && title.length > LONG_TITLE;
  const titleClass = [
    "pg-head__title",
    wide ? "pg-head__title--wide" : null,
    long ? "pg-head__title--long" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const sideMeta = meta && metaFirst;
  return (
    <header className="pg-head">
      {side || sideMeta ? (
        <div className="pg-head__side">
          {side}
          {sideMeta ? <div className="pg-head__meta">{meta}</div> : null}
        </div>
      ) : (
        <div className="pg-head__side" aria-hidden="true" />
      )}
      <div className="pg-head__main">
        <h1 tabIndex={-1} id={titleId} className={titleClass}>
          {title}
        </h1>
        {lead ? (
          <p className="pg-lead">{lead}</p>
        ) : leadMarkdown?.trim() ? (
          <Prose source={leadMarkdown} className="pg-lead" />
        ) : null}
        {meta && !metaFirst ? <div className="pg-head__meta">{meta}</div> : null}
        {children}
      </div>
    </header>
  );
}
