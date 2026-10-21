/** CON-15: /about/ meta description names only what the page renders. */
import { describe, expect, it } from "vitest";
import { aboutDescription } from "@/components/pages/aboutDescription";
import type { PagesData, SiteData } from "@/lib/content/schema";

const site = {
  name: "LAB",
  long_name: "Example Lab",
  affiliation_text: "Example School",
  email: "lab@example.edu",
  address: "1 Example Way",
} as unknown as SiteData;

describe("aboutDescription", () => {
  it("uses the published About intro when there is one", () => {
    const pages = {
      about: { title: "About", intro: "The lab's own intro.", draft: false },
    } as unknown as PagesData;
    expect(aboutDescription({ site, pages, hasPi: true })).toBe("The lab's own intro.");
  });

  it("does not mention a mission when no mission renders (production with drafts excluded)", () => {
    const d = aboutDescription({ site, pages: {}, hasPi: true });
    expect(d).toBe("LAB (Example Lab), Example School: principal investigator and contact.");
    expect(d).not.toMatch(/mission/i);
  });

  it("mentions the mission when the home mission is published", () => {
    const pages = { home: { mission: "We study things.", draft: false } } as unknown as PagesData;
    expect(aboutDescription({ site, pages, hasPi: true })).toContain(
      ": mission, principal investigator and contact.",
    );
  });

  it("drops the long name instead of clipping the list when it would exceed 160 characters", () => {
    const long = { ...site, long_name: "X".repeat(120) } as SiteData;
    const pages = { home: { mission: "We study things." } } as unknown as PagesData;
    expect(aboutDescription({ site: long, pages, hasPi: true })).toBe(
      "LAB, Example School: mission, principal investigator and contact.",
    );
  });

  it("omits the PI when no PI record is visible", () => {
    const d = aboutDescription({
      site,
      pages: { home: { mission: "  " } } as unknown as PagesData,
      hasPi: false,
    });
    expect(d).toBe("LAB (Example Lab), Example School: contact.");
  });
});
