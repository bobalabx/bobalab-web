/**
 * /editor-preview/: the content manager's live preview (spec §2.1, D1). The
 * editor at /admin/ embeds this page in its right column and posts the saved
 * site plus the form's draft (src/lib/preview/protocol.ts); the page renders
 * the site's own page views from them in the browser, so the column shows the
 * real site with the unsaved changes.
 *
 * The page has no data of its own: no content file is exported, nothing is
 * fetched, and the prerendered HTML is only the shell (a "Loading the site…"
 * note and the hidden standalone notice). Views render only after the editor
 * has sent the saved site. Never indexed (noindex here, Disallow in
 * robots.txt) and never in the sitemap.
 */
import type { Metadata } from "next";
import { EditorPreview } from "./EditorPreview";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default function EditorPreviewPage() {
  return <EditorPreview />;
}
