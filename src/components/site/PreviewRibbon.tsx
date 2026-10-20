/**
 * Slim site-wide ribbon shown only in preview builds (dev, build:preview),
 * which include drafts (DECISIONS D-03). Never rendered in production.
 */
export function PreviewRibbon({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="bl-preview" role="note" aria-label="Preview build">
      <div className="bl-container">
        <strong>Preview</strong>
        This build includes drafts pending lab review. It is not the public site.
      </div>
    </div>
  );
}
