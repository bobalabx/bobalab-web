/**
 * "Cite" (brief §D8; P3 paper.html `.cite`): an APA reference and a BibTeX
 * entry side by side, each under a hairline bar with its own Copy button, both
 * generated at build time with citation-js from content. BibTeX is set in the
 * system ui-monospace stack (no mono webfont, D-13 item 3).
 * Server component; only the Copy buttons are client code.
 */
import type { CSSProperties } from "react";
import type { PublicationView } from "@/lib/content/load";
import { bibtexFor } from "@/lib/publications/bibtex";
import { formatCitation } from "@/lib/publications/citation";
import { CopyButton } from "./CopyButton";

/**
 * One block per BibTeX line, each ending in its own "\n" so the text (and a
 * manual selection) is exactly the BibTeX. A long value wraps with a hanging
 * indent that lines up under the opening brace.
 */
function BibLines({ bibtex }: { bibtex: string }) {
  const lines = bibtex.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const hang = /^\s*[A-Za-z]+\s*=\s*\{?/.exec(line)?.[0].length ?? 0;
        return (
          <span
            key={i}
            className="pub-bib__line"
            style={hang ? ({ "--hang": `${hang}ch` } as CSSProperties) : undefined}
          >
            {line}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        );
      })}
    </>
  );
}

export function CitationBlock({ pub }: { pub: PublicationView }) {
  const bibtex = bibtexFor(pub);
  const reference = formatCitation(pub);
  return (
    <section className="pub-sec pub-cite" aria-labelledby="cite-h">
      <h2 id="cite-h" className="pub-sec__h">
        Cite
      </h2>
      <div className="pub-sec__body pub-cite__grid">
        {reference.length > 0 && (
          <div className="pub-cite__ref">
            <div className="pub-cite__bar">
              <h3 className="pub-cite__label">APA</h3>
              <CopyButton targetId="pub-apa" what="APA reference" />
            </div>
            <p className="pub-cite__text" id="pub-apa">
              {reference.map((s, i) => (s.italic ? <i key={i}>{s.text}</i> : s.text))}
            </p>
          </div>
        )}
        <div className="pub-bib">
          <div className="pub-cite__bar">
            <h3 className="pub-cite__label">BibTeX</h3>
            <CopyButton targetId="pub-bibtex" what="BibTeX" />
          </div>
          <pre className="pub-bib__pre">
            <code id="pub-bibtex">
              <BibLines bibtex={bibtex} />
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
