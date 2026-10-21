/** WP2 direction helpers (src/components/direction/model.ts) over the fixture sets. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { CORE_DARK, SWATCHES, SWATCH_IDS, blend, hexToRgb } from "@/lib/content/palette";
import { TRANSITION } from "@/lib/vt";
import {
  bandColors,
  bandMinContrast,
  directionStatusLine,
  directionStatusParts,
  directionUpdatedDate,
  plural,
  publicationsHref,
  railTransition,
  workWithUs,
} from "@/components/direction/model";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: "2026-10-20" });

const counts = (projects: number, papers: number, inProgress = 0) => ({
  projects,
  papers,
  inProgress,
});

describe("status line (§D5.1, computed)", () => {
  it("leads with 'Active since' only when the lab set active_since", () => {
    expect(
      directionStatusLine({ status: "active", active_since: 2021, counts: counts(3, 5) }),
    ).toBe("Active since 2021 · 3 projects · 5 papers");
    expect(directionStatusLine({ status: "active", counts: counts(1, 1) })).toBe(
      "1 project · 1 paper",
    );
  });
  it("says Emerging for emerging directions and counts work in progress separately (D-05)", () => {
    expect(
      directionStatusParts({ status: "emerging", active_since: 2025, counts: counts(0, 0, 2) }),
    ).toEqual(["Emerging since 2025", "0 projects", "0 papers", "2 in progress"]);
    expect(directionStatusParts({ status: "emerging", counts: counts(2, 0) })[0]).toBe("Emerging");
  });
  it("archived directions show counts only (the dated note carries the status)", () => {
    expect(
      directionStatusLine({ status: "archived", active_since: 2016, counts: counts(2, 3) }),
    ).toBe("2 projects · 3 papers");
  });
  it("matches the loader's derived counts on a fixture", () => {
    const c = load("n4");
    for (const d of c.directions) {
      const line = directionStatusLine(d);
      expect(line).toContain(plural(d.counts.projects, "project"));
      expect(line).toContain(plural(d.counts.papers, "paper"));
      const tagged = c.countedPublications.filter((p) => p.directions.includes(d.slug));
      expect(d.counts.papers).toBe(tagged.length);
    }
  });
});

describe("'See all in Publications' keeps the direction filter (WP2 #5)", () => {
  it("builds /publications/?direction={slug} with a trailing-slash path", () => {
    expect(publicationsHref("ai-at-work")).toBe("/publications/?direction=ai-at-work");
    expect(publicationsHref("a b")).toBe("/publications/?direction=a%20b");
  });
});

describe("rail transition types (§E5)", () => {
  it("higher index → nav-forward, lower → nav-back, archived → forward", () => {
    expect(railTransition({ index: 2 }, { index: 3 })).toBe(TRANSITION.navForward);
    expect(railTransition({ index: 3 }, { index: 1 })).toBe(TRANSITION.navBack);
    expect(railTransition({ index: null }, { index: 1 })).toBe(TRANSITION.navForward);
  });
});

describe("header band colours (WP2 #3: swatch tokens, computed dark band)", () => {
  const tokens = fs.readFileSync(path.join(ROOT, "src/styles/tokens.css"), "utf8");
  for (const id of SWATCH_IDS) {
    it(`${id}: dark band = light tone at 10% over night, and tokens.css agrees`, () => {
      const b = bandColors(id);
      expect(b.light.band).toBe(SWATCHES[id].tint);
      expect(b.dark.band).toBe(blend(SWATCHES[id].light, CORE_DARK.paper, 0.1));
      // The brief's table (and tokens.css) rounds half-down in places: allow ±1 per channel.
      const a = hexToRgb(b.dark.band);
      const t = hexToRgb(SWATCHES[id].bandDark);
      expect(Math.max(...a.map((v, i) => Math.abs(v - t[i]!)))).toBeLessThanOrEqual(1);
      const block = new RegExp(
        `\\[data-swatch="${id}"\\]\\s*\\{[^}]*--dir-band-d:\\s*(#[0-9a-f]{6})`,
        "i",
      );
      expect(block.exec(tokens)?.[1]?.toUpperCase()).toBe(SWATCHES[id].bandDark.toUpperCase());
    });
    it(`${id}: every text colour on the band passes 4.5:1 in both modes`, () => {
      expect(bandMinContrast(id)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("Work with us (§D5.9)", () => {
  it("shows for open_to_collaborators, or for an open opportunity tagged with the direction", () => {
    const c = load("n4");
    for (const d of c.directions) {
      const w = workWithUs(c, d);
      const opps = c.opportunities.filter((o) => o.isOpen && o.directions.includes(d.slug));
      expect(w.show).toBe(d.open_to_collaborators || opps.length > 0);
      expect(w.opportunities.map((o) => o.slug)).toEqual(opps.map((o) => o.slug));
    }
  });
  it("is hidden when neither holds", () => {
    const w = workWithUs({ opportunities: [] } as never, {
      slug: "x",
      open_to_collaborators: false,
    });
    expect(w.show).toBe(false);
  });
});

describe("direction 'last updated' line (§D5.11; verify VIS-12)", () => {
  it("is hidden when it repeats the footer's site-wide date", () => {
    expect(directionUpdatedDate("2026-10-20", "2026-10-20")).toBeNull();
    expect(directionUpdatedDate("", "2026-10-20")).toBeNull();
  });
  it("is shown when the direction's content last changed on another day", () => {
    expect(directionUpdatedDate("2026-09-30", "2026-10-20")).toBe("2026-09-30");
  });
});
