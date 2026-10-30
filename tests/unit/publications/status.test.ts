/**
 * The four publication statuses (owner decision 2026-10-29): the migration
 * script that moved the older values over (scripts/content/migrate-status.mjs)
 * and the shared wording rules (src/lib/publications/status.ts).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLICATION_STATUS } from "@/lib/content/schema";
import { PUBLICATION_STATUS_LABELS } from "@/components/ui/labels";
import { reviewStatus, rowStatus, statusPhrase } from "@/lib/publications/status";
import {
  NEW_STATUS,
  STATUS_MAP,
  migrateStatus,
  migrateText,
  publicationFiles,
} from "../../../scripts/content/migrate-status.mjs";

const doc = (status: string, rest = "type: working-paper\n", eol = "\n") =>
  ["---", "title: T", rest.trimEnd(), status, "---", "", "Body."].join(eol) + eol;

describe("the four statuses", () => {
  it("are, in the editor's order, Work in progress, Under review, Under revision, Published", () => {
    expect(PUBLICATION_STATUS).toEqual([
      "in-progress",
      "under-review",
      "under-revision",
      "published",
    ]);
    expect(PUBLICATION_STATUS.map((s) => PUBLICATION_STATUS_LABELS[s])).toEqual([
      "Work in progress",
      "Under review",
      "Under revision",
      "Published",
    ]);
  });
  it("the migration script knows the same four", () => {
    expect(NEW_STATUS).toEqual([...PUBLICATION_STATUS]);
    for (const to of Object.values(STATUS_MAP)) expect(PUBLICATION_STATUS).toContain(to);
  });
});

describe("migrate-status.mjs", () => {
  it("maps every older value as the owner decided", () => {
    const to = (from: string) => migrateText(doc(`status: ${from}`)).to ?? from;
    expect(to("in-progress")).toBe("in-progress");
    expect(to("working-paper")).toBe("in-progress");
    expect(to("preprint")).toBe("in-progress");
    expect(to("submitted")).toBe("under-review");
    expect(to("major-revision")).toBe("under-revision");
    expect(to("revise-resubmit")).toBe("under-revision");
    expect(to("published")).toBe("published");
    expect(to("accepted")).toBe("published");
    expect(to("forthcoming")).toBe("published");
  });

  it("changes only the status value: type, quotes, comments, line endings and body stay", () => {
    const text = doc('status: "working-paper"  # PI, Oct 2026', "type: working-paper\n", "\r\n");
    const r = migrateText(text);
    expect(r).toMatchObject({ from: "working-paper", to: "in-progress" });
    expect(r.text).toBe(text.replace('"working-paper"  #', '"in-progress"  #'));
    expect(r.text).toContain("type: working-paper\r\n");
    // A body line that looks like a status is not front matter.
    const body = doc("status: published") + "status: submitted\n";
    expect(migrateText(body).text).toBe(body);
  });

  it("is idempotent, and reports a value it does not know", () => {
    const once = migrateText(doc("status: submitted")).text;
    expect(migrateText(once)).toEqual({ text: once });
    expect(migrateText(doc("status: archived"))).toMatchObject({ unknown: "archived" });
    expect(migrateText("no front matter\n")).toEqual({ text: "no front matter\n" });
  });

  it("migrates publications/*.md only, and --check writes nothing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrate-status-"));
    try {
      fs.mkdirSync(path.join(dir, "set", "publications"), { recursive: true });
      fs.mkdirSync(path.join(dir, "set", "projects"), { recursive: true });
      const pub = path.join(dir, "set", "publications", "a.md");
      const proj = path.join(dir, "set", "projects", "b.md");
      fs.writeFileSync(pub, doc("status: major-revision"));
      fs.writeFileSync(proj, doc("status: submitted"));
      expect(publicationFiles(dir)).toEqual([pub]);

      const check = migrateStatus({ dirs: [dir], check: true });
      expect(check.changed).toEqual([{ file: pub, from: "major-revision", to: "under-revision" }]);
      expect(fs.readFileSync(pub, "utf8")).toContain("status: major-revision");

      migrateStatus({ dirs: [dir] });
      expect(fs.readFileSync(pub, "utf8")).toContain("status: under-revision");
      expect(fs.readFileSync(proj, "utf8")).toContain("status: submitted");
      expect(migrateStatus({ dirs: [dir], check: true }).changed).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("content/ and the test fixtures are fully migrated", () => {
    expect(migrateStatus({ check: true })).toEqual({ changed: [], unknown: [] });
  });
});

describe("status wording (src/lib/publications/status.ts)", () => {
  it("joins a note that continues the sentence with a space, anything else with a comma", () => {
    expect(statusPhrase({ status: "under-revision", status_note: "at Operations Research" })).toBe(
      "Under revision at Operations Research",
    );
    expect(statusPhrase({ status: "under-review", status_note: "to Management Science" })).toBe(
      "Under review at Management Science",
    );
    expect(statusPhrase({ status: "in-progress", status_note: "v2" })).toBe("Work in progress, v2");
    expect(statusPhrase({ status: "under-review" })).toBe("Under review");
  });

  it("never states Published, nor a bare Work in progress that repeats the type", () => {
    expect(reviewStatus({ status: "published", type: "journal" })).toBeNull();
    expect(reviewStatus({ status: "in-progress", type: "working-paper" })).toBeNull();
    expect(reviewStatus({ status: "in-progress", type: "work-in-progress" })).toBeNull();
    expect(reviewStatus({ status: "in-progress", type: "conference" })).toBe("Work in progress");
    expect(reviewStatus({ status: "in-progress" })).toBe("Work in progress");
  });

  it("leaves a preprint's version out of list rows only", () => {
    const p = {
      status: "in-progress",
      status_note: "v2",
      type: "working-paper",
      venue: "arXiv preprint",
    } as const;
    expect(rowStatus(p)).toBeNull();
    expect(reviewStatus(p)).toBe("Work in progress, v2");
    expect(rowStatus({ ...p, venue: "SSRN working paper 1" })).toBe("Work in progress, v2");
  });
});
