# Redesign CONTENT request 4: typographic quotes, and link text that says where a link goes

> **Status (integration, 2026-10-24):**
>
> - **4a APPLIED.** `src/lib/content/typeset.ts`; Markdoc text nodes plus the loader's plain display fields (direction question, summary and findings; publication `in_brief`; project and news `summary`; opportunity `route`; home statement, mission and findings; text-page `intro`). Titles, citations, URLs and code are not converted. ARCHITECTURE §9 item 14; R-C6.
> - **4b APPLIED** in `OpportunityCard.tsx` (exported `urlLabel`) and the CMS preview template; R-C4.
> - **4c APPLIED:** "Join the lab" (page h1, `<title>`, CMS label and preview template); R-C5.
> - **4d REJECTED for now:** P3 keeps "Why it matters"; the choice is the PI's (R-20).

Two copy-level details that CONTENT cannot fix inside `content/**`. Both were MEASURED on the
shared dev server (preview) on 2026-10-24 by the CONTENT review. Neither blocks anything.

## 4a. Straight and curly quotes are mixed on the same page

- File(s): `src/lib/content/markdoc.ts` (foundation/shared) and the components that print
  plain content fields (summaries, questions, `in_brief`, `route`, `intro`, `mission`).
- Why: component strings use typographic quotes ("lab’s", “now”, “reported by the lab”), but
  content arrives with straight ones, because that is what editors type in the CMS. Measured
  on rendered pages (`document.body.innerText`):
  - `/`: 2 straight ("app's", "Sinchaisri's") next to 3 curly (Fig. 1 caption "lab’s", “now”);
  - `/research/learning-on-the-job/`: 5 straight, 1 curly;
  - `/about/`: `"Improving Human-AI Interactions in the Future of Work"` in straight quotes;
  - `/accessibility/`: `"Reduce motion"` in straight quotes.

  Mixed quote glyphs are one of the small signs of unedited, assembled text. Converting
  `content/**` by hand would not last: the next CMS edit brings straight quotes back.

- Workaround used: none. CONTENT left the files as typed, so a render-time fix covers old and
  new entries alike.
- Proposed change: convert at render time, never in the stored content, and never inside
  code, URLs, BibTeX, DOIs or slugs.

```ts
// src/lib/content/typeset.ts (new)
/** Straight quotes to typographic ones, for display text only (not code, URLs, BibTeX). */
export function typeset(s: string): string {
  return s
    .replace(/(\w)'(\w)/g, "$1’$2") // apostrophe inside a word: lab's, don't
    .replace(/(^|[\s(\[—–-])'/g, "$1‘") // opening single
    .replace(/'/g, "’") // closing single (a year elision after a space, " '26", would need its own rule)
    .replace(/(^|[\s(\[—–-])"/g, "$1“") // opening double
    .replace(/"/g, "”"); // closing double
}
```

```diff
--- a/src/lib/content/markdoc.ts
+++ b/src/lib/content/markdoc.ts
@@
 import { withBasePath } from "@/lib/site/paths";
+import { typeset } from "./typeset";
@@ export const markdocConfig: Config = {
   nodes: {
+    text: {
+      attributes: { content: { type: String, required: true } },
+      transform(node: Node) {
+        return typeset(String(node.attributes.content ?? ""));
+      },
+    },
     heading: {
```

Markdoc keeps inline `code` as its own node, so code spans are untouched. For plain fields,
call `typeset()` where the component prints the field (or once in the loader's view
objects for `summary`, `question`, `in_brief`, `route`, `intro` and `mission`), and leave
`title` alone where it feeds APA or BibTeX.

- Test that proves it: a unit test for `typeset` ("lab's" → "lab’s", `"Reduce motion"` →
  “Reduce motion”, `` `code's` `` unchanged through `renderMarkdown`); then re-run the
  quote count above and expect 0 straight quotes in visible text. Check the e2e specs that
  match content text with an apostrophe (search `tests/e2e` for `'s`) and update them to the
  typographic form.

## 4b. "More information" on `/join/` (AUDIT W4; DIRECTION §5.0 RC-5)

- File(s): `src/components/pages/OpportunityCard.tsx` (pages/join package).
- Why: each opportunity with a `url` ends in a link called "More information" (4 on `/join/`
  today). AUDIT W4 lists it as a generic label, and the shared contract says "the link text
  says where a link goes". The four links go to three different places: the URAP project
  listing, the UC Berkeley class listing, and the PI's website.
- Workaround used: none. Opportunities have no field for link text, and adding one would be a
  CMS schema change.
- Proposed change: name the destination from the address.

```diff
+/** Where an opportunity's "url" goes, in words (falls back to the host name). */
+function urlLabel(url: string): string {
+  const host = new URL(url).hostname.replace(/^www\./, "");
+  if (host === "urapprojects.berkeley.edu") return "URAP listing";
+  if (host === "classes.berkeley.edu") return "Class listing";
+  if (host === "parksinchaisri.github.io") return "Park Sinchaisri’s website";
+  return host;
+}
@@
               <a href={o.url} rel="noopener noreferrer">
-                More information<span className="vh"> about {o.title}</span>
+                {urlLabel(o.url)}
+                <span className="vh"> for {o.title}</span>
               </a>
```

- Test that proves it: `/join/` has no visible "More information"; the join e2e spec (if it
  selects this link by name) is updated to the new names.

## 4c. The Join page's h1 is the generic "Work with us" (AUDIT W4)

- File(s): `src/app/join/page.tsx` (lines 49 and 96: metadata title and `PageHeader` title).
- Why: AUDIT W4 lists "Work with us" among the generic labels, and the header link to this
  page says "Join". A plain noun phrase that matches the nav reads as the lab's own page.
- Proposed change: `title: "Join the lab"` in both places (the `<title>` becomes "Join the
  lab · BOBALAB").
- Test that proves it: update the h1 assertion in `tests/e2e/pages.spec.ts`; check
  `tests/unit/cms/preview.test.ts` and `tests/unit/direction/model.test.ts`, which also
  contain the string (the direction "Work with us on this" block may be a separate use).
- Blocking? No. If the pages package prefers to keep the wording, close this item.

## 4d. "Why it matters" heads text that does not say why (AUDIT W3)

- File(s): `src/app/research/[direction]/page.tsx` line 122 (`<Section id="why" title="Why it matters">`),
  direction package.
- Why: after the copy cleanup the section opens with the direction summary and then describes
  the studies. Neither says why the work matters, so the heading promises something the text
  does not deliver, which AUDIT W3 named as a tell. CONTENT must not invent significance
  claims; the PI is asked in `docs/CONTENT-QUESTIONS.md` R-20.
- Proposed change, only if the PI does not supply a "why" sentence per direction: keep the
  `id="why"` anchor (links and tests may use it) and change the visible title to a plain
  description, for example `title="The work"`.
- Test that proves it: update any spec that finds the section by its heading name
  (`tests/e2e/direction*.spec.ts`); the `#why` anchor is unchanged.
- Blocking? No.
