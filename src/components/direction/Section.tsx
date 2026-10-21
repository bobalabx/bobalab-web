/**
 * A labelled page section for the research and project pages: the h2 sits in
 * a narrow label column on wide screens and above the content on narrow ones.
 * Callers render a Section only when it has content (empty sections are hidden).
 */
import type { ReactNode } from "react";

export function Section({
  id,
  title,
  children,
  aside,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  /** Small text under the heading (e.g. a count or a "See all" link). */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={["dr-section", className].filter(Boolean).join(" ")}>
      <div className="dr-section__head">
        <h2 id={id} className="dr-section__title">
          {title}
        </h2>
        {aside && <div className="dr-section__aside">{aside}</div>}
      </div>
      <div className="dr-section__body">{children}</div>
    </section>
  );
}
