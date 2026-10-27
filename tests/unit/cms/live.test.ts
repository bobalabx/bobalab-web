/**
 * public/admin/cms-live.js (editor v2, WP4): the live column's bridge to the
 * preview (spec §2, §9 WP4). Registration of the 12 templates and live.css;
 * PAGE_MAP and viewTarget (mirrors hasLivePage); the overlay message, with
 * Immutable data for expectedSlug; unsaved uploads as data URLs; device math;
 * shouldComponentUpdate; the handshake and the services (check, parse); the
 * base loader; and the plain wording of the site check's problems.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasLivePage } from "@/lib/content/links";
import type { CollectionName, EntryMap } from "@/lib/content/schema";
import { ROOT } from "./helpers";
import {
  FakeList,
  FakeMap,
  NEWS_FIELDS,
  ORIGIN,
  PEOPLE_FIELDS,
  boot,
  button,
  decapEntry,
  findAll,
  flush,
  textOf,
  type Node,
} from "./live-helpers";

const news = (data: Record<string, unknown> = {}, slug = "2026-10-07-informs-talk") =>
  decapEntry("news", slug, {
    date: "2026-10-07",
    type: "talk",
    title: "INFORMS talk",
    ...data,
  });

/** A getCollection that answers from a small saved site. */
function siteLoader(
  site: Partial<Record<string, Array<{ slug: string; data: Record<string, unknown> }>>> = {},
  opts: { fail?: string[]; log?: string[]; inFlight?: { now: number; max: number } } = {},
) {
  return async (name: string) => {
    opts.log?.push(name);
    if (opts.inFlight) {
      opts.inFlight.now += 1;
      opts.inFlight.max = Math.max(opts.inFlight.max, opts.inFlight.now);
    }
    await Promise.resolve();
    await Promise.resolve();
    if (opts.inFlight) opts.inFlight.now -= 1;
    if (opts.fail?.includes(name)) throw new Error("read failed");
    return (site[name] ?? []).map(
      (e) =>
        new FakeMap([
          ["slug", e.slug],
          ["data", e.data],
          ["path", `content/${name}/${e.slug}.md`],
        ]),
    );
  };
}

const SITE = {
  pages: [{ slug: "home", data: { statement: "Hi" } }],
  settings: [{ slug: "site", data: { long_name: "Lab" } }],
  people: [{ slug: "isabelle-cho", data: { name: "Isabelle Cho", role: "phd", listed: true } }],
  publications: [
    {
      slug: "allon-2023-gig-drivers",
      data: { title: "Gig drivers", authors: [{ name: "Allon" }], type: "journal" },
    },
  ],
  news: [{ slug: "2026-10-07-informs-talk", data: { title: "INFORMS talk" } }],
};

function ready(env: ReturnType<typeof boot>) {
  env.send({ type: "bobalab:ready", v: 1 });
}

describe("registration", () => {
  it("registers ONE component for exactly the 12 entry types, and live.css (not preview.css)", () => {
    const env = boot();
    const names = Object.keys(env.reg.templates).sort();
    expect(names).toEqual(
      [
        "about",
        "accessibility",
        "directions",
        "home",
        "join",
        "news",
        "opportunities",
        "people",
        "privacy",
        "projects",
        "publications",
        "site",
      ].sort(),
    );
    expect(names).toHaveLength(12);
    const components = new Set(Object.values(env.reg.templates));
    expect(components.size).toBe(1);
    expect(env.reg.styles).toEqual([`${ORIGIN}/admin/live.css`]);
    expect(fs.existsSync(path.join(ROOT, "public/admin/preview-templates.js"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "public/admin/live.css"))).toBe(true);
  });

  it("sets BobalabLive without a DOM and without Decap (the API exists, nothing is registered)", () => {
    const env = boot();
    for (const k of [
      "current",
      "whenReady",
      "checkSave",
      "parse",
      "viewTarget",
      "formatIssue",
      "openHistory",
      "restoreVersion",
      "mergeLatest",
      "_buildRestorePatch",
      "_merge3",
    ])
      expect(typeof (env.live as unknown as Record<string, unknown>)[k], k).toBe("function");
  });

  it("cms-a11y.js names Decap's frame 'Live preview and history'", () => {
    const src = fs.readFileSync(path.join(ROOT, "public/admin/cms-a11y.js"), "utf8");
    expect(src).toContain('"Live preview and history"');
    expect(src).not.toContain("Preview of this entry");
  });
});

describe("PAGE_MAP (spec §2.5)", () => {
  it("lists the page tabs per entry, the first being the default", () => {
    const { live } = boot();
    const map = live.PAGE_MAP;
    const pages = (k: string) => map[k]!.map((t) => `${t.page}:${t.label}`);
    expect(pages("news")).toEqual(["news-item:Article", "news:News list", "home:Home page"]);
    expect(pages("publications")).toEqual([
      "publication:Paper page",
      "publications:Publications list",
      "home:Home page",
      "research:Research page",
    ]);
    expect(pages("people")).toEqual([
      "person:Profile page",
      "people:People page",
      "home:Home page",
    ]);
    expect(pages("directions")).toEqual([
      "direction:Direction page",
      "home:Home page",
      "research:Research page",
    ]);
    expect(pages("projects")).toEqual([
      "project:Project page",
      "projects:Projects list",
      "research:Research page",
    ]);
    expect(pages("opportunities")).toEqual(["join:Join page", "research:Research page"]);
    expect(pages("pages/home")).toEqual(["home:Home page", "about:About page"]);
    for (const p of ["join", "about", "accessibility", "privacy"])
      expect(map[`pages/${p}`]!.map((t) => t.page)).toEqual([p]);
    expect(pages("settings")).toEqual([
      "home:Home page",
      "people:People page",
      "research:Research page",
      "about:About page",
    ]);
  });

  it("people get the Profile page tab only with role PI or Profile page on", () => {
    const { live } = boot();
    const tabs = (d: Record<string, unknown>) =>
      (
        live._tabsFor("people" as never, "jane-doe" as never, d as never) as Array<{
          page: string;
          target: { page: string; slug?: string };
        }>
      ).map((t) => t.page);
    expect(tabs({ role: "phd" })).toEqual(["people", "home"]);
    expect(tabs({ role: "phd", profile_page: true })).toEqual(["person", "people", "home"]);
    expect(tabs({ role: "pi" })).toEqual(["person", "people", "home"]);
    const own = (
      live._tabsFor("news" as never, "x" as never, {} as never) as Array<{
        target: unknown;
      }>
    )[0]!;
    expect(own.target).toEqual({ page: "news-item", slug: "x" });
  });

  it("recomputes the tabs on every change: turning Profile page off moves the preview to the People page", async () => {
    const env = boot();
    const fields = PEOPLE_FIELDS;
    env.state.editor = {
      collection: "people",
      slug: "jane-doe",
      data: {},
      fields,
    };
    const person = (d: Record<string, unknown>) =>
      decapEntry("people", "jane-doe", { name: "Jane Doe", role: "phd", listed: true, ...d });
    const col = env.mount(person({ profile_page: true }));
    ready(env);
    await flush();
    expect(env.last("bobalab:navigate")).toMatchObject({
      target: { page: "person", slug: "jane-doe" },
    });
    col.update({ entry: person({ profile_page: false }) });
    await env.clock.advance(200);
    expect(env.last("bobalab:navigate")).toMatchObject({ target: { page: "people" } });
    const tabs = findAll(
      col.inst.tree,
      (n) => n.props.role === "tab" && n.props.className === "bl-live__page",
    );
    expect(tabs.map(textOf)).toEqual(["People page", "Home page"]);
  });
});

describe("viewTarget mirrors hasLivePage (validate.ts)", () => {
  const cases: Array<[CollectionName, Record<string, unknown>]> = [
    ["news", { draft: false }],
    ["news", { draft: true }],
    ["publications", {}],
    ["publications", { draft: true }],
    ["directions", {}],
    ["directions", { draft: true }],
    ["projects", {}],
    ["projects", { draft: true }],
    ["people", { listed: true, role: "pi" }],
    ["people", { listed: true, role: "phd", profile_page: true }],
    ["people", { listed: true, role: "phd" }],
    ["people", { listed: false, role: "pi" }],
    ["people", { listed: true, role: "pi", draft: true }],
    ["opportunities", {}],
    ["opportunities", { draft: true }],
  ];
  it.each(cases)("%s %j", (c, d) => {
    const { live } = boot();
    const entry = {
      draft: false,
      listed: false,
      profile_page: false,
      ...d,
    } as unknown as EntryMap[typeof c];
    const v = live.viewTarget(c as never, "some-slug" as never, d as never) as {
      state: string;
      path?: string;
      label?: string;
      reason?: string;
    };
    if (hasLivePage(c, entry)) {
      expect(v.state).toBe("live");
      expect(v.path).toMatch(/\/some-slug\/$/);
    } else expect(v.state).not.toBe("live");
    if (d.draft) expect(v).toEqual({ state: "hidden", reason: "draft" });
    if (c === "people" && !d.draft && d.listed === false)
      expect(v).toEqual({ state: "hidden", reason: "unlisted" });
    if (c === "people" && d.listed && !d.draft && d.role !== "pi" && !d.profile_page)
      expect(v).toEqual({ state: "elsewhere", path: "/people/", label: "People page" });
    if (c === "opportunities" && !d.draft)
      expect(v).toEqual({ state: "elsewhere", path: "/join/", label: "Join page" });
  });

  it("pages and settings", () => {
    const { live } = boot();
    expect(live.viewTarget("pages" as never, "home" as never, {} as never)).toEqual({
      state: "live",
      path: "/",
    });
    expect(live.viewTarget("pages" as never, "join" as never, {} as never)).toEqual({
      state: "live",
      path: "/join/",
    });
    expect(live.viewTarget("settings" as never, "site" as never, {} as never)).toEqual({
      state: "elsewhere",
      path: "/",
      label: "Home page",
    });
    expect(live.viewTarget("news" as never, "x" as never, {} as never)).toEqual({
      state: "live",
      path: "/news/x/",
    });
  });
});

describe("the overlay message (spec §2.2, §2.3)", () => {
  it("an existing entry: its slug, isNew false and the form's data as plain JS", () => {
    const { live } = boot();
    const msg = live._overlayMessage(news({ draft: true }) as never, 7 as never);
    expect(msg).toEqual({
      type: "bobalab:overlay",
      v: 1,
      rev: 7,
      entry: { collection: "news", slug: "2026-10-07-informs-talk" },
      isNew: false,
      data: { date: "2026-10-07", type: "talk", title: "INFORMS talk", draft: true },
    });
  });

  it("a new entry: the address cms-hooks predicts, from IMMUTABLE data; 'new-<collection>' until it can", () => {
    const env = boot();
    const hooks = env.win.BobalabCmsHooks as { expectedSlug: (...a: unknown[]) => unknown };
    const real = hooks.expectedSlug;
    const seen: unknown[] = [];
    hooks.expectedSlug = (...a: unknown[]) => {
      seen.push(a[1]);
      return real(...a);
    };
    const e = decapEntry(
      "news",
      "",
      { date: "2026-10-26", type: "talk", title: "INFORMS annual meeting" },
      { newRecord: true },
    );
    const msg = env.live._overlayMessage(e as never, 1 as never) as {
      entry: { slug: string };
      isNew: boolean;
    };
    expect(msg.isNew).toBe(true);
    expect(msg.entry.slug).toBe("2026-10-26-informs-annual-meeting");
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(FakeMap); // Immutable (cms-hooks uses data.getIn)
    // An empty form can't be predicted yet.
    const empty = decapEntry("publications", "", {}, { newRecord: true });
    const m2 = env.live._overlayMessage(empty as never, 2 as never) as { entry: { slug: string } };
    expect(m2.entry.slug).toBe("new-publications");
  });
});

describe("unsaved uploads become data URLs (spec §2.8)", () => {
  const file = (name: string, size: number, type = "image/png") => ({
    name,
    size,
    type,
    body: name,
  });
  const media = (items: Array<Record<string, unknown>>) =>
    new FakeList(items.map((i) => new FakeMap(Object.entries(i))));

  it("only draft raster files of at most 10 MB, keyed by their public path", () => {
    const { live } = boot();
    const list = media([
      { id: "a", draft: true, path: "public/uploads/people/x.png", file: file("x.png", 2000) },
      { id: "b", draft: false, path: "public/uploads/saved.jpg", file: file("saved.jpg", 10) },
      {
        id: "c",
        draft: true,
        path: "public/uploads/cv.pdf",
        file: file("cv.pdf", 10, "application/pdf"),
      },
      {
        id: "d",
        draft: true,
        path: "public/uploads/big.png",
        file: file("big.png", 11 * 1024 * 1024),
      },
      { id: "e", draft: true, path: "public/uploads/nofile.png" },
      { id: "f", draft: true, path: "public/uploads/photo.HEIC", file: file("photo.HEIC", 10) },
    ]);
    const c = live._assetCandidates(list as never) as Array<{ id: string; key: string }>;
    expect(c.map((x) => [x.id, x.key])).toEqual([["a", "/uploads/people/x.png"]]);
    expect(live._publicPathOf("public/uploads/a b.jpg" as never)).toBe("/uploads/a b.jpg");
  });

  it("posts `assets` as soon as a file is read, without typing, and never calls getAsset", async () => {
    const env = boot();
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    let getAssetCalls = 0;
    const col = env.mount(news({}, "x"), {
      getAsset: () => {
        getAssetCalls += 1;
        return "empty.svg";
      },
    });
    ready(env);
    await flush();
    expect(env.last("bobalab:assets")).toEqual({ type: "bobalab:assets", v: 1, assets: {} });
    const withUpload = decapEntry(
      "news",
      "x",
      { title: "x", image: { image: "/uploads/x.png", alt: "A" } },
      {
        mediaFiles: media([
          { id: "m1", draft: true, path: "public/uploads/x.png", file: file("x.png", 100) },
        ]),
      },
    );
    col.update({ entry: withUpload });
    await flush();
    const a = env.last("bobalab:assets") as { assets: Record<string, string> };
    expect(Object.keys(a.assets)).toEqual(["/uploads/x.png"]);
    expect(a.assets["/uploads/x.png"]).toMatch(/^data:image\/png;base64,/);
    expect(getAssetCalls).toBe(0);
    // Removing the upload removes it from the map.
    col.update({ entry: news({}, "x") });
    await flush();
    expect((env.last("bobalab:assets") as { assets: object }).assets).toEqual({});
  });
});

describe("device scaling (spec §2.6)", () => {
  it("Desktop renders 1024–1440 px wide scaled to fit; Phone 390 px at most at scale 1; 0 changes nothing", () => {
    const { live } = boot();
    const box = (W: number, H: number, d: string) =>
      live._deviceBox(W as never, H as never, d as never) as {
        width: number;
        height: number;
        scale: number;
        left: number;
      } | null;
    expect(box(0, 700, "desktop")).toBeNull();
    expect(box(800, 0, "phone")).toBeNull();
    expect(box(800, 600, "desktop")).toMatchObject({ width: 1024, scale: 800 / 1024, left: 0 });
    expect(box(800, 600, "desktop")!.height).toBeCloseTo(600 / (800 / 1024));
    expect(box(1200, 600, "desktop")).toMatchObject({ width: 1200, scale: 1, height: 600 });
    expect(box(2000, 600, "desktop")).toMatchObject({ width: 1440, scale: 2000 / 1440 });
    expect(box(300, 600, "phone")).toMatchObject({ width: 390, scale: 300 / 390, left: 0 });
    expect(box(500, 600, "phone")).toMatchObject({ width: 390, scale: 1, height: 600, left: 55 });
    expect(live._effectiveDevice(null as never, 900 as never)).toBe("desktop");
    expect(live._effectiveDevice(null as never, 760 as never)).toBe("desktop");
    expect(live._effectiveDevice(null as never, 759 as never)).toBe("phone");
    expect(live._effectiveDevice("desktop" as never, 390 as never)).toBe("desktop");
    expect(live._effectiveDevice(null as never, 0 as never)).toBe("desktop");
  });

  it("the site frame is scaled on mount, and an explicit choice is kept in localStorage", async () => {
    const env = boot();
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"));
    expect(col.frame!.style).toMatchObject({ width: "1024px", transform: `scale(${900 / 1024})` });
    button(col.inst.tree, "Phone")!.props.onClick!.call(null);
    expect(env.local.getItem("bobalab.live.device")).toBe("phone");
    expect(col.frame!.style).toMatchObject({
      width: "390px",
      transform: "scale(1)",
      left: "255px",
    });
    expect(button(col.inst.tree, "Phone")!.props["aria-pressed"]).toBe("true");
    expect(button(col.inst.tree, "Desktop")!.props["aria-pressed"]).toBe("false");
  });
});

describe("shouldComponentUpdate (spec §2.6 render cost)", () => {
  it("is true only when the entry, fieldsMetaData or the column's own state changed", () => {
    const { live } = boot();
    const su = live._shouldUpdate as (a: unknown, b: unknown, c: unknown, d: unknown) => boolean;
    const e = news();
    const m = new FakeMap([]);
    const s = { n: 0 };
    const p = { entry: e, fieldsMetaData: m, other: 1 };
    expect(su(p, s, { ...p, other: 2 }, s)).toBe(false); // another store change
    expect(su(p, s, { ...p, entry: news({ title: "x" }) }, s)).toBe(true);
    expect(su(p, s, { ...p, fieldsMetaData: new FakeMap([]) }, s)).toBe(true);
    expect(su(p, s, p, { n: 1 })).toBe(true);
  });
});

describe("the bridge to the preview (spec §2.4)", () => {
  it("creates the site frame once, at ../editor-preview/, and never re-creates it", async () => {
    const env = boot();
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"));
    expect(col.clip.children).toHaveLength(1);
    expect(col.frame!.className).toBe("bl-live__site");
    expect(col.frame!.src).toBe(`${ORIGIN}/editor-preview/`);
    col.update({ entry: news({ title: "Changed" }, "x") });
    col.update({ entry: news({ title: "Changed again" }, "x") });
    expect(col.clip.children).toHaveLength(1);
  });

  it("accepts only messages from the site frame, on this origin", async () => {
    const env = boot();
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({}, "x"));
    env.send({ type: "bobalab:ready", v: 1 }, { origin: "https://evil.example" });
    env.send({ type: "bobalab:ready", v: 1 }, { source: {} });
    env.send({ type: "bobalab:ready", v: 2 });
    await flush();
    expect(env.posted).toHaveLength(0);
    env.send({ type: "bobalab:ready", v: 1 });
    await flush();
    expect(env.posted.length).toBeGreaterThan(0);
    expect(env.posted.every((p) => p.origin === ORIGIN)).toBe(true);
  });

  it("on every `ready`: mode, then loading or base, assets, overlay and navigate, in that order", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({}, "x"), { getCollection: () => new Promise(() => {}) }); // still loading
    ready(env);
    await flush();
    expect(env.types()).toEqual([
      "bobalab:mode",
      "bobalab:loading",
      "bobalab:assets",
      "bobalab:overlay",
      "bobalab:navigate",
    ]);
    expect(env.posted[0]!.msg).toEqual({ type: "bobalab:mode", v: 1, visitor: false });
    expect(env.posted[4]!.msg).toEqual({
      type: "bobalab:navigate",
      v: 1,
      target: { page: "news-item", slug: "x" },
    });
    // A reload or hot update of the preview: all of it again.
    env.posted.length = 0;
    ready(env);
    await flush();
    expect(env.types()).toEqual([
      "bobalab:mode",
      "bobalab:loading",
      "bobalab:assets",
      "bobalab:overlay",
      "bobalab:navigate",
    ]);
  });

  it("posts the overlay at once, then at most once per 120 ms (trailing), with rev++", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush();
    env.posted.length = 0;
    col.update({ entry: news({ title: "a" }, "x") });
    col.update({ entry: news({ title: "ab" }, "x") });
    col.update({ entry: news({ title: "abc" }, "x") });
    const overlays = () => env.posted.filter((p) => p.msg.type === "bobalab:overlay");
    expect(overlays().map((p) => (p.msg.data as { title: string }).title)).toEqual(["a"]);
    await env.clock.advance(119);
    expect(overlays()).toHaveLength(1);
    await env.clock.advance(1);
    expect(overlays().map((p) => (p.msg.data as { title: string }).title)).toEqual(["a", "abc"]);
    const revs = overlays().map((p) => p.msg.rev as number);
    expect(revs[1]).toBeGreaterThan(revs[0]!);
    await env.clock.advance(500);
    expect(overlays()).toHaveLength(2);
  });

  it("`rendered` fills the bar's bands; a repeat of the same rev updates the problems", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush();
    const rev = (env.last("bobalab:overlay") as { rev: number }).rev;
    const rendered = (problems: Record<string, unknown>) =>
      env.send({
        type: "bobalab:rendered",
        v: 1,
        rev,
        target: { page: "news-item", slug: "x" },
        path: "/news/x/",
        title: "x",
        found: "page",
        problems: { available: true, blocking: [], warnings: [], stillNeeded: [], ...problems },
      });
    rendered({});
    expect(textOf(col.inst.tree)).not.toContain("The site check would stop this save");
    rendered({
      blocking: [
        {
          code: "E_HTTP_URL",
          file: "news/x.md",
          field: "link.url",
          message: "URL must use https: http://a",
        },
      ],
      stillNeeded: [
        { code: "E_SCHEMA", file: "news/x.md", field: "title", message: "Invalid input" },
      ],
    });
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "The site check would stop this save: News item “INFORMS talk” › Link › Address: A web address must start with https://, not http://. Save is blocked until this is fixed.",
    );
    expect(text).toContain("Still needed before Save: Title.");
  });

  it("a link click in the preview adds 'Other page' and 'Back to Article'; Ctrl+S in the preview saves", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush();
    env.send({ type: "bobalab:navigated", v: 1, target: { page: "research" }, path: "/research/" });
    const tabs = findAll(col.inst.tree, (n) => n.props.className === "bl-live__page").map(textOf);
    expect(tabs).toEqual(["Article", "News list", "Home page", "Other page: /research/"]);
    const back = button(col.inst.tree, "Back to Article")!;
    back.props.onClick!.call(null);
    expect(env.last("bobalab:navigate")).toMatchObject({
      target: { page: "news-item", slug: "x" },
    });
    expect(button(col.inst.tree, "Back to Article")).toBeUndefined();
    env.send({ type: "bobalab:key", v: 1, key: "save" });
    await flush();
    expect(env.state.saves).toBe(1);
  });
});

describe("services: check, parse, whenReady (Interfaces §7)", () => {
  it("checkSave posts exactly the given data after flushing the overlay, and resolves on `checked`", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush();
    col.update({ entry: news({ title: "a" }, "x") });
    col.update({ entry: news({ title: "ab" }, "x") }); // pending in the debounce
    env.posted.length = 0;
    env.preview.checkAnswer = () => ({
      available: true,
      blocking: [{ code: "E_DUP_TITLE", file: "publications/y.md", field: "title", message: "m" }],
      warnings: [],
    });
    const data = { title: "Saved data", date: "2026-10-07", type: "talk" };
    const r = await env.live.checkSave({
      entry: { collection: "news", slug: "x" },
      isNew: false,
      data,
    } as never);
    expect(env.types()).toEqual(["bobalab:overlay", "bobalab:check"]);
    expect(env.last("bobalab:check")).toMatchObject({
      entry: { collection: "news", slug: "x" },
      isNew: false,
      data,
    });
    expect(r).toEqual({
      available: true,
      blocking: [{ code: "E_DUP_TITLE", file: "publications/y.md", field: "title", message: "m" }],
      warnings: [],
    });
  });

  it("checkSave is unavailable at once without a live column, and after the timeout without an answer", async () => {
    const env = boot();
    expect(
      await env.live.checkSave({ entry: { collection: "news", slug: "x" }, data: {} } as never),
    ).toEqual({
      available: false,
      blocking: [],
      warnings: [],
    });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({}, "x"));
    ready(env);
    const p = env.live.checkSave({
      entry: { collection: "news", slug: null },
      isNew: true,
      data: {},
      timeoutMs: 4000,
    } as never) as Promise<unknown>;
    await flush();
    // A null slug of a new entry is posted as "" (the preview renders "new-<collection>").
    expect(env.last("bobalab:check")).toMatchObject({
      entry: { collection: "news", slug: "" },
      isNew: true,
    });
    await env.clock.advance(4000);
    expect(await p).toEqual({ available: false, blocking: [], warnings: [] });
  });

  it("parse is a round trip through the preview; it rejects in plain words after 5 s", async () => {
    const env = boot();
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({}, "x"));
    ready(env);
    const data = await env.live.parse(
      "content/news/x.md" as never,
      "---\ntitle: Old\ndate: 2026-10-01\n---\nBody text\n" as never,
    );
    expect(data).toEqual({ title: "Old", date: "2026-10-01", body: "Body text" });
    await expect(env.live.parse("content/nope.txt" as never, "x" as never)).rejects.toThrow(
      /can't be read/,
    );
    env.preview.autoParse = false;
    const late = (
      env.live.parse("content/news/x.md" as never, "---\na: 1\n---\n" as never) as Promise<unknown>
    ).catch((e: Error) => e.message);
    await env.clock.advance(5000);
    expect(await late).toMatch(/The live preview didn't answer/);
  });

  it("whenReady resolves once the preview is up and has the saved site; false after the timeout", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const early = env.live.whenReady(1000) as Promise<boolean>;
    await env.clock.advance(1000);
    expect(await early).toBe(false);
    env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    const p = env.live.whenReady(10_000) as Promise<boolean>;
    await flush();
    ready(env);
    await flush();
    expect(await p).toBe(true);
    expect(env.types()).toContain("bobalab:base");
  });

  it("current() follows the editor: the repository path the dock uses, null for a new entry", () => {
    const env = boot();
    env.state.editor = {
      collection: "people",
      slug: "isabelle-cho",
      data: {},
      fields: PEOPLE_FIELDS,
    };
    expect(env.live.current()).toEqual({
      collection: "people",
      slug: "isabelle-cho",
      path: "content/people/isabelle-cho.md",
      isNew: false,
    });
    env.state.editor = { collection: "settings", slug: "site", data: {}, fields: [] };
    expect((env.live.current() as { path: string }).path).toBe("content/site.yml");
    env.state.editor = { collection: "news", slug: null, newRecord: true, data: {}, fields: [] };
    expect(env.live.current()).toEqual({ collection: "news", slug: null, path: null, isNew: true });
  });
});

describe("the saved site (spec §2.2 base loader)", () => {
  it("reads the 8 collections two at a time, in order, posting progress, then `base`", async () => {
    const env = boot({ mode: "local" });
    const log: string[] = [];
    const inFlight = { now: 0, max: 0 };
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({}, "x"), { getCollection: siteLoader(SITE, { log, inFlight }) });
    ready(env);
    await flush(60);
    expect(log).toEqual([
      "pages",
      "settings",
      "people",
      "directions",
      "projects",
      "publications",
      "news",
      "opportunities",
    ]);
    expect(inFlight.max).toBe(2);
    const loading = env.posted
      .filter((p) => p.msg.type === "bobalab:loading")
      .map((p) => p.msg.done);
    expect(loading.length).toBeGreaterThanOrEqual(8);
    expect(loading.slice(-8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const base = env.last("bobalab:base") as {
      base: Record<string, Array<{ slug: string }>>;
      complete: boolean;
      publishedSlugs: unknown;
    };
    expect(base.complete).toBe(true);
    expect(base.publishedSlugs).toBeNull();
    expect(base.base.people!.map((e) => e.slug)).toEqual(["isabelle-cho"]);
    expect(Object.keys(base.base).sort()).toEqual([
      "directions",
      "news",
      "opportunities",
      "pages",
      "people",
      "projects",
      "publications",
      "settings",
    ]);
    // The local demo makes no GitHub request for the base.
    expect(env.state.github).toEqual([]);
  });

  it("github mode: complete only when every folder count and configured file matches main", async () => {
    const trees: Record<string, string[]> = {
      "content/people": ["isabelle-cho.md"],
      "content/publications": ["allon-2023-gig-drivers.md"],
      "content/news": ["2026-10-07-informs-talk.md"],
      "content/directions": [],
      "content/projects": [],
      "content/opportunities": [],
      "content/pages": ["home.yml"],
      content: ["site.yml", "README.md"],
    };
    const github = (p: string) => {
      const m = /git\/trees\/main:(.+)$/.exec(p);
      if (m)
        return { data: { tree: (trees[m[1]!] ?? []).map((path) => ({ path, type: "blob" })) } };
      if (p.includes("contents/content/.published-slugs.json"))
        return { data: JSON.stringify({ people: ["isabelle-cho"] }) };
      return { status: 404 };
    };
    const env = boot({ github });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush(80);
    let base = env.last("bobalab:base") as { complete: boolean; publishedSlugs: unknown };
    expect(base.complete).toBe(true);
    expect(base.publishedSlugs).toEqual({ people: ["isabelle-cho"] });
    expect(env.state.github.some((p) => p.endsWith("git/trees/main:content/people"))).toBe(true);
    // A file on main that Decap did not return (its read failed silently): incomplete.
    trees["content/people"]!.push("park-sinchaisri.md");
    (env.live._base as { stale: boolean }).stale = true;
    await (env.live._loadBase as () => Promise<boolean>)();
    await flush(40);
    base = env.last("bobalab:base") as { complete: boolean; publishedSlugs: unknown };
    expect(base.complete).toBe(false);
  });

  it("a failed collection read means complete: false, and the bar says so with [Try again]", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), {
      getCollection: siteLoader(SITE, { fail: ["projects"] }),
    });
    ready(env);
    await flush(60);
    expect((env.last("bobalab:base") as { complete: boolean }).complete).toBe(false);
    expect(textOf(col.inst.tree)).toContain(
      "Some entries couldn't be loaded, so the preview may be missing them and the site check is off.",
    );
    expect(button(col.inst.tree, "Try again")).toBeDefined();
  });

  it("is kept for the tab session and marked stale after every Save (reloaded 2 s later)", async () => {
    const env = boot({ mode: "local" });
    const log: string[] = [];
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE, { log }) });
    ready(env);
    await flush(60);
    expect(log).toHaveLength(8);
    col.unmount();
    const col2 = env.mount(news({}, "x"), { getCollection: siteLoader(SITE, { log }) });
    await flush(60);
    expect(log).toHaveLength(8); // the cache is module-level
    env.finishSave(true, "content/news/x.md");
    expect((env.live._base as { stale: boolean }).stale).toBe(true);
    await env.clock.advance(2000);
    await flush(60);
    expect(log).toHaveLength(16);
    col2.unmount();
  });
});

describe("the site check's problems in plain words (spec §3.6e)", () => {
  it("ISSUE_TEXT covers every error code of the validator, the link and copy rules, and the schema check", () => {
    const { live } = boot();
    const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const codes = new Set<string>();
    for (const m of read("src/lib/content/validate.ts").matchAll(/\berr\(\s*"(E_[A-Z_]+)"/g))
      codes.add(m[1]!);
    for (const m of read("src/lib/content/links.ts").matchAll(/code: "(E_[A-Z_]+)"/g))
      codes.add(m[1]!);
    for (const m of read("src/lib/content/parse.ts").matchAll(/code: "(E_[A-Z_]+)"/g))
      codes.add(m[1]!);
    for (const m of read("src/lib/content/copy-rules.ts").matchAll(/\berr\(\s*"(E_[A-Z_]+)"/g))
      codes.add(m[1]!);
    for (const m of read("src/lib/preview/overlay.ts").matchAll(/code: "(E_[A-Z_]+)"/g))
      codes.add(m[1]!);
    expect(codes.size).toBeGreaterThan(20);
    for (const c of ["E_LINK_HIDDEN", "E_SCHEMA", "E_HERO_LONG", "E_DUP_TITLE"])
      expect(codes).toContain(c);
    const missing = [...codes].filter((c) => !(c in live.ISSUE_TEXT));
    expect(missing).toEqual([]);
    expect(live.ISSUE_TEXT).toHaveProperty("W_PUBLISHED_HIDDEN");
  });

  it("names the entry and the field: form labels for the edited entry, saved titles for other files", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    env.mount(news({ title: "My talk" }, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush(60);
    const f = (i: Record<string, unknown>) => env.live.formatIssue(i as never);
    expect(
      f({
        code: "E_SCHEMA",
        file: "news/x.md",
        field: "title",
        message: "Invalid input: expected string, received undefined",
      }),
    ).toBe("News item “My talk” › Title: This needs a value");
    expect(f({ code: "E_ALT_MISSING", file: "news/x.md", field: "image.alt", message: "…" })).toBe(
      "News item “My talk” › Image › Alt text: The image needs alt text: describe in a sentence what it shows",
    );
    expect(
      f({
        code: "E_DUP_TITLE",
        file: "publications/new-pub.md",
        field: "title",
        message: "title duplicates publications/allon-2023-gig-drivers.md",
      }),
    ).toBe(
      "Publication “new-pub” › Title: Publication “Gig drivers” already has this title; two publications can't share a title",
    );
    expect(
      f({
        code: "E_LINK_HIDDEN",
        file: "news/2026-10-07-informs-talk.md",
        field: "body",
        message:
          "This links to /people/isabelle-cho/, which is not a page on the live site. Link to /people/ instead, or remove the link.",
      }),
    ).toBe(
      "News item “INFORMS talk” › Body: This links to /people/isabelle-cho/, which is not a page on the live site. Link to /people/ instead, or remove the link.",
    );
    expect(f({ code: "E_COLOR_DUP", file: "site.yml", field: "launched", message: "…" })).toMatch(
      /^Settings › Launched: Another research direction already has this colour/,
    );
    expect(f({ code: "E_WHO_KNOWS", file: "", message: "a raw message" })).toBe("A raw message");
  });
});

describe("the bar's information bands", () => {
  it("draft, unlisted and the consent summary; W_PUBLISHED_HIDDEN from the check's warnings", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "people", slug: "jane-doe", data: {}, fields: PEOPLE_FIELDS };
    const person = (d: Record<string, unknown>) =>
      decapEntry("people", "jane-doe", { name: "Jane Doe", role: "phd", ...d });
    const col = env.mount(person({ listed: false }), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush(60);
    expect(textOf(col.inst.tree)).toContain(
      "Not listed: the site never shows or links this person, not even on the People page.",
    );
    col.update({
      entry: person({
        listed: true,
        draft: true,
        photo: "/uploads/p.jpg",
        photo_consent: true,
        program: "PhD",
        email: "j@x.edu",
        email_public: false,
      }),
    });
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "Hidden from the live site: “Draft · pending lab review” is on. Shown here so you can check it.",
    );
    expect(text).toContain("Shown: photo, program. Hidden: email (Email public is off).");
    const rev = (env.last("bobalab:overlay") as { rev: number } | undefined)?.rev ?? 1;
    env.send({
      type: "bobalab:rendered",
      v: 1,
      rev: rev + 10,
      target: { page: "people" },
      path: "/people/",
      title: "People",
      found: "marker",
      problems: {
        available: true,
        blocking: [],
        warnings: [
          { code: "W_PUBLISHED_HIDDEN", file: "people/jane-doe.md", field: "draft", message: "…" },
        ],
        stillNeeded: [],
      },
    });
    expect(textOf(col.inst.tree)).toContain(
      "This page was on the live site. After this save, people who open its address get “Page not found”.",
    );
  });

  it("a blocking problem in another file offers to open that entry", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "projects", slug: "p", data: {}, fields: [] };
    const col = env.mount(decapEntry("projects", "p", { title: "P", draft: true }), {
      getCollection: siteLoader(SITE),
    });
    ready(env);
    await flush(60);
    env.send({
      type: "bobalab:rendered",
      v: 1,
      rev: 99,
      target: { page: "project", slug: "p" },
      path: "/projects/p/",
      title: "P",
      found: "page",
      problems: {
        available: true,
        blocking: [
          {
            code: "E_LINK_HIDDEN",
            file: "news/2026-10-07-informs-talk.md",
            field: "body",
            message:
              "This links to /projects/p/, which is not a page on the live site. Link to /projects/ instead, or remove the link.",
          },
        ],
        warnings: [],
        stillNeeded: [],
      },
    });
    const open = button(col.inst.tree, "Open News item “INFORMS talk”")!;
    expect(open).toBeDefined();
    open.props.onClick!.call(null);
    expect(env.location.hash).toBe("#/collections/news/entries/2026-10-07-informs-talk");
  });

  it("the page tabs are a tablist with manual activation; the address names the page and the version", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = {
      collection: "news",
      slug: "x",
      data: {},
      fields: NEWS_FIELDS,
      hasChanged: true,
    };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    const lists = findAll(col.inst.tree, (n) => n.props.role === "tablist");
    expect(lists.map((n) => n.props["aria-label"])).toEqual(["Right column", "Page"]);
    const sel = findAll(
      col.inst.tree,
      (n) => n.props.role === "tab" && n.props["aria-selected"] === "true",
    );
    expect(sel.map(textOf)).toEqual(["Live preview", "Article"]);
    expect(sel.every((n) => n.props.tabIndex === 0)).toBe(true);
    const addr = findAll(col.inst.tree, (n) => n.props.className === "bl-live__address")[0] as Node;
    expect(textOf(addr)).toBe("localhost:3100/news/x/ · your unsaved changes");
    button(col.inst.tree, "News list")!.props.onClick!.call(null);
    const addr2 = findAll(
      col.inst.tree,
      (n) => n.props.className === "bl-live__address",
    )[0] as Node;
    expect(textOf(addr2)).toBe("localhost:3100/news/ · your unsaved changes");
    // No <a href> for navigation inside Decap's frame (its <base target="_blank">).
    expect(findAll(col.inst.tree, (n) => n.type === "a")).toEqual([]);
  });

  it("a new entry's address line says what the address will be, and that it can't change", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = {
      collection: "news",
      slug: null,
      newRecord: true,
      data: {},
      fields: NEWS_FIELDS,
    };
    const e = decapEntry(
      "news",
      "",
      { date: "2026-10-26", type: "talk", title: "INFORMS annual meeting" },
      { newRecord: true },
    );
    const col = env.mount(e, { getCollection: siteLoader(SITE) });
    const addr = findAll(col.inst.tree, (n) =>
      String(n.props.className).startsWith("bl-live__address"),
    )[0]!;
    expect(textOf(addr)).toBe(
      "New page · address after the first save: localhost:3100/news/2026-10-26-informs-annual-meeting/ · it can't be changed later",
    );
    const pub = button(col.inst.tree, "Not on the live site yet")!;
    expect(pub.props.disabled).toBe(true);
  });
});

describe("no code path writes to GitHub (spec D5)", () => {
  it("cms-live.js has no fetch, no XHR and no write method; it reads GitHub only through BobalabGitHub/BobalabHistory", () => {
    const src = fs.readFileSync(path.join(ROOT, "public/admin/cms-live.js"), "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket/);
    expect(src).not.toMatch(/["'](POST|PUT|PATCH|DELETE)["']/);
    expect(src).not.toMatch(/api\.github\.com/);
    // Its only GitHub request is BobalabGitHub.get (which refuses anything but GET);
    // the rest are read-only names (repo, branch, encodePath).
    const calls = [...src.matchAll(/\bg\.(\w+)\(/g)].map((m) => m[1]);
    expect([...new Set(calls)].sort()).toEqual(["branch", "encodePath", "get", "repo"]);
  });

  it("a History session makes GET reads only", async () => {
    const env = boot({ github: () => ({ data: [] }) });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush(60);
    button(col.inst.tree, "History")!.props.onClick!();
    await flush(60);
    expect(env.state.github.length).toBeGreaterThan(0);
    // The fake records every call; BobalabGitHub.get is the only door, and it is GET-only.
    expect(env.state.github.every((p) => p.startsWith("/repos/bobalabx/bobalab-web/"))).toBe(true);
  });
});

describe("a research direction's colour (the earlier direction preview's note)", () => {
  it("says when the colour is taken, what it is easily confused with, and the colours in use", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "directions", slug: "new-one", data: {}, fields: [] };
    const directions = [
      {
        slug: "ai-at-work",
        data: { title: "AI at Work", short_label: "AI at Work", color: "butterfly-pea" },
      },
      {
        slug: "learning",
        data: { title: "Learning", short_label: "Learning", color: "black-sesame" },
      },
      { slug: "calm", data: { title: "Calm", short_label: "Calm", color: "jasmine" } },
      { slug: "old", data: { title: "Old", color: "matcha", status: "archived" } },
    ];
    const col = env.mount(
      decapEntry("directions", "new-one", { title: "New one", color: "butterfly-pea" }),
      {
        getCollection: siteLoader({ ...SITE, directions }),
      },
    );
    ready(env);
    await flush(60);
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "Colour taken. Butterfly pea is already the colour of “AI at Work”. Choose another colour: the CMS will not save this one.",
    );
    // Plain words, and only for a colour another direction uses now.
    expect(text).toContain(
      "Hard to tell apart from Jasmine (the colour of “Calm”) for some colour-blind readers. Choose another colour if you can.",
    );
    expect(text).not.toMatch(/ΔE|simulation|tritan|deutan|protan/);
    expect(text).toContain(
      "Colours of the other live directions: Butterfly pea (AI at Work), Black sesame (Learning), Jasmine (Calm).",
    );
    // Only while the colour is being chosen: an unchanged saved colour says nothing.
    expect(env.live._colourUse("ai-at-work", { color: "butterfly-pea" })).not.toContainEqual(
      expect.stringContaining("Hard to tell apart"),
    );
    expect(env.live._colourUse("ai-at-work", { color: "taro" })).toContainEqual(
      "Hard to tell apart from Black sesame (the colour of “Learning”) for some colour-blind readers. Choose another colour if you can.",
    );
    // Its own saved colour is not "taken" by itself; archived directions don't count.
    expect(env.live._colourUse("ai-at-work", { color: "butterfly-pea" })).not.toContainEqual(
      expect.stringContaining("Colour taken"),
    );
    expect(env.live._colourUse("x", { color: "matcha" })).not.toContainEqual(
      expect.stringContaining("Colour taken"),
    );
  });
});

describe("Show as visitors see it", () => {
  it("switches the preview to the visitor view, kept for the tab session", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({ draft: true }, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush(60);
    expect(textOf(col.inst.tree)).toContain("Shown here so you can check it.");
    const box = findAll(
      col.inst.tree,
      (n) => n.type === "input" && n.props.type === "checkbox",
    )[0]!;
    box.props.onChange!({ target: { checked: true } });
    expect(env.last("bobalab:mode")).toEqual({ type: "bobalab:mode", v: 1, visitor: true });
    expect(env.session.getItem("bobalab.live.visitor")).toBe("1");
    expect(textOf(col.inst.tree)).toContain(
      "Hidden from the live site: “Draft · pending lab review” is on.",
    );
    expect(textOf(col.inst.tree)).not.toContain("Shown here so you can check it.");
  });
});

describe("plain words and honest buttons (editor v2 verification fixes)", () => {
  it("a value in the wrong form says what to fix; a missing one is still needed, named down to the field", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const col = env.mount(news({}, "x"), { getCollection: siteLoader(SITE) });
    ready(env);
    await flush();
    const rev = (env.last("bobalab:overlay") as { rev: number }).rev;
    env.send({
      type: "bobalab:rendered",
      v: 1,
      rev,
      target: { page: "news-item", slug: "x" },
      path: "/news/x/",
      title: "x",
      found: "page",
      problems: {
        available: true,
        blocking: [],
        warnings: [],
        stillNeeded: [
          {
            code: "E_SCHEMA",
            file: "news/x.md",
            field: "link.url",
            message: "must be an https:// URL or a site path starting with /",
          },
          {
            code: "E_SCHEMA",
            file: "news/x.md",
            field: "link.label",
            message: "Invalid input: expected string, received undefined",
          },
          {
            code: "E_SCHEMA",
            file: "news/x.md",
            field: "title",
            message: "Too big: expected string to have <=160 characters",
          },
          { code: "E_SCHEMA", file: "news/x.md", field: "summary", message: "Invalid input" },
        ],
      },
    });
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "Fix before Save: Link › Address: use a full https:// address or a site path starting with /; Title: use at most 160 characters.",
    );
    expect(text).toContain("Still needed before Save: Link › Link text, Summary.");
    expect(text).not.toContain("Still needed before Save: Link.");
  });

  it("'Open the published page' is off for a tab whose page the SAVED entry doesn't have yet", async () => {
    const env = boot({ mode: "local" });
    const site = {
      ...SITE,
      people: [
        { slug: "alex-chen", data: { name: "Alex Chen", role: "phd", listed: true } },
        {
          slug: "dana-lee",
          data: { name: "Dana Lee", role: "phd", listed: true, profile_page: true },
        },
      ],
    };
    env.state.editor = { collection: "people", slug: "alex-chen", data: {}, fields: PEOPLE_FIELDS };
    // Profile page turned on in the form, not saved: the tab shows, the page is not live.
    const col = env.mount(
      decapEntry("people", "alex-chen", {
        name: "Alex Chen",
        role: "phd",
        listed: true,
        profile_page: true,
      }),
      { getCollection: siteLoader(site) },
    );
    ready(env);
    await flush(60);
    const sel = findAll(
      col.inst.tree,
      (n) => n.props.role === "tab" && n.props["aria-selected"] === "true",
    ).map(textOf);
    expect(sel).toContain("Profile page");
    const off = button(col.inst.tree, "Not on the live site yet")!;
    expect(off.props.disabled).toBe(true);
    expect(button(col.inst.tree, /Open the published page/)).toBeUndefined();
    // The People page tab is on the live site: enabled.
    button(col.inst.tree, "People page")!.props.onClick!.call(null);
    expect(button(col.inst.tree, /Open the published page \(People page\)/)).toBeDefined();
    // A saved profile page is enabled on its own tab.
    const env2 = boot({ mode: "local" });
    env2.state.editor = { collection: "people", slug: "dana-lee", data: {}, fields: PEOPLE_FIELDS };
    const col2 = env2.mount(
      decapEntry("people", "dana-lee", {
        name: "Dana Lee",
        role: "phd",
        listed: true,
        profile_page: true,
      }),
      { getCollection: siteLoader(site) },
    );
    ready(env2);
    await flush(60);
    expect(button(col2.inst.tree, /Open the published page \(Profile page\)/)).toBeDefined();
    expect(button(col2.inst.tree, "Not on the live site yet")).toBeUndefined();
  });

  it("people are named by their name, not their position title", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = { collection: "news", slug: "x", data: {}, fields: NEWS_FIELDS };
    const site = {
      ...SITE,
      people: [
        {
          slug: "park-sinchaisri",
          data: {
            name: "Park Sinchaisri",
            title: "Assistant Professor of Operations and Information Technology Management",
            role: "pi",
            listed: true,
          },
        },
      ],
    };
    env.mount(news({ title: "My talk" }, "x"), { getCollection: siteLoader(site) });
    ready(env);
    await flush(60);
    const t = env.live.formatIssue({
      code: "E_ALT_MISSING",
      file: "people/park-sinchaisri.md",
      field: "photo_alt",
      message: "…",
    } as never);
    expect(t).toMatch(/^Person “Park Sinchaisri” › /);
    expect(t).not.toContain("Assistant Professor");
    expect(
      (env.live as unknown as { savedEntryName: (c: string, s: string) => string }).savedEntryName(
        "people",
        "park-sinchaisri",
      ),
    ).toBe("Person “Park Sinchaisri”");
  });

  it("a duplicate title is said from the edited publication's side, wherever the validator put it", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = {
      collection: "publications",
      slug: "new-pub",
      data: {},
      fields: [{ name: "title", label: "Title", widget: "string" }],
    };
    const col = env.mount(
      decapEntry("publications", "new-pub", { title: "Gig drivers", authors: [{ name: "Doe" }] }),
      { getCollection: siteLoader(SITE) },
    );
    ready(env);
    await flush(60);
    const want =
      "Title: Another publication already has this exact title (“Gig drivers”). Change one of them";
    const onMine = {
      code: "E_DUP_TITLE",
      file: "publications/new-pub.md",
      field: "title",
      message: "title duplicates publications/allon-2023-gig-drivers.md",
    };
    const onTheirs = {
      code: "E_DUP_TITLE",
      file: "publications/allon-2023-gig-drivers.md",
      field: "title",
      message: "title duplicates publications/new-pub.md",
    };
    expect(env.live.formatIssue(onMine as never)).toBe(want);
    expect(env.live.formatIssue(onTheirs as never)).toBe(want);
    const live = env.live as unknown as { issueEntry: (i: unknown) => unknown };
    expect(live.issueEntry(onMine)).toEqual({
      collection: "publications",
      slug: "allon-2023-gig-drivers",
      name: "the other publication",
    });
    expect(live.issueEntry(onTheirs)).toEqual(live.issueEntry(onMine));
    const rev = (env.last("bobalab:overlay") as { rev: number }).rev;
    env.send({
      type: "bobalab:rendered",
      v: 1,
      rev,
      target: { page: "publication", slug: "new-pub" },
      path: "/publications/new-pub/",
      title: "Gig drivers",
      found: "page",
      problems: { available: true, blocking: [onMine], warnings: [], stillNeeded: [] },
    });
    const open = button(col.inst.tree, "Open the other publication")!;
    open.props.onClick!.call(null);
    expect(env.location.hash).toBe("#/collections/publications/entries/allon-2023-gig-drivers");
  });

  it("a new entry's address line looks forward while its parts are missing; red only when it can't work", async () => {
    const line = async (collection: string, data: Record<string, unknown>) => {
      const env = boot({ mode: "local" });
      env.state.editor = {
        collection,
        slug: null,
        newRecord: true,
        data: {},
        fields: [],
      };
      const col = env.mount(decapEntry(collection, "", data, { newRecord: true }), {
        getCollection: siteLoader(SITE),
      });
      const addr = findAll(col.inst.tree, (n) =>
        String(n.props.className).startsWith("bl-live__address"),
      )[0]!;
      return { text: textOf(addr), cls: String(addr.props.className) };
    };
    const pub = await line("publications", { title: "V1 verifier: new paper title" });
    expect(pub.text).toBe(
      "The address is made from the first author’s name, the year and the title. Add the first author to see it.",
    );
    expect(pub.cls).not.toContain("--problem");
    const dir = await line("directions", { title: "Verifier direction" });
    expect(dir.text).toBe(
      "The address is made from the short label. Add the short label to see it.",
    );
    for (const t of [pub.text, dir.text]) expect(t).not.toMatch(/Not saved|\{|kebab/);
    const person = await line("people", { name: "Prince" });
    expect(person.text).toBe(
      "The address is made from the first and last name. Type at least a first and a last name in Latin letters.",
    );
    expect(person.cls).toContain("bl-live__address--problem");
    const long = await line("publications", {
      title: "A paper",
      authors: [{ name: "Bartholomew Montgomery-Fitzwilliam Saint-Exupery Jr" }],
    });
    expect(long.text).toMatch(
      /^The address would be \d+ characters long, and at most 60 fit\. For the first save, type only the first author’s last name; complete it after saving\.$/,
    );
  });
});
