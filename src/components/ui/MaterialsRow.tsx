/**
 * Materials row (brief §D7–§D8; D-13 item 5): plain text links
 * "PDF  SSRN  arXiv  DOI  Code  Data  Slides  Video  Press", separated by space,
 * with no icons, buttons or arrows. Every link's accessible name includes the
 * paper title (WCAG 2.4.4), e.g. "PDF of Learning on the Go". Targets ≥ 24 px.
 */
import { withBasePath } from "@/lib/site/paths";

export type MaterialKind =
  "pdf" | "ssrn" | "arxiv" | "doi" | "publisher" | "code" | "data" | "slides" | "video" | "press";

const META: Record<MaterialKind, { label: string; prep: string }> = {
  pdf: { label: "PDF", prep: "of" },
  ssrn: { label: "SSRN", prep: "page for" },
  arxiv: { label: "arXiv", prep: "page for" },
  doi: { label: "DOI", prep: "link for" },
  publisher: { label: "Publisher", prep: "page for" },
  code: { label: "Code", prep: "for" },
  data: { label: "Data", prep: "for" },
  slides: { label: "Slides", prep: "for" },
  video: { label: "Video", prep: "for" },
  press: { label: "Press", prep: "about" },
};

export interface MaterialLink {
  kind: MaterialKind;
  href: string;
  /** Overrides the visible label (e.g. the press outlet's name). */
  label?: string;
}

/** Build the materials list from a publication's links, DOI and press. */
export function materialsFromPublication(p: {
  doi?: string;
  links?: Partial<
    Record<"pdf" | "ssrn" | "arxiv" | "publisher" | "code" | "data" | "slides" | "video", string>
  >;
  press?: Array<{ outlet: string; url: string }>;
}): MaterialLink[] {
  const l = p.links ?? {};
  const out: MaterialLink[] = [];
  if (l.pdf) out.push({ kind: "pdf", href: l.pdf });
  if (l.ssrn) out.push({ kind: "ssrn", href: l.ssrn });
  if (l.arxiv) out.push({ kind: "arxiv", href: l.arxiv });
  if (p.doi) out.push({ kind: "doi", href: `https://doi.org/${p.doi}` });
  else if (l.publisher) out.push({ kind: "publisher", href: l.publisher });
  if (l.code) out.push({ kind: "code", href: l.code });
  if (l.data) out.push({ kind: "data", href: l.data });
  if (l.slides) out.push({ kind: "slides", href: l.slides });
  if (l.video) out.push({ kind: "video", href: l.video });
  for (const pr of p.press ?? []) out.push({ kind: "press", href: pr.url, label: pr.outlet });
  return out;
}

export function MaterialsRow({ title, items }: { title: string; items: MaterialLink[] }) {
  if (!items.length) return null;
  return (
    <ul className="bl-materials" aria-label={`Materials for ${title}`}>
      {items.map((m, i) => {
        const meta = META[m.kind];
        const external = /^https?:\/\//i.test(m.href);
        const label = m.label ?? meta.label;
        return (
          <li key={`${m.kind}-${i}`}>
            <a
              href={external ? m.href : withBasePath(m.href)}
              rel={external ? "noopener noreferrer" : undefined}
            >
              {m.kind === "press" ? `Press: ${label}` : label}
              <span className="vh">
                {" "}
                {meta.prep} {title}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
