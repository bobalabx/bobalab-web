/**
 * Author-name splitting for citations (CSL `given` / `family`).
 *
 * Content stores author names as published ("Wichinpong Park Sinchaisri",
 * "Maxime C. Cohen", "Yanchong (Karen) Zheng"). Citation styles need the
 * family name separately. Rule: "Family, Given" when a comma is present;
 * otherwise the last word is the family name, together with any lower-case
 * particles in front of it ("van der", "de", …) and without a trailing
 * suffix ("Jr.", "III"). A parenthesised nickname ("Yanchong (Karen) Zheng")
 * is display-only and is left out of the citation form ("Zheng, Y."), as
 * reference styles do. Pure; safe for client and server.
 */

export interface CslName {
  family: string;
  given?: string;
  "non-dropping-particle"?: string;
  suffix?: string;
}

const PARTICLES = new Set([
  "al",
  "bin",
  "da",
  "das",
  "de",
  "del",
  "della",
  "der",
  "di",
  "do",
  "dos",
  "du",
  "la",
  "le",
  "ten",
  "ter",
  "van",
  "von",
]);
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;

export function splitName(full: string): CslName {
  const spaced = full.replace(/\s+/g, " ").trim();
  // Drop "(Karen)"-style nicknames unless that would leave nothing.
  const name =
    spaced
      .replace(/\s*\([^()]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim() || spaced;
  if (!name) return { family: "" };

  // "Family, Given" or "Family, Suffix, Given"
  if (name.includes(",")) {
    const parts = name.split(",").map((s) => s.trim());
    const family = parts[0] ?? "";
    if (parts.length >= 3 && SUFFIX.test(parts[1] ?? "")) {
      return { family, suffix: parts[1], given: parts.slice(2).join(", ") || undefined };
    }
    return { family, given: parts.slice(1).join(", ") || undefined };
  }

  const tokens = name.split(" ");
  let suffix: string | undefined;
  if (tokens.length > 2 && SUFFIX.test(tokens[tokens.length - 1]!)) suffix = tokens.pop();
  if (tokens.length === 1) return { family: tokens[0]!, ...(suffix ? { suffix } : {}) };

  const family = tokens.pop()!;
  const particles: string[] = [];
  while (tokens.length > 1 && PARTICLES.has(tokens[tokens.length - 1]!)) {
    particles.unshift(tokens.pop()!);
  }
  const out: CslName = { family, given: tokens.join(" ") };
  if (particles.length) out["non-dropping-particle"] = particles.join(" ");
  if (suffix) out.suffix = suffix;
  return out;
}

/** The family name alone, ASCII-folded and lower-cased letters only (citation keys). */
export function asciiKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
