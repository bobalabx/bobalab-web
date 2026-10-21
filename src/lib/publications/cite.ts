/**
 * citation-js setup (server / build time only; never import from a client
 * component). Registers the BibTeX and CSL plugins once and exposes a single
 * `cite()` helper. Input is always CSL-JSON built from content, so citation-js
 * never fetches anything.
 */
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-csl";
import type { CslItem } from "./csl";

export function cite(item: CslItem): InstanceType<typeof Cite> {
  return new Cite([item]);
}
