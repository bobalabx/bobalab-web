/**
 * public/admin/cms-ui.js: dialogs, toasts, screen-reader announcements and
 * times in the viewer's own time zone (editor v2; owner default for open
 * question 15). Dialogs are native <dialog>s built from buttons only (the
 * admin CSP has form-action 'none'), with Cancel focused first.
 */
import { describe, expect, it } from "vitest";
import { FakeEvent, boot, buttonNamed, text, type FakeElement } from "./github-helpers";

interface Toast {
  close(): void;
  setText(t: string): void;
  setAction(a: { label: string; run: () => void } | null): void;
  isOpen(): boolean;
  el: FakeElement | null;
}
interface Ui {
  confirm(o: Record<string, unknown>): Promise<{ ok: boolean; checked: Record<string, boolean> }>;
  info(o: Record<string, unknown>): Promise<void>;
  toast(o: Record<string, unknown>): Toast;
  announce(t: string, assertive?: boolean): void;
  timeAgo(iso: string, now?: string | number, o?: { timeZone?: string }): string;
  fullTime(iso: string, o?: { timeZone?: string; zone?: boolean }): string;
  shortDate(iso: string, o?: { timeZone?: string }): string;
  clock(iso: string, o?: { timeZone?: string }): string;
  when(iso: string, now?: string, o?: { timeZone?: string }): string;
  dayLabel(iso: string, now?: string, o?: { timeZone?: string }): string;
}

function setup(o: Record<string, unknown> = {}) {
  const b = boot({ files: ["cms-ui.js"], ...o });
  return { ...b, ui: b.win.BobalabUi as Ui };
}

const LA = { timeZone: "America/Los_Angeles" };

describe("cms-ui.js: times", () => {
  const { ui } = setup();
  const now = "2026-10-26T20:00:00Z";

  it("timeAgo(): just now, minutes, hours, yesterday, days, then the date", () => {
    const ago = (s: number) =>
      ui.timeAgo(new Date(Date.parse(now) - s * 1000).toISOString(), now, LA);
    expect(ago(10)).toBe("just now");
    expect(ago(-30)).toBe("just now"); // a commit clock a little ahead
    expect(ago(50)).toBe("1 min ago");
    expect(ago(3 * 60)).toBe("3 min ago");
    expect(ago(59 * 60)).toBe("59 min ago");
    expect(ago(61 * 60)).toBe("1 hour ago");
    expect(ago(5 * 3600)).toBe("5 hours ago");
    expect(ago(30 * 3600)).toBe("yesterday");
    expect(ago(2 * 86400 + 60)).toBe("2 days ago");
    expect(ago(10 * 86400)).toBe("Oct 16");
    expect(ui.timeAgo("2025-03-01T12:00:00Z", now, LA)).toBe("Mar 1, 2025");
    expect(ui.timeAgo("not a date", now)).toBe("");
  });

  it("fullTime(): month, day, year, time and zone, in the viewer's time zone", () => {
    expect(ui.fullTime("2026-10-26T22:14:00Z", LA)).toBe("Oct 26, 2026, 3:14 pm PDT");
    expect(ui.fullTime("2026-12-01T17:02:00Z", LA)).toBe("Dec 1, 2026, 9:02 am PST");
    expect(ui.fullTime("2026-10-24T17:02:00Z", { ...LA, zone: false })).toBe(
      "Oct 24, 2026, 10:02 am",
    );
    expect(ui.fullTime("2026-10-26T22:14:00Z", { timeZone: "Asia/Tokyo" })).toBe(
      "Oct 27, 2026, 7:14 am GMT+9",
    );
    // Without a zone option it uses the viewer's own (here: this machine's).
    const own = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
      .format(new Date("2026-10-26T22:14:00Z"))
      .replace(/[  ]/g, " ")
      .replace(/ (AM|PM)$/, (_m, p: string) => " " + p.toLowerCase());
    expect(ui.fullTime("2026-10-26T22:14:00Z")).toContain(own);
    expect(ui.fullTime("")).toBe("");
  });

  it("clock(), shortDate(), when() and dayLabel()", () => {
    expect(ui.clock("2026-10-26T22:14:00Z", LA)).toBe("3:14 pm");
    expect(ui.shortDate("2026-10-24T17:02:00Z", LA)).toBe("Oct 24, 2026");
    expect(ui.when("2026-10-26T17:00:00Z", now, LA)).toBe("10:00 am");
    expect(ui.when("2026-10-24T17:00:00Z", now, LA)).toBe("Oct 24, 10:00 am");
    expect(ui.when("2025-10-24T17:00:00Z", now, LA)).toBe("Oct 24, 2025, 10:00 am");
    expect(ui.dayLabel("2026-10-26T15:00:00Z", now, LA)).toBe("Today");
    expect(ui.dayLabel("2026-10-25T15:00:00Z", now, LA)).toBe("Yesterday");
    expect(ui.dayLabel("2026-10-24T15:00:00Z", now, LA)).toBe("Sat, Oct 24");
    // 06:00 UTC on the 26th is still the 25th in Berkeley.
    expect(ui.dayLabel("2026-10-26T06:00:00Z", now, LA)).toBe("Yesterday");
  });
});

describe("cms-ui.js: confirm() and info()", () => {
  it("opens a modal <dialog> with a labelled title and body, buttons only, Cancel focused first", async () => {
    const b = setup();
    const opener = b.document!.createElement("button");
    b.document!.body.appendChild(opener);
    opener.focus();
    const p = b.ui.confirm({
      title: "Restore the version from Oct 24, 2026, 10:02 am?",
      body: ["It is saved now.", ["Title", "Photo"]],
      confirm: "Restore this version",
      checkboxes: [
        { id: "check", label: "Let me check it in the form first (don't save yet)" },
        { id: "visible", label: "Also make it visible on the live site", checked: true },
      ],
    });
    const dlg = b.document!.querySelector("dialog.bl-dialog")!;
    expect(dlg.open).toBe(true);
    const title = b.document!.getElementById(dlg.getAttribute("aria-labelledby")!)!;
    expect(title.tagName).toBe("h2");
    expect(text(title)).toBe("Restore the version from Oct 24, 2026, 10:02 am?");
    const body = b.document!.getElementById(dlg.getAttribute("aria-describedby")!)!;
    expect(text(body)).toBe("It is saved now.TitlePhoto");
    expect(dlg.querySelectorAll("li")).toHaveLength(2);
    expect(dlg.querySelectorAll("form")).toHaveLength(0);
    for (const btn of dlg.querySelectorAll("button"))
      expect(btn.getAttribute("type")).toBe("button");
    expect(text(b.document!.activeElement)).toBe("Cancel");
    // labels point at their boxes
    const box = dlg.querySelectorAll("input")[0]!;
    expect(dlg.querySelector(`label[for="${box.id}"]`)).not.toBeNull();
    box.checked = true;
    buttonNamed(dlg, "Restore this version")!.click();
    expect(await p).toEqual({ ok: true, checked: { check: true, visible: true } });
    expect(b.document!.querySelector("dialog")).toBeNull();
    expect(b.document!.activeElement).toBe(opener);
  });

  it("Esc (the dialog's cancel event) and Cancel resolve ok: false", async () => {
    const b = setup();
    const p1 = b.ui.confirm({ title: "Sure?", body: [] });
    const d1 = b.document!.querySelector("dialog")!;
    const esc = new FakeEvent("cancel");
    d1.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true);
    expect(await p1).toEqual({ ok: false, checked: {} });
    const p2 = b.ui.confirm({ title: "Sure?", body: ["x"], danger: true, confirm: "Delete" });
    const d2 = b.document!.querySelector("dialog")!;
    expect(buttonNamed(d2, "Delete")!.className).toContain("bl-btn--danger");
    buttonNamed(d2, "Cancel")!.click();
    expect((await p2).ok).toBe(false);
  });

  it("returns focus to returnFocus when given", async () => {
    const b = setup();
    const target = b.document!.createElement("button");
    b.document!.body.appendChild(target);
    const p = b.ui.confirm({ title: "x", body: [], returnFocus: target });
    buttonNamed(b.document!.querySelector("dialog"), "Cancel")!.click();
    await p;
    expect(b.document!.activeElement).toBe(target);
  });

  it("returns focus into a frame: the frame first, then the element (the live column's buttons)", async () => {
    const b = setup();
    const calls: string[] = [];
    const frame = { focus: () => calls.push("frame") };
    // An element of Decap's preview frame: its document's window is not this one.
    const target = {
      focus: () => calls.push("button"),
      ownerDocument: { defaultView: { frameElement: frame } },
    };
    const p = b.ui.confirm({ title: "x", body: [], returnFocus: target });
    buttonNamed(b.document!.querySelector("dialog"), "Cancel")!.click();
    await p;
    expect(calls).toEqual(["frame", "button"]);
  });

  it("info(): one Close button and an optional link that opens a new tab", async () => {
    const b = setup();
    const p = b.ui.info({
      title: "Why the live site did not update",
      body: ["Your save is kept."],
      link: {
        label: "Open the update log on GitHub (opens a new tab)",
        href: "https://github.com/x/actions/runs/1",
      },
    });
    const dlg = b.document!.querySelector("dialog")!;
    expect(dlg.querySelectorAll("button").map((x) => text(x))).toEqual(["Close"]);
    const a = dlg.querySelector("a")!;
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
    buttonNamed(dlg, "Close")!.click();
    await p;
    expect(b.document!.querySelector("dialog")).toBeNull();
  });
});

describe("cms-ui.js: toasts and announcements", () => {
  it("stacks toasts in #bl-toasts (role=status) and closes them after 8 s", async () => {
    const b = setup();
    b.ui.toast({ text: "First" });
    await b.clock.advance(3000);
    b.ui.toast({ text: "Second" });
    const box = b.document!.getElementById("bl-toasts")!;
    expect(box.getAttribute("role")).toBe("status");
    expect(box.parentNode!.id).toBe("bl-corner");
    expect(
      box.querySelectorAll(".bl-toast").map((t) => text(t.querySelector(".bl-toast__text"))),
    ).toEqual(["First", "Second"]);
    await b.clock.advance(5000);
    expect(box.querySelectorAll(".bl-toast")).toHaveLength(1);
    await b.clock.advance(3000);
    expect(box.querySelectorAll(".bl-toast")).toHaveLength(0);
  });

  it("timeoutMs: 0 stays until closed; Dismiss closes it", async () => {
    const b = setup();
    const reasons: string[] = [];
    const t = b.ui.toast({ text: "Stays", timeoutMs: 0, onClose: (r: string) => reasons.push(r) });
    await b.clock.advance(10 * 60000);
    expect(t.isOpen()).toBe(true);
    buttonNamed(t.el, "Dismiss")!.click();
    expect(t.isOpen()).toBe(false);
    expect(reasons).toEqual(["dismiss"]);
  });

  it("pauses while the pointer is over it or focus is inside it", async () => {
    const b = setup();
    const t = b.ui.toast({ text: "Saved.", timeoutMs: 30000 });
    await b.clock.advance(10000);
    t.el!.dispatchEvent(new FakeEvent("mouseenter"));
    await b.clock.advance(60000);
    expect(t.isOpen()).toBe(true);
    t.el!.dispatchEvent(new FakeEvent("mouseleave"));
    await b.clock.advance(19000);
    expect(t.isOpen()).toBe(true);
    buttonNamed(t.el, "Dismiss")!.focus();
    await b.clock.advance(60000);
    expect(t.isOpen()).toBe(true);
    buttonNamed(t.el, "Dismiss")!.blur();
    await b.clock.advance(999);
    expect(t.isOpen()).toBe(true);
    await b.clock.advance(1);
    expect(t.isOpen()).toBe(false);
  });

  it("an action runs once and closes the toast; setText and setAction update it", async () => {
    const b = setup();
    let runs = 0;
    const reasons: string[] = [];
    const t = b.ui.toast({ text: "Saved.", onClose: (r: string) => reasons.push(r) });
    t.setText("Saved. Changed text.");
    t.setAction({ label: "Undo", run: () => runs++ });
    expect(text(t.el!.querySelector(".bl-toast__text"))).toBe("Saved. Changed text.");
    expect(t.el!.querySelectorAll("button").map((x) => text(x))).toEqual(["Undo", "Dismiss"]);
    buttonNamed(t.el, "Undo")!.click();
    expect(runs).toBe(1);
    expect(reasons).toEqual(["action"]);
    expect(b.document!.querySelectorAll(".bl-toast")).toHaveLength(0);
  });

  it("announce(): one polite and one assertive region; the same words are read again", async () => {
    const b = setup();
    b.ui.announce("Saved.");
    b.ui.announce("Saved, but the live site did not update.", true);
    await b.clock.advance(100);
    const polite = b.document!.getElementById("bl-announce-polite")!;
    const loud = b.document!.getElementById("bl-announce-assertive")!;
    expect(polite.getAttribute("aria-live")).toBe("polite");
    expect(loud.getAttribute("role")).toBe("alert");
    expect(text(polite)).toBe("Saved.");
    expect(text(loud)).toBe("Saved, but the live site did not update.");
    b.ui.announce("Saved.");
    expect(text(polite)).toBe(""); // cleared first, so it is spoken again
    await b.clock.advance(100);
    expect(text(polite)).toBe("Saved.");
  });
});

describe("cms-ui.js without a DOM", () => {
  it("loads, and its DOM functions do nothing", async () => {
    const b = boot({ files: ["cms-ui.js"], dom: false, cmsData: null });
    const ui = b.win.BobalabUi as Ui;
    expect(await ui.confirm({ title: "x", body: [] })).toEqual({ ok: false, checked: {} });
    expect(ui.toast({ text: "x" }).isOpen()).toBe(false);
    ui.announce("x");
    expect(ui.clock("2026-10-26T22:14:00Z", LA)).toBe("3:14 pm");
  });
});
