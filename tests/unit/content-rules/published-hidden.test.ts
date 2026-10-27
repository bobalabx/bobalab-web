/**
 * D-05 amendment (editor v2, spec §2.12.6a): content/.published-slugs.json
 * lists every slug that had a page on the live site.
 *   - The entry is GONE and no redirect covers its address → E_REDIRECT_MISSING
 *     (unchanged; editors cannot delete or rename, so only maintainers hit it).
 *   - The entry still EXISTS but has no live page (Draft on, Listed off, no
 *     profile page) → W_PUBLISHED_HIDDEN, a warning on the entry's own file: hiding
 *     is the lab's privacy action and the entry can come back, so no redirect is
 *     needed and the deploy must not fail.
 */
import { describe, expect, it } from "vitest";
import { Files, codes } from "../../content/helpers";

const slugs = (f: Files, list: Record<string, string[]>) =>
  f.set(".published-slugs.json", JSON.stringify(list));
const of = (f: Files, code: string) => f.validate().filter((i) => i.code === code);

describe("W_PUBLISHED_HIDDEN versus E_REDIRECT_MISSING", () => {
  it("every published entry still live: neither", () => {
    const f = slugs(Files.of("n4"), { directions: ["advice"], people: ["avery-example"] });
    const c = codes(f.validate());
    expect(c).not.toContain("W_PUBLISHED_HIDDEN");
    expect(c).not.toContain("E_REDIRECT_MISSING");
  });

  it("Draft on a published direction: a warning on the entry, no redirect needed", () => {
    const f = slugs(Files.of("n4"), { directions: ["advice"] }).edit(
      "directions/advice.md",
      (d) => void (d.draft = true),
    );
    expect(of(f, "W_PUBLISHED_HIDDEN")).toEqual([
      {
        severity: "warning",
        code: "W_PUBLISHED_HIDDEN",
        file: "directions/advice.md",
        field: "draft",
        message:
          "/research/advice/ was on the live site and is now hidden; visitors get “Page not found” there.",
      },
    ]);
    expect(of(f, "E_REDIRECT_MISSING")).toEqual([]);
  });

  it("Listed off, or no profile page, on a published person: the warning names that switch", () => {
    const f = slugs(Files.of("n4"), { people: ["avery-example"] }).edit(
      "people/avery-example.md",
      (d) => void (d.listed = false),
    );
    expect(of(f, "W_PUBLISHED_HIDDEN").map((i) => [i.file, i.field])).toEqual([
      ["people/avery-example.md", "listed"],
    ]);
    const g = slugs(Files.of("n4"), { people: ["casey-example"] }).copy(
      "people/avery-example.md",
      "people/casey-example.md",
      (d) => {
        d.name = "Casey Example";
        d.role = "phd";
        delete d.title;
        d.profile_page = false;
      },
    );
    expect(of(g, "W_PUBLISHED_HIDDEN").map((i) => [i.file, i.field])).toEqual([
      ["people/casey-example.md", "profile_page"],
    ]);
    expect(of(g, "E_REDIRECT_MISSING")).toEqual([]);
  });

  it("the entry is gone: E_REDIRECT_MISSING, as before", () => {
    const f = slugs(Files.of("n4"), { directions: ["advice", "retired-direction"] });
    expect(of(f, "E_REDIRECT_MISSING").map((i) => [i.file, i.field])).toEqual([
      ["site.yml", "redirects"],
    ]);
    expect(of(f, "W_PUBLISHED_HIDDEN")).toEqual([]);
  });

  it("a redirect from the address silences both", () => {
    const f = slugs(Files.of("n4"), { directions: ["advice", "retired-direction"] })
      .edit("directions/advice.md", (d) => void (d.draft = true))
      .edit(
        "site.yml",
        (d) =>
          void (d.redirects = [
            { from: "/research/advice/", to: "/research/" },
            { from: "/research/retired-direction/", to: "/research/" },
          ]),
      );
    const c = codes(f.validate());
    expect(c).not.toContain("W_PUBLISHED_HIDDEN");
    expect(c).not.toContain("E_REDIRECT_MISSING");
  });

  it("no .published-slugs.json (today's main): neither, whatever is hidden", () => {
    const f = Files.of("n4").edit("directions/advice.md", (d) => void (d.draft = true));
    const c = codes(f.validate());
    expect(c).not.toContain("W_PUBLISHED_HIDDEN");
    expect(c).not.toContain("E_REDIRECT_MISSING");
  });

  it("hiding is never an error: the deploy's validate step still passes", () => {
    const f = slugs(Files.of("n4"), {
      directions: ["advice"],
      people: ["avery-example"],
      projects: ["advice-project"],
    })
      .edit("directions/advice.md", (d) => void (d.draft = true))
      .edit("people/avery-example.md", (d) => void (d.listed = false))
      .edit("projects/advice-project.md", (d) => void (d.draft = true));
    const errs = f.validate().filter((i) => i.severity === "error" && /REDIRECT/.test(i.code));
    expect(errs).toEqual([]);
    expect(of(f, "W_PUBLISHED_HIDDEN")).toHaveLength(3);
  });
});
