/**
 * Page header for WP5 pages: optional eyebrow, the page's single
 * <h1 tabIndex={-1}> (RouteFocus target), a lead and a meta row.
 * The lead may be Markdown (it is rendered with Prose, raw HTML escaped).
 */
import type { ReactNode } from "react";
import { Prose } from "@/components/ui/Prose";
import "./pages.css";

/** Characters above which an h1 uses the smaller "long title" size. */
export const LONG_TITLE = 90;

export function PageHeader({
  eyebrow,
  title,
  lead,
  leadMarkdown,
  meta,
  wide = false,
  titleId,
  metaFirst = false,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Plain-text lead. */
  lead?: string;
  /** Markdown lead (from content). Ignored when `lead` is set. */
  leadMarkdown?: string;
  meta?: ReactNode;
  /** Let a long h1 use the full header width. */
  wide?: boolean;
  /** id on the h1 (for aria-labelledby). */
  titleId?: string;
  /** Put the meta row above the h1 (e.g. a news item's date and type). */
  metaFirst?: boolean;
  children?: ReactNode;
}) {
  // Very long titles (news headlines can be up to 160 characters) step down
  // one size so the h1 does not run to five or more lines.
  const long = typeof title === "string" && title.length > LONG_TITLE;
  const titleClass = [
    "pg-head__title",
    wide ? "pg-head__title--wide" : null,
    long ? "pg-head__title--long" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <header className="pg-head">
      {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
      {meta && metaFirst ? <div className="pg-head__meta">{meta}</div> : null}
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
    </header>
  );
}
