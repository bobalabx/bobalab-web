/**
 * public/admin/cms-save.js (editor v2, WP5; spec §3.2–§3.9): one-click Save with
 * a latch, the checks before the commit (uploads, hidden names, the conflict
 * guard, the site check), the "Not saved" band, the note next to Save, the
 * window.confirm wrapper and the hand-over to the status dock. Runs the real
 * cms-data/hooks/locale/ui/guards/save scripts in a sandbox against a fake Decap
 * (save-helpers.ts), with fakes for GitHub, History, the live column and the dock.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeName } from "../../../scripts/import/hidden-names.mjs";
import { SHA, T0, bootSave, version, type FakeElement, type SaveBoot } from "./save-helpers";

const PATH = "content/news/2026-10-07-informs-talk.md";
const OPENED = SHA("b"); // the version the form was opened at

function changed(o: SaveBoot = {}) {
  const b = bootSave({
    latest: () => version({ sha: OPENED, at: -3600 }),
    ...o,
    entry: { hasChanged: true, ...(o.entry ?? {}) },
  });
  return b;
}

/** Click Save and let the one-click pick, the checks and the commit run. */
async function clickSave(b: ReturnType<typeof bootSave>, ms = 7000) {
  b.click(b.btn());
  await b.run(ms);
}

describe("one-click Save and the latch (spec §3.2)", () => {
  it("one click saves: Decap's menu is opened and 'Save now' picked for the editor", async () => {
    const b = changed();
    await b.run(100);
    b.click(b.btn());
    expect(b.document.documentElement!.classList.contains("bl-one-click")).toBe(true);
    expect(b.save.isSaving()).toBe(true);
    await b.run(7000);
    expect(b.log.attempts).toBe(1);
    expect(b.log.persisted).toBe(1);
    expect(b.document.documentElement!.classList.contains("bl-one-click")).toBe(false);
    expect(b.save.isSaving()).toBe(false);
  });

  it("a double click starts one save (the second click is swallowed: 'Already saving')", async () => {
    const b = changed();
    await b.run(100);
    const btn = b.btn()!;
    b.click(btn);
    const second = b.click(b.btn() ?? btn);
    expect(second.propagationStopped).toBe(true);
    await b.run(7000);
    expect(b.log.attempts).toBe(1);
    expect(b.log.persisted).toBe(1);
    expect(b.log.announced).toContain("Already saving");
  });

  it("a click while Decap already shows 'Saving…' is swallowed too", async () => {
    const b = changed({ latest: () => "hang" }); // the conflict check waits up to 5 s
    await b.run(100);
    b.click(b.btn());
    await b.run(300);
    expect(b.btn()!.textContent).toBe("Saving…");
    expect(b.click(b.btn()).propagationStopped).toBe(true);
    await b.run(8000);
    expect(b.log.attempts).toBe(1);
  });

  it("click plus Ctrl+S starts one save", async () => {
    const b = changed();
    await b.run(100);
    b.click(b.btn());
    const k = b.key(b.document.body, "s", { ctrlKey: true });
    expect(k.defaultPrevented).toBe(true);
    await b.run(7000);
    expect(b.log.attempts).toBe(1);
    expect(b.log.announced).toContain("Already saving");
  });

  it("Enter twice on Save starts one save (the second Enter on Save again)", async () => {
    const b = changed({ latest: () => "hang" }); // a slow save: the second Enter comes while it runs
    await b.run(100);
    b.key(b.btn()!, "Enter");
    await b.run(50); // "Save now" picked; the focus is back on Save
    expect(b.document.activeElement).toBe(b.btn());
    const second = b.key(b.btn()!, "Enter");
    expect(second.propagationStopped).toBe(true);
    await b.run(9000);
    expect(b.log.attempts).toBe(1);
    expect(b.log.persisted).toBe(1);
  });

  it("Enter twice, the second one inside Decap's menu before it is picked: one save", async () => {
    const b = changed();
    await b.run(100);
    b.key(b.btn()!, "Enter");
    // Decap moved the focus into its menu ("Save now")
    expect(b.document.activeElement!.getAttribute("role")).toBe("menuitem");
    b.key(b.document.activeElement!, "Enter");
    await b.run(7000);
    expect(b.log.attempts).toBe(1);
    expect(b.log.persisted).toBe(1);
  });

  it("Space works like a click", async () => {
    const b = changed();
    await b.run(100);
    b.key(b.btn()!, " ");
    await b.run(7000);
    expect(b.log.persisted).toBe(1);
  });

  it("our own pick of 'Save now' is not swallowed by the latch", async () => {
    const b = changed();
    await b.run(100);
    b.click(b.btn());
    await b.run(20); // one animation frame: the menu item is clicked
    expect(b.log.attempts).toBe(1);
  });

  it("the latch clears when the save fails (the commit is refused), so Save works again", async () => {
    const b = changed({ commitError: "422 Update is not a fast forward" });
    await clickSave(b);
    expect(b.log.attempts).toBe(1);
    expect(b.save.isSaving()).toBe(false);
    expect(b.band()!.hidden).toBe(false);
    expect(b.band()!.textContent).toContain(
      "Not saved: someone else saved at the same moment. Nothing was lost — press Save again.",
    );
    b.state.commitError = null;
    await clickSave(b);
    expect(b.log.attempts).toBe(2);
    expect(b.log.persisted).toBe(1);
  });

  it("the latch clears when Decap's required-field check stops the save before it starts", async () => {
    const b = changed({ requiredMissing: true });
    await clickSave(b, 3000);
    expect(b.save.isSaving()).toBe(false);
    expect(b.band()!.textContent).toContain(
      "Not saved: a required field is empty. It is marked in red.",
    );
    b.state.requiredMissing = false;
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
  });

  it("…and after 60 s at the latest, if a save never ends", async () => {
    const b = changed();
    await b.run(100);
    (b.win.CMS as { registerEventListener: (l: unknown) => void }).registerEventListener({
      name: "preSave",
      handler: () => new Promise(() => {}), // a stuck save: "Saving…" forever
    });
    b.click(b.btn());
    await b.run(30_000);
    expect(b.save.isSaving()).toBe(true);
    await b.run(31_000);
    expect(b.save.isSaving()).toBe(false);
  });

  it("falls back to Decap's own menu when 'Save now' does not appear: two clicks, never a dead button", async () => {
    const b = changed();
    await b.run(100);
    b.state.menuItems = false;
    b.click(b.btn());
    await b.run(700);
    expect(b.document.documentElement!.classList.contains("bl-one-click")).toBe(false);
    expect(b.save.isSaving()).toBe(false);
    expect(b.dd()!.querySelector('[role="menu"]')).not.toBeNull(); // Decap's menu shows
    // The editor picks "Save now" by hand: latched, and saved once.
    b.state.menuItems = true;
    b.state.open = false;
    b.click(b.btn()); // opens it (and our pick runs again)
    await b.run(7000);
    expect(b.log.persisted).toBe(1);
  });

  it("Save's button loses aria-haspopup/aria-expanded and gains its description", async () => {
    const b = changed();
    await b.run(100);
    const btn = b.btn()!;
    expect(btn.hasAttribute("aria-haspopup")).toBe(false);
    expect(btn.hasAttribute("aria-expanded")).toBe(false);
    expect(btn.getAttribute("aria-describedby")).toBe("bl-save-desc");
    expect(b.document.getElementById("bl-save-desc")!.textContent).toBe(
      "Saves and updates the live site in about 2 minutes",
    );
  });
});

describe("saveNow() and Ctrl/Cmd+S", () => {
  it("started / busy / nothing-to-save / unavailable", async () => {
    const b = changed();
    await b.run(100);
    const p = b.save.saveNow();
    await b.run(50);
    expect(await p).toBe("started");
    expect(await b.save.saveNow()).toBe("busy");
    await b.run(7000);
    expect(b.log.persisted).toBe(1);
    // unchanged now: no Save button appears within 1 s
    const q = b.save.saveNow();
    await b.run(1200);
    expect(await q).toBe("nothing-to-save");
    b.env.go("#/collections/news");
    expect(await b.save.saveNow()).toBe("unavailable");
  });

  it("Ctrl/Cmd+S always stops the browser's save on editor routes; an unchanged entry says so", async () => {
    const b = bootSave({ latest: () => version({ sha: OPENED }) });
    await b.run(100);
    const k = b.key(b.form, "s", { metaKey: true });
    expect(k.defaultPrevented).toBe(true);
    expect(b.log.announced).toContain("No changes to save");
    expect(b.log.attempts).toBe(0);
    b.env.go("#/collections/news");
    expect(b.key(b.form, "s", { ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it("Ctrl+S on a changed entry saves once, from anywhere in the form", async () => {
    const b = changed();
    await b.run(100);
    b.key(b.form, "s", { ctrlKey: true });
    await b.run(7000);
    expect(b.log.persisted).toBe(1);
  });
});

describe("window.confirm: same-name uploads and the local backup (spec §3.7, §3.10)", () => {
  it("refuses Decap's 'replace it?' for a same-name upload and says to rename the file", async () => {
    const b = bootSave();
    const answer = (b.win.confirm as (m: string) => boolean)(
      "isabelle-cho.jpg already exists. Do you want to replace it?",
    );
    expect(answer).toBe(false);
    expect(b.log.confirms).toEqual([]); // the browser's dialog never opened
    expect(b.document.querySelector("#bl-toasts")!.textContent).toContain(
      "A file with this name is already on the site. Rename your file (for example isabelle-cho-2026.jpg) and upload it again.",
    );
    // Marked, so admin.css can show it above Decap's open media library.
    expect(b.document.querySelector("#bl-toasts [data-bl-rename]")).not.toBeNull();
  });

  it("passes other questions through unchanged", () => {
    const b = bootSave({ confirmAnswer: false });
    expect((b.win.confirm as (m: string) => boolean)("Leave?")).toBe(false);
    expect(b.log.confirms).toEqual(["Leave?"]);
  });

  const BACKUP =
    "This entry has unsaved changes from your last visit, kept only in this browser. OK brings them back (they are still not saved until you press Save). Cancel throws them away.";

  it("an accepted backup takes its baseline from bobalab.draftBase.v1", async () => {
    const old = SHA("c");
    const b = bootSave({
      entry: null,
      hash: "#/collections/news/entries/2026-10-07-informs-talk",
      storage: {
        "bobalab.draftBase.v1": JSON.stringify({ [PATH]: { sha: old, at: T0 - 86400e3 } }),
      },
      latest: () => version({ sha: OPENED }),
      confirmAnswer: true,
    });
    expect((b.win.confirm as (m: string) => boolean)(BACKUP)).toBe(true);
    b.setEntry({
      collection: "news",
      slug: "2026-10-07-informs-talk",
      newRecord: false,
      path: PATH,
      data: { title: "x" },
      hasChanged: true,
      fields: [],
    });
    await b.run(100);
    expect(b.save.baseline(PATH)).toBe(old);
    expect(b.log.latest).toEqual([]); // not replaced by the newest version
  });

  it("an accepted backup from before this release has an unknown baseline", async () => {
    const b = bootSave({ entry: { hasChanged: false }, latest: () => version({ sha: OPENED }) });
    await b.run(100);
    (b.win.confirm as (m: string) => boolean)(BACKUP);
    expect(b.save.baseline(PATH)).toBe("unknown");
  });

  it("a cancelled backup forgets its baseline", async () => {
    const b = bootSave({
      confirmAnswer: false,
      storage: { "bobalab.draftBase.v1": JSON.stringify({ [PATH]: { sha: SHA("c"), at: 1 } }) },
      latest: () => version({ sha: OPENED }),
    });
    (b.win.confirm as (m: string) => boolean)(BACKUP);
    expect(b.env.local.getItem("bobalab.draftBase.v1")).toBeNull();
  });
});

describe("baselines (spec §3.7)", () => {
  it("opening an entry reads its newest version; the first change stores it in bobalab.draftBase.v1", async () => {
    const b = bootSave({ latest: () => version({ sha: OPENED }) });
    await b.run(100);
    expect(b.log.latest).toEqual([PATH]);
    expect(b.save.baseline(PATH)).toBe(OPENED);
    expect(b.env.local.getItem("bobalab.draftBase.v1")).toBeNull();
    b.setEntry({ hasChanged: true, data: { title: "INFORMS talk!" } });
    const stored = JSON.parse(b.env.local.getItem("bobalab.draftBase.v1")!);
    expect(stored[PATH].sha).toBe(OPENED);
  });

  it("a first change before the baseline has loaded is stored when it lands", async () => {
    let answer: (v: unknown) => void = () => {};
    const b = bootSave({
      latest: () => "hang",
      extra: {},
    });
    // replace latest with a controllable promise
    (b.win.BobalabHistory as { latest: () => Promise<unknown> }).latest = () =>
      new Promise((r) => (answer = r));
    b.setEntry({ path: null, slug: null }); // leave…
    b.setEntry({ path: PATH, slug: "2026-10-07-informs-talk" }); // …and open again
    b.setEntry({ hasChanged: true });
    await b.run(1); // the request is on its way
    expect(b.env.local.getItem("bobalab.draftBase.v1")).toBeNull();
    answer(version({ sha: OPENED }));
    await b.run(10);
    expect(JSON.parse(b.env.local.getItem("bobalab.draftBase.v1")!)[PATH].sha).toBe(OPENED);
  });

  it("after this tab's own save: draftBase cleared, the dock's commit becomes the baseline and an own SHA", async () => {
    const b = changed();
    await b.run(100);
    b.setEntry({ data: { title: "INFORMS talk 2" } });
    expect(b.env.local.getItem("bobalab.draftBase.v1")).not.toBeNull();
    await clickSave(b);
    expect(b.env.local.getItem("bobalab.draftBase.v1")).toBeNull();
    expect(b.log.docked).toHaveLength(1);
    b.save.setBaseline(PATH, SHA("d")); // what cms-dock.js does once it finds the commit
    expect(b.save.baseline(PATH)).toBe(SHA("d"));
    expect([...b.save.ownShas()]).toEqual([SHA("d")]);
    // "Bring in their changes" moves the baseline without making it an own save
    b.save.setBaseline(PATH, SHA("e"));
    expect([...b.save.ownShas()]).toEqual([SHA("d")]);
  });
});

describe("the conflict guard: decision table (spec §3.7)", () => {
  const b = bootSave();
  const D = b.save._conflictDecision;
  const me = "ada-editor";
  const opened = T0;
  const base = { baseline: OPENED, ownShas: [], pendingOwn: null, me, openedAt: opened };

  it("latest equals the baseline → allow", () => {
    expect(D({ ...base, latest: version({ sha: OPENED }) })).toEqual({ ok: true });
  });
  it("latest is one of this tab's own saves → allow", () => {
    expect(D({ ...base, ownShas: [SHA("d")], latest: version({ sha: SHA("d") }) }).ok).toBe(true);
  });
  it("my own commit that the dock has not found yet (slow commits API) → allow, adopt it", () => {
    const v = version({ sha: SHA("d"), login: me, at: 5 });
    expect(D({ ...base, pendingOwn: { at: T0 + 60_000 }, latest: v })).toEqual({
      ok: true,
      adopt: SHA("d"),
    });
    // …but not one from long before this tab's save
    const old = version({ sha: SHA("d"), login: me, at: -600 });
    expect(D({ ...base, pendingOwn: { at: T0 + 60_000 }, latest: old }).ok).toBe(false);
  });
  it("baseline unknown (a backup from before this release) and mine → allow", () => {
    expect(D({ ...base, baseline: "unknown", latest: version({ login: me }) }).ok).toBe(true);
  });
  it("baseline unknown and a colleague's → block", () => {
    expect(D({ ...base, baseline: "unknown", latest: version({ login: "icho" }) }).ok).toBe(false);
  });
  it("mine, from another tab or window → block, with that wording", () => {
    const d = D({ ...base, latest: version({ sha: SHA("f"), login: me, at: 60 }) });
    expect(d.ok).toBe(false);
    expect(d.self).toBe(true);
    expect(d.message).toMatch(
      /^Not saved: you saved this entry in another tab or window at \d{1,2}:\d{2} [ap]m\. Saving now would replace that version\. Press “Bring in that version” above the form; your changes here stay\.$/,
    );
  });
  it("a colleague's save after opening → block, naming who and when", () => {
    const d = D({ ...base, latest: version({ sha: SHA("f"), login: "icho", at: 60 }) });
    expect(d.ok).toBe(false);
    expect(d.message).toMatch(
      /^Not saved: Isabelle Cho \(@icho\) saved this entry at \d{1,2}:\d{2} [ap]m, after you opened it\. Saving now would replace their change\. Press “Bring in their changes” above the form; your changes stay, theirs are added, then Save again\.$/,
    );
  });
  it("the baseline never loaded: a newest version older than the opening is the opened one", () => {
    const v = version({ sha: SHA("f"), login: "icho", at: -60 });
    expect(D({ ...base, baseline: null, latest: v })).toEqual({ ok: true, adopt: SHA("f") });
    expect(D({ ...base, baseline: null, latest: version({ login: "icho", at: 60 }) }).ok).toBe(
      false,
    );
  });
  it("no file on main → allow", () => {
    expect(D({ ...base, latest: null }).ok).toBe(true);
  });
  it("a new entry whose address exists → block (recent: 'just created'; older: 'already exists')", () => {
    const N = b.save._newEntryDecision;
    expect(N(null).ok).toBe(true);
    const fresh = N(version({ at: -120 }), T0);
    expect(fresh.message).toMatch(
      /^Not saved: Isabelle Cho just created an entry with this address at \d{1,2}:\d{2} [ap]m\. Open it instead, or change the title so the address differs\.$/,
    );
    const old = N(version({ at: -90 * 86400 }), T0);
    expect(old.message).toMatch(
      /^Not saved: an entry with this address already exists \(last saved by Isabelle Cho on /,
    );
  });
});

describe("the conflict guard in a Save", () => {
  it("equal: saves, without a note", async () => {
    const b = changed();
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
    expect(b.log.docked[0]!.notes).toEqual([]);
  });

  it("a colleague saved after opening: refused, with [Bring in their changes]", async () => {
    let theirs = false;
    const b = changed({
      latest: () =>
        theirs
          ? version({ sha: SHA("f"), login: "icho", at: 120 })
          : version({ sha: OPENED, at: -3600 }),
    });
    await b.run(100);
    theirs = true;
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    const band = b.band()!;
    expect(band.getAttribute("role")).toBe("alert");
    expect(band.textContent).toContain("Isabelle Cho (@icho) saved this entry at");
    const bring = band
      .querySelectorAll("button")
      .find((x) => x.textContent === "Bring in their changes")!;
    bring.click();
    await b.run(100);
    expect(b.log.merges).toEqual([{ path: PATH, baseSha: OPENED, latestSha: SHA("f") }]);
    expect(b.band()!.hidden).toBe(true);
  });

  it("another tab of mine: refused, offering “Bring in that version”", async () => {
    let later = false;
    const b = changed({
      latest: () =>
        later ? version({ sha: SHA("f"), login: "ada-editor", at: 120 }) : version({ sha: OPENED }),
    });
    await b.run(100);
    later = true;
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    expect(b.band()!.textContent).toContain("you saved this entry in another tab or window");
    expect(b.band()!.textContent).toContain("Bring in that version");
  });

  it("GitHub fails: saved without the conflict check, and the dock says so", async () => {
    let fail = false;
    const b = changed({ latest: () => (fail ? new Error("network") : version({ sha: OPENED })) });
    await b.run(100);
    fail = true;
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
    expect(b.log.docked[0]!.notes).toEqual([
      "Saved without the conflict check (GitHub didn't answer)",
    ]);
  });

  it("GitHub takes more than 5 s: the same", async () => {
    const b = changed({ latest: () => "hang" });
    await clickSave(b, 9000);
    expect(b.log.persisted).toBe(1);
    expect(b.log.docked[0]!.notes).toEqual([
      "Saved without the conflict check (GitHub didn't answer)",
    ]);
  });

  it("a new entry whose address already exists on main is refused, with [Open it]", async () => {
    const b = bootSave({
      entry: {
        newRecord: true,
        slug: null,
        path: null,
        hasChanged: true,
        data: { title: "INFORMS annual meeting", date: "2026-10-26", type: "talk" },
      },
      latest: (p) =>
        p === "content/news/2026-10-26-informs-annual-meeting.md" ? version({ at: -120 }) : null,
    });
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    expect(b.band()!.textContent).toContain("just created an entry with this address");
    const open = b
      .band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Open it")!;
    open.click();
    expect(b.env.location.hash).toBe(
      "#/collections/news/entries/2026-10-26-informs-annual-meeting",
    );
  });

  it("the local demo has no conflict check (it writes to this computer)", async () => {
    const b = changed({ mode: "local" });
    await clickSave(b);
    expect(b.log.latest).toEqual([]);
    expect(b.log.persisted).toBe(1);
  });
});

describe("the site check (spec §3.6e)", () => {
  const issue = (file: string, field: string, message: string) => ({
    code: "E_X",
    file,
    field,
    message,
  });

  it("gets exactly the data being saved (after cms-hooks has tidied it)", async () => {
    const b = changed({
      entry: { data: { title: "  INFORMS talk  ", date: "2026-10-07", type: "talk", summary: "" } },
    });
    await clickSave(b);
    expect(b.log.checks).toEqual([
      {
        entry: { collection: "news", slug: "2026-10-07-informs-talk" },
        isNew: false,
        data: { title: "INFORMS talk", date: "2026-10-07", type: "talk" },
        timeoutMs: 4000,
      },
    ]);
  });

  it("blocking problems with the switch on: refused, up to 3 listed, [Open …] for another file", async () => {
    const b = changed({
      check: {
        available: true,
        blocking: [
          issue("publications/a.md", "title", "Same title as another paper"),
          issue("news/2026-10-07-informs-talk.md", "title", "Too long"),
          issue("news/b.md", "body", "Links to a hidden page"),
          issue("news/c.md", "body", "Links to a hidden page"),
        ],
      },
    });
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    const t = b.band()!.textContent;
    expect(t).toContain(
      "Not saved: the site check would reject this: publications/a.md › title: Same title as another paper; news/2026-10-07-informs-talk.md › title: Too long; news/b.md › body: Links to a hidden page (and 1 more).",
    );
    const names = b
      .band()!
      .querySelectorAll("button")
      .map((x) => x.textContent);
    expect(names).toEqual(["Go to Title", "Open publications “a”", "Dismiss"]);
  });

  it("[Open …] names the other entry as the live column does (its title), when it can", async () => {
    const b = changed({
      check: {
        available: true,
        blocking: [
          {
            code: "E_DUP_TITLE",
            file: "news/2026-10-07-informs-talk.md",
            field: "title",
            message: "title duplicates news/2026-05-11-other.md",
          },
        ],
      },
    });
    const live = b.win.BobalabLive as Record<string, unknown>;
    live.issueEntry = () => ({
      collection: "news",
      slug: "2026-05-11-other",
      name: "the other publication",
    });
    await clickSave(b);
    const names = b
      .band()!
      .querySelectorAll("button")
      .map((x) => x.textContent);
    // The duplicate sits on this entry's own file; the button opens the OTHER one.
    expect(names).toEqual(["Go to Title", "Open the other publication", "Dismiss"]);
    b.band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Open the other publication")!
      .click();
    expect(b.env.location.hash).toBe("#/collections/news/entries/2026-05-11-other");
  });

  it("the switch off: problems never block", async () => {
    const b = changed({ check: { available: true, blocking: [issue("news/x.md", "title", "x")] } });
    (b.win.BOBALAB_CMS as { features: Record<string, unknown> }).features.previewCheckBlocksSave =
      false;
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
  });

  it("not available (base still loading): saved, and the dock says without the site check", async () => {
    const b = changed({ check: { available: false, blocking: [] } });
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
    expect(b.log.docked[0]!.notes).toEqual([
      "Saved without the site check (the preview wasn't ready)",
    ]);
  });

  it("no answer within 4 s, or no live column at all: the same", async () => {
    const slow = changed({ check: "hang" });
    await clickSave(slow, 9000);
    expect(slow.log.persisted).toBe(1);
    expect(slow.log.docked[0]!.notes).toEqual([
      "Saved without the site check (the preview wasn't ready)",
    ]);
    const none = changed({ check: null });
    await clickSave(none);
    expect(none.log.persisted).toBe(1);
    expect(none.log.docked[0]!.notes).toEqual([
      "Saved without the site check (the preview wasn't ready)",
    ]);
  });
});

describe("uploads and protected names (spec §3.6 b, c)", () => {
  it("a .docx uploaded into the entry is refused at Save, nothing is committed", async () => {
    const b = changed({
      entry: {
        data: {
          title: "INFORMS talk",
          date: "2026-10-07",
          type: "talk",
          image: { image: "/uploads/cv.docx", alt: "x" },
        },
        mediaFiles: [
          {
            id: "m1",
            name: "cv.docx",
            path: "public/uploads/cv.docx",
            draft: true,
            file: { size: 2000 },
          },
        ],
      },
    });
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    expect(b.band()!.textContent).toContain(
      "Not saved: “cv.docx” can't go on the website. Upload a PDF (at most 10 MB) or a JPG, PNG, WebP or GIF image (at most 2 MB).",
    );
    expect(
      b
        .band()!
        .querySelectorAll("button")
        .map((x) => x.textContent),
    ).toContain("Go to Image");
  });

  it("a name the lab asked never to publish is refused without printing it (fictional test name)", async () => {
    const b = changed({
      entry: { data: { title: "Talk by Quinby Zorander", date: "2026-10-07", type: "talk" } },
    });
    const cms = b.win.BOBALAB_CMS as { hiddenNames: { salt: string; hashes: string[] } };
    const salt = cms.hiddenNames.salt;
    cms.hiddenNames = {
      salt,
      hashes: [
        createHash("sha256")
          .update(`${salt}:${normalizeName("Quinby Zorander")}`)
          .digest("hex"),
      ],
    };
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    const t = b.band()!.textContent;
    expect(t).toContain(
      "Not saved: this entry contains a name the lab has asked never to publish. Ask the PI before adding it.",
    );
    expect(t).not.toMatch(/Quinby|Zorander/);
  });

  it("checks run in order: uploads first, then names, conflict and the site check", async () => {
    const b = changed({
      entry: {
        data: {
          title: "x",
          date: "2026-10-07",
          type: "talk",
          image: { image: "/uploads/a.heic", alt: "x" },
        },
        mediaFiles: [
          { name: "a.heic", path: "public/uploads/a.heic", draft: true, file: { size: 1 } },
        ],
      },
    });
    await b.run(100);
    b.log.latest.length = 0; // the read when the entry was opened
    await clickSave(b);
    expect(b.log.latest).toEqual([]); // stopped before the conflict check
    expect(b.log.checks).toEqual([]);
  });
});

describe("the 'Not saved' band (spec §3.8)", () => {
  it("maps Decap's errors to plain words", () => {
    const R = bootSave().save._refusalText;
    expect(R("Error: Update is not a fast forward")).toBe(
      "Not saved: someone else saved at the same moment. Nothing was lost — press Save again.",
    );
    expect(R("Error: API_ERROR: 409 Conflict")).toBe(
      "Not saved: someone else saved at the same moment. Nothing was lost — press Save again.",
    );
    expect(R("Error: Bad credentials")).toBe(
      "Not saved: your sign-in expired. Sign in again; your changes are kept in this browser.",
    );
    expect(R("Error: 401 Unauthorized")).toBe(
      "Not saved: your sign-in expired. Sign in again; your changes are kept in this browser.",
    );
    expect(R("TypeError: Failed to fetch")).toBe(
      "Not saved: couldn't reach GitHub. Check the connection and press Save again.",
    );
    expect(R("Error: NetworkError when attempting to fetch resource.")).toBe(
      "Not saved: couldn't reach GitHub. Check the connection and press Save again.",
    );
    expect(R("Error: Not saved: Not saved: “Image” has an image but no alt text.")).toBe(
      "Not saved: “Image” has an image but no alt text.",
    );
    expect(R("Error: Something odd")).toBe("Not saved: Something odd");
    expect(R("Not saved yet: check the address first.")).toBe(
      "Not saved yet: check the address first.",
    );
  });

  it("shows cms-hooks' refusals in the band, hides Decap's toast, and stays after 10 s", async () => {
    const b = changed({
      entry: {
        data: { title: "x", date: "2026-10-07", type: "talk", image: { image: "/uploads/a.jpg" } },
      },
    });
    await clickSave(b);
    expect(b.log.persisted).toBe(0);
    const toast = b.toasts.querySelector(".Toastify__toast--error")!;
    expect(toast.hasAttribute("data-bl-hide")).toBe(true);
    await b.run(10_000);
    expect(b.band()!.hidden).toBe(false);
    expect(b.band()!.textContent).toContain("has an image but no alt text");
    expect(b.band()!.parentNode).toBe(b.form); // at the top of the form pane
    expect(b.form.firstChild).toBe(b.band());
  });

  it("[Go to …] focuses the field; an edit of that field, [Dismiss] or the next save clears it", async () => {
    const b = changed();
    await b.run(100);
    b.save.refuse("Not saved: the title is too long.", { field: "title" });
    const go = b
      .band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Go to Title")!;
    go.click();
    expect(b.document.activeElement!.id).toBe("title-field-3");
    b.setEntry({ data: { ...b.entry()!.data, summary: "other field" } });
    expect(b.band()!.hidden).toBe(false);
    b.setEntry({ data: { ...b.entry()!.data, title: "Shorter" } });
    expect(b.band()!.hidden).toBe(true);
    b.save.refuse("Not saved: x");
    b.band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Dismiss")!
      .click();
    expect(b.band()!.hidden).toBe(true);
    b.save.refuse("Not saved: y");
    await clickSave(b);
    expect(b.band()!.hidden).toBe(true);
  });

  it("Decap's own required-field refusal gets [Go to …] for the first field it marked red", async () => {
    const b = changed({ requiredMissing: true });
    await b.run(100);
    // Decap's markup for a field with problems: label[for] and ControlErrorsList.
    const field = (name: string, label: string, error: string) => {
      const box = b.make("div", "css-11-ControlContainer");
      const l = b.make("label", "css-12-FieldLabel", label);
      l.setAttribute("for", `${name}-field-7`);
      const ul = b.make("ul", "css-13-ControlErrorsList", error);
      const input = b.make("input");
      input.setAttribute("id", `${name}-field-7`);
      box.appendChild(l);
      box.appendChild(ul);
      box.appendChild(input);
      b.form.appendChild(box);
    };
    field("summary", "Summary", ""); // no problem: skipped
    field("type", "Type", "Type is required.");
    await clickSave(b);
    expect(b.band()!.textContent).toContain(
      "Not saved: a required field is empty. It is marked in red.",
    );
    const go = b
      .band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Go to Type")!;
    expect(go).toBeTruthy();
    go.click();
    expect(b.document.activeElement!.id).toBe("type-field-7");
    expect(b.save.isSaving()).toBe(false);
  });

  it("…a top-level field's [Go to …] uses the form's own label, and editing that field clears the band", async () => {
    const b = changed({ requiredMissing: true });
    await b.run(100);
    const box = b.make("div", "css-11-ControlContainer");
    const l = b.make("label", "css-12-FieldLabel", "Summary");
    l.setAttribute("for", "summary-field-4");
    const ul = b.make("ul", "css-13-ControlErrorsList", "Summary is required.");
    box.appendChild(l);
    box.appendChild(ul);
    b.form.appendChild(box);
    await clickSave(b);
    expect(b.band()!.textContent).toContain("Go to Summary");
    b.setEntry({ data: { ...b.entry()!.data, summary: "Now filled in." } });
    expect(b.band()!.hidden).toBe(true);
  });

  // Decap 3.17.1 shows a toast only for an EMPTY required field. A value in the
  // wrong format (an address without https://, a title over 160 characters) only
  // gets the field marked in red, often out of sight: the band must say it.
  const LINK_FIELDS = [
    { name: "title", label: "Title", widget: "string" },
    { name: "year", label: "Year", widget: "number" },
    {
      name: "link",
      label: "Link",
      widget: "object",
      fields: [
        { name: "label", label: "Link text", widget: "string" },
        {
          name: "url",
          label: "Address",
          widget: "string",
          pattern: [
            "(?=^(?:https://\\S+|/(?![/\\\\])\\S*)$)",
            "Use a full https:// address or a site path starting with /.",
          ],
        },
      ],
    },
  ];
  /** Decap's markup for a marked field, inside `parent` (an object's box, or the form). */
  function markField(
    b: ReturnType<typeof bootSave>,
    parent: FakeElement,
    o: { id: string; label: string; error?: string; input?: boolean },
  ) {
    const box = b.make("div", "css-11-ControlContainer");
    const bar = b.make("div", "css-14-ControlTopbar");
    const l = b.make("label", "css-12-FieldLabel", o.label);
    l.setAttribute("for", o.id);
    bar.appendChild(l);
    if (o.error !== undefined) {
      const ul = b.make("ul", "css-13-ControlErrorsList");
      if (o.error) ul.appendChild(b.make("li", "", o.error));
      bar.appendChild(ul);
    }
    box.appendChild(bar);
    if (o.input !== false) {
      const input = b.make("input");
      input.setAttribute("id", o.id);
      box.appendChild(input);
    }
    parent.appendChild(box);
    return box;
  }

  it("a value in the wrong format (Decap sends no toast): the band names the field and why, with [Go to …]", async () => {
    const b = changed({
      formatInvalid: true,
      entry: {
        fields: LINK_FIELDS,
        data: {
          title: "x",
          date: "2026-10-07",
          type: "talk",
          link: { label: "Programme", url: "www.informs.org" },
        },
      },
    });
    await b.run(100);
    const link = markField(b, b.form, {
      id: "link-field-5",
      label: "Link (optional)",
      input: false,
    });
    markField(b, link, {
      id: "url-field-9",
      label: "Address (optional)",
      error: "Address: Use a full https:// address or a site path starting with /.",
    });
    b.click(b.btn());
    await b.run(600); // shown well before Decap's 1.5 s "not started" release
    expect(b.toasts.querySelectorAll(".Toastify__toast")).toHaveLength(0);
    expect(b.band()!.hidden).toBe(false);
    expect(b.band()!.getAttribute("role")).toBe("alert");
    expect(b.band()!.querySelector(".bl-refusal__text")!.textContent).toBe(
      "Not saved: Link › Address: Use a full https:// address or a site path starting with /.",
    );
    expect(b.log.persisted).toBe(0);
    expect(b.save.isSaving()).toBe(false);
    const go = b
      .band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Go to Link › Address")!;
    go.click();
    expect(b.document.activeElement!.id).toBe("url-field-9");
    await b.run(10_000);
    expect(b.band()!.hidden).toBe(false); // stays until fixed, like every refusal
    // Fixed: Decap's check passes, the save goes through and the band goes.
    b.state.formatInvalid = false;
    b.setEntry({
      data: { ...b.entry()!.data, link: { label: "Programme", url: "https://www.informs.org" } },
    });
    expect(b.band()!.hidden).toBe(true); // an edit of the named field clears it
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
  });

  it("…Decap's own words, a range, and more than one marked field", async () => {
    const b = changed({ formatInvalid: true, entry: { fields: LINK_FIELDS } });
    await b.run(100);
    markField(b, b.form, {
      id: "title-field-2",
      label: "Title",
      error: "Title didn't match the pattern: At most 160 characters.",
    });
    markField(b, b.form, {
      id: "year-field-3",
      label: "Year (optional)",
      error: "Year must be between 1990 and 2100.",
    });
    await clickSave(b, 3000);
    expect(b.band()!.querySelector(".bl-refusal__text")!.textContent).toBe(
      "Not saved: Title: At most 160 characters (and 1 more field to fix).",
    );
    expect(b.band()!.textContent).toContain("Go to Title");
    // The range message keeps its words.
    const c = changed({ formatInvalid: true, entry: { fields: LINK_FIELDS } });
    await c.run(100);
    markField(c, c.form, {
      id: "year-field-3",
      label: "Year (optional)",
      error: "Year must be between 1990 and 2100.",
    });
    await clickSave(c, 3000);
    expect(c.band()!.querySelector(".bl-refusal__text")!.textContent).toBe(
      "Not saved: Year must be between 1990 and 2100.",
    );
  });

  it("…when Decap's markup is not found, the form's own patterns name the field", async () => {
    const b = changed({
      formatInvalid: true,
      entry: {
        fields: LINK_FIELDS,
        data: { title: "x", date: "2026-10-07", link: { label: "Programme", url: "www.x.org" } },
      },
    });
    await clickSave(b, 3000);
    expect(b.band()!.querySelector(".bl-refusal__text")!.textContent).toBe(
      "Not saved: Link › Address: Use a full https:// address or a site path starting with /.",
    );
    expect(b.band()!.textContent).toContain("Go to Link › Address");
    expect(b.save.isSaving()).toBe(false);
  });

  it("…and with nothing marked and nothing wrong it says nothing (Save simply works again)", async () => {
    const b = changed({ formatInvalid: true, entry: { fields: LINK_FIELDS } });
    await clickSave(b, 3000);
    expect(b.band()?.hidden ?? true).toBe(true);
    expect(b.save.isSaving()).toBe(false);
  });

  it("cms-hooks' alt-text refusal: no repository path, and [Go to Image › Alt text]", async () => {
    const b = changed({
      entry: {
        fields: [
          { name: "title", label: "Title", widget: "string" },
          {
            name: "image",
            label: "Image",
            widget: "object",
            fields: [
              { name: "image", label: "Image", widget: "image" },
              { name: "alt", label: "Alt text (required with an image)", widget: "string" },
            ],
          },
        ],
        data: { title: "x", date: "2026-10-07", type: "talk", image: { image: "/uploads/a.jpg" } },
      },
    });
    await b.run(100);
    const img = markField(b, b.form, { id: "image-field-2", label: "Image", input: false });
    markField(b, img, { id: "image-field-4", label: "Image" });
    markField(b, img, { id: "alt-field-6", label: "Alt text (required with an image)" });
    await clickSave(b);
    const t = b.band()!.querySelector(".bl-refusal__text")!.textContent;
    expect(t).toBe(
      "Not saved: “Image” has an image but no alt text. Describe in a sentence what the image shows.",
    );
    expect(t).not.toMatch(/docs\/|EDITING/);
    const go = b
      .band()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Go to Image › Alt text")!;
    go.click();
    expect(b.document.activeElement!.id).toBe("alt-field-6");
  });

  it("on a phone showing Preview & history, a refusal switches back to Edit (the band is in the form)", async () => {
    const b = changed({ layout: true, phone: true });
    await b.run(100);
    const layout = b.win.BobalabLayout as { setPhonePreview: (on: boolean) => Promise<boolean> };
    await layout.setPhonePreview(true);
    await b.run(100);
    const html = b.document.documentElement!;
    expect(html.classList.contains("bl-phone-preview")).toBe(true);
    b.save.refuse("Not saved: x");
    await b.run(100);
    expect(html.classList.contains("bl-phone-preview")).toBe(false);
    expect(b.band()!.hidden).toBe(false);
  });

  it("opening another entry clears it", async () => {
    const b = changed();
    await b.run(100);
    b.save.refuse("Not saved: x");
    b.setEntry({ slug: "2026-05-11-other", path: "content/news/2026-05-11-other.md" });
    expect(b.band()!.hidden).toBe(true);
  });
});

describe("the note next to Save (spec §3.5)", () => {
  const N = bootSave().save.saveNote;
  it("says what Save will do", () => {
    expect(N("news", { draft: false })).toBe("Save puts this on the live site");
    expect(N("publications", {})).toBe("Save puts this on the live site");
    expect(N("news", { draft: true })).toBe("Save keeps it hidden: Visible is No");
    expect(N("people", { listed: false })).toBe("Not listed: Save won't show this person");
    expect(N("people", { listed: true, draft: true })).toBe("Save keeps it hidden: Visible is No");
    expect(N("people", { listed: true, role: "phd" })).toBe(
      "Save updates the People section of the home page",
    );
    expect(N("people", { listed: true, role: "phd", profile_page: true })).toBe(
      "Save puts this on the live site",
    );
    expect(N("people", { listed: true, role: "pi" })).toBe("Save puts this on the live site");
    expect(N("opportunities", {})).toBe("Save updates the Join page");
    expect(N("pages", {})).toBe("Save updates the live site");
    expect(N("settings", {})).toBe("Save updates the live site");
  });

  it("sits right after Save in the toolbar and follows every change", async () => {
    const b = changed();
    await b.run(100);
    const note = b.note()!;
    expect(note.parentNode).toBe(b.toolbar.main);
    expect(b.toolbar.main.children.indexOf(note)).toBe(
      b.toolbar.main.children.indexOf(b.toolbar.last) - 1,
    );
    expect(note.textContent).toBe("Save puts this on the live site");
    b.setEntry({ data: { ...b.entry()!.data, draft: true } });
    await b.run(50);
    expect(note.textContent).toBe("Save keeps it hidden: Visible is No");
  });

  it("says when the live column is hidden, with [Show it]", async () => {
    let shown = false;
    let asked = 0;
    const b = changed({
      extra: {
        BobalabLayout: {
          isLivePaneShown: () => shown,
          showLivePane: () => {
            asked++;
            shown = true;
            return Promise.resolve(true);
          },
        },
      },
    });
    await b.run(100);
    expect(b.note()!.textContent).toContain(
      "Site check and History are off while the live column is hidden.",
    );
    b.note()!
      .querySelectorAll("button")
      .find((x) => x.textContent === "Show it")!
      .click();
    expect(asked).toBe(1);
    b.mutate();
    await b.run(50);
    expect(b.note()!.textContent).toBe("Save puts this on the live site");
  });
});

describe("after the commit: the dock and listeners (spec §3.9)", () => {
  it("hands the save to the dock: path, login, click time, baseline, view, notes", async () => {
    const b = changed();
    const heard: unknown[] = [];
    b.save.onSaved((e) => heard.push(e));
    await b.run(100);
    const clickAt = b.clock.t;
    await clickSave(b);
    expect(b.log.docked).toEqual([
      {
        collection: "news",
        slug: "2026-10-07-informs-talk",
        path: PATH,
        label: "News item “2026-10-07-informs-talk”",
        login: "ada-editor",
        startedAt: clickAt,
        baselineSha: OPENED,
        view: { state: "live", path: "/news/2026-10-07-informs-talk/" },
        notes: [],
      },
    ]);
    expect(heard).toEqual([
      {
        collection: "news",
        slug: "2026-10-07-informs-talk",
        path: PATH,
        login: "ada-editor",
        startedAt: clickAt,
      },
    ]);
    // one success toast: Decap's "Saved." gives way to the dock's
    expect(b.toasts.querySelector(".Toastify__toast--success")!.hasAttribute("data-bl-hide")).toBe(
      true,
    );
  });

  it("a new entry: waits for its address, then hands it over", async () => {
    const b = bootSave({
      entry: {
        newRecord: true,
        slug: null,
        path: null,
        hasChanged: true,
        data: { title: "Lab retreat", date: "2026-10-26", type: "lab-life", draft: true },
      },
      latest: () => null,
    });
    await clickSave(b);
    expect(b.log.persisted).toBe(1);
    const d = b.log.docked[0]!;
    expect(d.slug).toBe("2026-10-26-lab-retreat");
    expect(d.path).toBe("content/news/2026-10-26-lab-retreat.md");
    expect(d.baselineSha).toBe("unknown");
    expect(d.view).toEqual({ state: "hidden", reason: "draft" });
  });

  it("without cms-live.js, the view mirrors hasLivePage", () => {
    const V = bootSave().save._fallbackView;
    expect(V("news", "x", {})).toEqual({ state: "live", path: "/news/x/" });
    expect(V("news", "x", { draft: true })).toEqual({ state: "hidden", reason: "draft" });
    expect(V("people", "x", { listed: false })).toEqual({ state: "hidden", reason: "unlisted" });
    expect(V("people", "x", { listed: true, role: "phd" })).toEqual({
      state: "elsewhere",
      path: "/#people",
      label: "People section",
    });
    expect(V("people", "x", { listed: true, role: "pi" })).toEqual({
      state: "live",
      path: "/people/x/",
    });
    expect(V("directions", "x", {})).toEqual({ state: "live", path: "/research/x/" });
    expect(V("opportunities", "x", {})).toEqual({
      state: "elsewhere",
      path: "/join/",
      label: "Join page",
    });
    expect(V("settings", "site", {})).toEqual({
      state: "elsewhere",
      path: "/",
      label: "Home page",
    });
    expect(V("pages", "home", {})).toEqual({ state: "live", path: "/" });
    expect(V("pages", "about", {})).toEqual({ state: "live", path: "/about/" });
  });

  it("the first-use tip shows once, until dismissed", async () => {
    const b = bootSave({ tipSeen: false });
    await b.run(100);
    const box = b.document.getElementById("bl-toasts")!;
    expect(box.textContent).toContain(
      "Save puts your changes on the live site in about 2 minutes.",
    );
    box
      .querySelectorAll("button")
      .find((x) => x.textContent === "Got it")!
      .click();
    expect(b.env.local.getItem("bobalab.saveTip.v1")).not.toBeNull();
  });
});
