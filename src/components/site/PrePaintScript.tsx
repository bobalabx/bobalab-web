/**
 * Inline <head> script that runs before first paint (Next "preventing flash"
 * pattern): applies the stored "Reduce motion" choice and sets data-intro once
 * per session on the home page. <html> carries suppressHydrationWarning.
 * This is one of the two allowed dangerouslySetInnerHTML uses (§G4).
 */
import { prePaintSource } from "@/lib/site/motion";
import { BASE_PATH } from "@/lib/site/paths";

export function PrePaintScript() {
  return (
    <script id="bl-prepaint" dangerouslySetInnerHTML={{ __html: prePaintSource(BASE_PATH) }} />
  );
}
