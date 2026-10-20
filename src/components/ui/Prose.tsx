/** Markdown body rendered with Markdoc (raw HTML escaped; headings start at h2). */
import * as React from "react";
import Markdoc from "@markdoc/markdoc";
import { renderMarkdown } from "@/lib/content/markdoc";

export function Prose({
  source,
  className,
}: {
  source: string | undefined | null;
  className?: string;
}) {
  if (!source?.trim()) return null;
  const tree = renderMarkdown(source);
  return (
    <div className={["prose", className].filter(Boolean).join(" ")}>
      {Markdoc.renderers.react(tree, React)}
    </div>
  );
}
