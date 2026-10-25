/** Evidence label for findings: Published / Working paper / Preliminary (§D3, §D5). Plain words, no glyph (RC-8). */
import type { EvidenceLevel } from "@/lib/content/schema";

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  published: "Published",
  "working-paper": "Working paper",
  preliminary: "Preliminary",
};

export function EvidenceLabel({ level }: { level: EvidenceLevel }) {
  return (
    <span className={`bl-evidence bl-evidence--${level}`}>
      <span>
        <span className="vh">Evidence: </span>
        {EVIDENCE_LABELS[level]}
      </span>
    </span>
  );
}
