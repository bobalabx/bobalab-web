import { describe, expect, it } from "vitest";
import {
  formatDate,
  periodEndedBefore,
  toDateTimeAttr,
  todayInLab,
  isOnOrAfter,
} from "@/lib/content/dates";
import {
  comparePeople,
  groupPeople,
  initials,
  isAlumni,
  toPublicPerson,
} from "@/lib/content/people";
import type { PersonEntry } from "@/lib/content/schema";

describe("dates", () => {
  it("formats full, month and year precision without locale/TZ dependence", () => {
    expect(formatDate("2026-10-20")).toBe("Oct 20, 2026");
    expect(formatDate("2026-10-02T23:30:00Z")).toBe("Oct 2, 2026");
    expect(formatDate("2026-05")).toBe("May 2026");
    expect(formatDate(2026)).toBe("2026");
    expect(formatDate("2026-09", { long: true })).toBe("September 2026");
    expect(formatDate(undefined)).toBe("");
    expect(toDateTimeAttr("2026-5" as string)).toBe("2026");
    expect(toDateTimeAttr("2026-05-01")).toBe("2026-05-01");
  });

  it("todayInLab uses America/Los_Angeles (UTC evening is still 'yesterday' in Berkeley)", () => {
    expect(todayInLab(new Date("2026-10-21T03:00:00Z"))).toBe("2026-10-20");
    expect(todayInLab(new Date("2026-10-21T08:00:00Z"))).toBe("2026-10-21");
  });

  it("a period is current through the end of its last unit", () => {
    expect(periodEndedBefore("2025", "2025-12-31")).toBe(false);
    expect(periodEndedBefore("2025", "2026-01-01")).toBe(true);
    expect(periodEndedBefore("2026-06", "2026-06-30")).toBe(false);
    expect(periodEndedBefore("2026-06", "2026-07-01")).toBe(true);
    expect(periodEndedBefore("2026-06-15", "2026-06-16")).toBe(true);
  });

  it("isOnOrAfter compares date parts", () => {
    expect(isOnOrAfter("2026-10-20T09:00", "2026-10-20")).toBe(true);
    expect(isOnOrAfter("2026-10-19", "2026-10-20")).toBe(false);
  });
});

const person = (p: Partial<PersonEntry>): PersonEntry => ({
  slug: "x-y",
  file: "people/x-y.md",
  name: "Xan Yu",
  role: "phd",
  interests: [],
  directions: [],
  photo_consent: false,
  links: {},
  email_public: false,
  now_at_public: false,
  listed: true,
  profile_page: false,
  draft: false,
  body: "",
  ...p,
});

describe("people", () => {
  it("derives alumni from end (lab time zone), never for the PI", () => {
    expect(isAlumni(person({ end: "2024" }), "2026-10-20")).toBe(true);
    expect(isAlumni(person({ end: "2026" }), "2026-10-20")).toBe(false);
    expect(isAlumni(person({ end: "2026-09" }), "2026-10-20")).toBe(true);
    expect(isAlumni(person({}), "2026-10-20")).toBe(false);
    expect(isAlumni(person({ role: "pi", end: "2020" }), "2026-10-20")).toBe(false);
  });

  it("removes photo, email and now_at unless their consent flags are true", () => {
    const hidden = toPublicPerson(
      person({
        photo: "/p.webp",
        photo_alt: "x",
        email: "a@b.edu",
        now_at: "Somewhere",
        end: "2024",
      }),
      "2026-10-20",
    );
    expect(hidden.photo).toBeUndefined();
    expect(hidden.email).toBeUndefined();
    expect(hidden.now_at).toBeUndefined();
    expect(hidden.isAlumni).toBe(true);
    const shown = toPublicPerson(
      person({
        photo: "/p.webp",
        photo_alt: "x",
        photo_consent: true,
        email: "a@b.edu",
        email_public: true,
        now_at: "S",
        now_at_public: true,
      }),
    );
    expect([shown.photo, shown.email, shown.now_at]).toEqual(["/p.webp", "a@b.edu", "S"]);
  });

  it("PI always has a profile page; others only with profile_page", () => {
    expect(toPublicPerson(person({ role: "pi" })).hasProfile).toBe(true);
    expect(toPublicPerson(person({})).hasProfile).toBe(false);
    expect(toPublicPerson(person({ profile_page: true })).hasProfile).toBe(true);
  });

  it("sorts role → rank → last name and groups alumni by end year (desc)", () => {
    const today = "2026-10-20";
    const ps = [
      person({ slug: "b", name: "Ann Zed", role: "undergrad" }),
      person({ slug: "a", name: "Bo Alpha", role: "undergrad" }),
      person({ slug: "c", name: "Cy Rank", role: "undergrad", rank: 1 }),
      person({ slug: "d", name: "Di Prof", role: "pi" }),
      person({ slug: "e", name: "Ed Old", role: "masters", end: "2023" }),
      person({ slug: "f", name: "Fi Older", role: "phd", end: "2025" }),
      person({ slug: "g", name: "Gu Hidden", role: "phd", listed: false }),
    ].map((p) => toPublicPerson(p, today));
    expect([...ps].sort(comparePeople).map((p) => p.slug)).toEqual([
      "d",
      "g",
      "f",
      "e",
      "c",
      "a",
      "b",
    ]);
    const g = groupPeople(ps);
    expect(g.current.map((x) => [x.role, x.people.map((p) => p.slug)])).toEqual([
      ["pi", ["d"]],
      ["undergrad", ["c", "a", "b"]],
    ]);
    expect(g.alumni.map((x) => [x.year, x.people.map((p) => p.slug)])).toEqual([
      [2025, ["f"]],
      [2023, ["e"]],
    ]);
  });

  it("initials ignore quoted nicknames", () => {
    expect(initials('Wichinpong "Park" Sinchaisri')).toBe("WS");
    expect(initials("Avery Example")).toBe("AE");
    expect(initials("Cher")).toBe("C");
  });
});
