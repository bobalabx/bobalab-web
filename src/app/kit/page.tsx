/**
 * Component kit (FOUNDATION): every shared primitive of the "Lines" design
 * system (DECISIONS D-13) on one page, for visual and accessibility review.
 * Rendered only when NEXT_PUBLIC_KIT=1, otherwise 404.
 *   NEXT_PUBLIC_KIT=1 npm run dev  →  http://localhost:3100/kit/
 * Sample data comes from the fictional fixture set "consent-edge-cases".
 */
import path from "node:path";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./kit.css";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { CORE_DARK, CORE_LIGHT, SWATCHES, SWATCH_IDS } from "@/lib/content/palette";
import { Wordmark, WordmarkLockup } from "@/components/brand/Wordmark";
import { PearlMark, ShoulderMark } from "@/components/brand/PearlMark";
import { Pearl } from "@/components/ui/Pearl";
import { PearlTag } from "@/components/ui/PearlTag";
import { Badge, DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { DateText } from "@/components/ui/DateText";
import { Icon, ICON_NAMES } from "@/components/ui/icons";
import { MaterialsRow } from "@/components/ui/MaterialsRow";
import { Prose } from "@/components/ui/Prose";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { NewsItem } from "@/components/ui/NewsItem";
import { PersonCard } from "@/components/ui/PersonCard";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { DirectionCard } from "@/components/ui/DirectionCard";
import { Img } from "@/components/ui/Img";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { ChipsDemo } from "./ChipsDemo";
import { initials } from "@/lib/content/people";

const KIT_ENABLED = process.env.NEXT_PUBLIC_KIT === "1";

// When the kit is off the page is a 404: never announce "Component kit" in the title
// (verify ENG-03). scripts/build.mjs also drops out/kit/ from such exports.
export const metadata: Metadata = KIT_ENABLED
  ? { title: "Component kit", robots: { index: false, follow: false } }
  : { title: "Page not found", robots: { index: false, follow: false } };

const PROSE_SAMPLE = `## A heading inside a body (h1 is demoted)

Body text runs at 17 px with a 68-character measure. Links are [always underlined](/research/) in prose,
and [external links](https://example.org) get \`rel="noopener noreferrer"\`.

- A list item with **strong** and _emphasis_
- Raw HTML is escaped: <script>alert("x")</script>

> A blockquote for a short quotation.
`;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="kit-section bl-grid">
      <h2 id={id} className="bl-grid__label kit-h2">
        {title}
      </h2>
      <div className="bl-grid__track kit-track">{children}</div>
    </section>
  );
}

export default function KitPage() {
  if (!KIT_ENABLED) notFound();

  const c = buildContent(
    loadRawContent(path.join(process.cwd(), "tests/fixtures/content/consent-edge-cases")),
    {
      preview: true,
      today: "2026-10-20",
    },
  );
  const dirs = c.directions;
  const pubCounted =
    c.publications.find((p) => p.title.includes("unlisted member")) ?? c.publications[0]!;
  const pubStatus = c.publications.find((p) => p.status !== "published") ?? c.publications[1]!;
  const pubWip = c.inProgress[0];
  const pi = c.people.find((p) => p.role === "pi")!;
  const phd = c.getPerson("blair-sample")!;
  const alum = c.getPerson("finley-alum")!;
  const draftPerson = c.getPerson("indigo-draft");

  return (
    <div className="bl-container kit">
      <header className="kit-head">
        <h1 tabIndex={-1}>Component kit</h1>
        <p className="t-lead bl-measure">
          Every shared primitive of the &ldquo;Lines&rdquo; system (D-13), rendered with fictional
          fixture data. Check it in light, dark and forced-colours modes.
        </p>
      </header>

      <Section id="kit-brand" title="Brand">
        <div className="kit-row kit-row--center">
          <Wordmark height="3.5rem" />
          <Wordmark height="1.375rem" />
          <Wordmark height="1.125rem" />
        </div>
        <div className="kit-row kit-row--center">
          <WordmarkLockup
            descriptor="Berkeley Operations and Behavioral Analytics Lab"
            height="2.5rem"
          />
          <PearlMark size={48} title="BOBALAB pearl" />
          <ShoulderMark size={48} title="BOBALAB mark: four pearls resting on a rule" />
          <ShoulderMark size={32} />
          <ShoulderMark size={16} />
        </div>
      </Section>

      <Section id="kit-colour" title="Colour">
        <h3 className="kit-h3">Core tokens (light | dark)</h3>
        <ul className="kit-swatches" role="list">
          {Object.entries(CORE_LIGHT).map(([k, v]) => (
            <li key={k}>
              <span className="kit-chip" style={{ background: `var(--${k})` }} />
              <span className="t-sm">--{k}</span>
              <span className="t-sm t-muted t-num">
                {v} | {(CORE_DARK as Record<string, string>)[k] ?? "—"}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="kit-h3">Direction tones (deep in light mode | light in dark mode)</h3>
        <ul className="kit-dirswatches" role="list">
          {SWATCH_IDS.map((id) => (
            <li key={id} data-swatch={id}>
              <span className="kit-line" aria-hidden="true" />
              <span className="t-sm" style={{ color: "var(--dir-text)" }}>
                {SWATCHES[id].name}
              </span>
              <span className="t-sm t-muted t-num">
                {SWATCHES[id].deep} | {SWATCHES[id].light}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="kit-type" title="Type">
        <p className="t-display">Condensed display, Archivo wdth 68, 700</p>
        <p className="t-year">2026</p>
        <p className="kit-h2-sample">Heading 2, Archivo 600 at 1.625rem</p>
        <h3>Heading 3 and list titles, Archivo 600 at 1.25rem</h3>
        <h4>Heading 4, Archivo 600</h4>
        <p className="t-lead">Lead text, Archivo 400 at 20 px.</p>
        <p className="bl-measure">
          Body text, Archivo 400 at 17 px with 1.6 line height. The quick brown fox studies
          operations under uncertainty.
        </p>
        <p className="t-sm t-muted">Metadata, 14 px, muted ink.</p>
        <p className="t-sm">
          Years and counts use tabular figures: <span className="t-num">2021 2023 2025 2026</span>
        </p>
        <p className="doi">10.5555/fixture.12</p>
      </Section>

      <Section id="kit-layout" title="Grid and ledger">
        <p className="bl-measure">
          This section is itself the label-column grid: an 18rem label column plus the track from
          64rem, 12.5rem from 48rem, stacked below.
        </p>
        <ol className="bl-ledger bl-ledger--closed">
          <li>A ledger opens with a 1 px ink rule; rows are separated by hairlines.</li>
          <li>2 px ink rules are reserved for figures, plates and the full publications list.</li>
          <li>Sections are separated by space, not by boxes.</li>
        </ol>
      </Section>

      <Section id="kit-pearls" title="Pearls">
        <div className="kit-row kit-row--center">
          {(["rail", "row", "card", "avatar", "hero"] as const).map((s, i) => (
            <figure key={s} className="kit-fig">
              <Pearl size={s} swatch={SWATCH_IDS[i]} />
              <figcaption className="t-sm t-muted">{s}</figcaption>
            </figure>
          ))}
          <figure className="kit-fig">
            <Pearl size="avatar" initials={initials(pi.name)} swatch="matcha" />
            <figcaption className="t-sm t-muted">initials, no photo</figcaption>
          </figure>
        </div>
      </Section>

      <Section id="kit-tags" title="Words and links">
        <ul className="bl-tags" aria-label="Direction tags">
          {SWATCH_IDS.slice(0, 6).map((id) => (
            <li key={id}>
              <PearlTag
                swatch={id}
                label={SWATCHES[id].name}
                href={id === "butterfly-pea" ? "/research/" : undefined}
              />
            </li>
          ))}
        </ul>
        <p className="kit-row t-sm">
          <Badge>Journal article</Badge>
          <Badge tone="strong">Completed</Badge>
          <OpenToRAsBadge />
          <DraftBadge />
        </p>
        <div className="kit-row">
          <EvidenceLabel level="published" />
          <EvidenceLabel level="working-paper" />
          <EvidenceLabel level="preliminary" />
        </div>
        <p className="kit-row t-sm">
          <DateText value="2026-10-20" />
          <DateText value="2026-05" />
          <DateText value="2025" />
          <DateText value="2026-09" long />
        </p>
        <div className="kit-row">
          <a className="bl-cta" href="#kit-tags">
            Research directions <Icon name="arrow-right" />
          </a>
          <a href="#kit-tags">An ordinary link</a>
        </div>
      </Section>

      <Section id="kit-icons" title="Icons (controls only)">
        <ul className="kit-icons" role="list">
          {ICON_NAMES.map((n) => (
            <li key={n}>
              <Icon name={n} />
              <span className="t-sm">{n}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="kit-materials" title="Materials and filters">
        <MaterialsRow
          title={pubCounted.title}
          items={[
            { kind: "pdf", href: "https://example.org/a.pdf" },
            { kind: "ssrn", href: "https://example.org/ssrn" },
            { kind: "arxiv", href: "https://example.org/arxiv" },
            { kind: "doi", href: "https://doi.org/10.5555/fixture" },
            { kind: "code", href: "https://example.org/code" },
            { kind: "data", href: "https://example.org/data" },
            { kind: "slides", href: "https://example.org/slides" },
            { kind: "video", href: "https://example.org/video" },
            { kind: "press", href: "https://example.org/press", label: "Fixture Times" },
          ]}
        />
        <ChipsDemo
          options={[
            { value: "journal", label: "Journal", count: 5 },
            { value: "working-paper", label: "Working paper", count: 11 },
            { value: "conference", label: "Conference/Proceedings", count: 0 },
            { value: "chapter", label: "Chapter", count: 1 },
            { value: "dissertation", label: "Dissertation", count: 1 },
            { value: "other", label: "Other", count: 2 },
          ]}
        />
        <ChipsDemo
          legend="Direction"
          options={SWATCH_IDS.slice(0, 4).map((id) => ({
            value: id,
            label: SWATCHES[id].name,
            swatch: id,
          }))}
        />
      </Section>

      <Section id="kit-prose" title="Prose (Markdoc)">
        <Prose source={PROSE_SAMPLE} />
      </Section>

      <Section id="kit-pubs" title="Publication rows">
        <div className="bl-ledger">
          <PublicationEntry pub={pubCounted} />
          <PublicationEntry pub={pubStatus} />
          {pubWip && <PublicationEntry pub={pubWip} />}
        </div>
      </Section>

      <Section id="kit-news" title="News rows">
        <div className="bl-ledger">
          {c.news.slice(0, 2).map((n) => (
            <NewsItem key={n.slug} item={n} />
          ))}
        </div>
      </Section>

      <Section id="kit-people" title="People rows">
        <div className="bl-ledger">
          <PersonCard person={pi} />
          <PersonCard
            person={phd}
            directions={phd.directions.map((s) => c.getDirection(s)!).filter(Boolean)}
          />
          <PersonCard person={alum} />
          {draftPerson && <PersonCard person={draftPerson} />}
        </div>
      </Section>

      <Section id="kit-cards" title="Project and direction rows">
        <div className="bl-ledger">
          {c.projects.slice(0, 2).map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
        <div className="bl-ledger">
          {dirs.map((d) => (
            <DirectionCard key={d.slug} direction={d} />
          ))}
        </div>
      </Section>

      <Section id="kit-media" title="Image and hidden text">
        <div className="kit-row kit-row--center">
          <Img
            src="/brand/fixtures/portrait.webp"
            alt="Abstract placeholder portrait (fixture)"
            width={128}
            height={128}
          />
          <p className="t-sm">
            There is hidden text after this sentence.
            <VisuallyHidden> This sentence is for screen readers only.</VisuallyHidden>
          </p>
        </div>
      </Section>
    </div>
  );
}
