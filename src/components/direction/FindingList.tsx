/**
 * "What we've found" (§D5.3): lab-written finding sentences as a ruled list,
 * each with its evidence label and, when the paper is in this build, a link to it.
 */
import Link from "next/link";
import type { FindingView } from "@/lib/content/queries";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";

export function FindingList({ findings }: { findings: FindingView[] }) {
  if (!findings.length) return null;
  return (
    <ul className="dr-findings" role="list">
      {findings.map((f, i) => (
        <li key={i} className="dr-finding">
          <p className="dr-finding__text">{f.text}</p>
          <p className="dr-finding__meta">
            <EvidenceLabel level={f.evidence} />
            {f.publication && (
              <>
                {". "}
                <Link href={`/publications/${f.publication.slug}/`}>
                  {f.publication.title}
                  {f.publication.year ? ` (${f.publication.year})` : ""}
                </Link>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
