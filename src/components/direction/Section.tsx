/**
 * A labelled page section on the label-column grid (P3 `.sec.two`): the h2
 * sits in the 18rem label column on wide screens and above the content on
 * narrow ones. Callers render a Section only when it has content (empty
 * sections are hidden). `aside` is muted meta under the heading (a count).
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
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={["dr-section", className].filter(Boolean).join(" ")}>
      <div className="dr-section__head">
        <h2 id={id} className="dr-section__title">
          {title}
        </h2>
        {aside && <p className="dr-section__aside">{aside}</p>}
      </div>
      <div className="dr-section__body">{children}</div>
    </section>
  );
}
