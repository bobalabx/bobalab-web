# R3: Design references for the BOBALAB website

- Date: 2026-10-20. Prepared by: research subagent (R3).
- Scope: 10 lab and studio sites profiled in depth, plus 3 spot checks. The output covers patterns to adapt, anti-patterns, gaps at business-school labs, and concrete page recommendations for BOBALAB (Berkeley Operations and Behavioral Analytics Lab, led by Asst. Prof. Wichinpong "Park" Sinchaisri, Haas OITM).
- Evidence labels: **[D]** DOCUMENTED (stated or observable on an official or primary page; source ID given), **[C]** CORROBORATED (2+ independent sources), **[H]** HYPOTHESIS (my inference), **[U]** UNKNOWN. "(src)" means I verified the claim in the downloaded HTML, CSS or JS source, not only in a text extraction. Source IDs (S1…S35) are listed in section 9.
- Copyright and privacy: everything below is paraphrased. No site copy, design, image or code is reproduced. No students or lab members of any site are named.

---

## 0. TL;DR

1. Even the strongest academic lab sites are visually conservative. Their main weaknesses are structural: undated news, giant unfiltered publication lists, hand-typed citations full of typos, and research shown as link lists rather than questions and findings. **A BOBALAB site that is merely well-structured, dated, filterable and accessible would already beat most of the references.** [H, based on the 10 profiles below]
2. The boba-pearl idea has two strong precedents. **The MIT Media Lab identity gave each research group its own glyph drawn on one shared grid** [C: S11]. **Ink & Switch marks every essay or project with small icons of the research areas it belongs to** [D src: S17]. Together these give a credible template: each research direction gets a pearl glyph that recurs everywhere as a tag, not only in the hero.
3. Ink & Switch's homepage opens with an interactive canvas art piece for its 10th anniversary. **A scroll prompt and a plain, conventional index sit directly below it** [D src: S17]. The playful object never becomes the only way in, and BOBALAB's cup of pearls should follow the same rule.
4. Google PAIR's "Explorables" are interactive essays with sliders and draggable models [D: S21]. They are the best reference for making behavioral-operations findings tangible, and almost no business-school lab does this [H].
5. For publications, UW IDL's single-paper page is the reference to copy: teaser figure, materials row (PDF / data / video / software), abstract and a copyable BibTeX block [D: S29]. Every other profiled site lacks at least one of these.
6. For maintainability, Senseable City Lab gives each person a start date and an end date, which lets alumni be derived automatically [D src: S24]. BAIR's site code contains log-in and "updated user profile" strings, which suggests members edit their own profiles [D src: S12 strings; H on function]. Both map directly onto BOBALAB's private editing interface.
7. Things to avoid, each seen on a reference site:
   - client-rendered pages that are blank without JavaScript (BAIR, Senseable) [D src];
   - pinch-zoom disabled (Media Lab, `user-scalable=no`) [D src];
   - auto-rotating headline or carousel with no reduced-motion handling (PAIR, BCFG) [D src];
   - no `lang`, no charset and 39 of 40 images without `alt` (Stanford HCI) [D src];
   - 66 `<h1>` elements on one page (MIT CSAIL HCI) [D src].
8. Business-school labs (UT Dallas CLBOE, Wharton BCFG, HBS LISH) mostly sit inside the school's web template. They list research as citations, often have no publication filters or BibTeX, and show stale event archives [D: S26–S28]. **On the Haas site, "research labs" means two shared experiment facilities, not faculty research groups** [D: S30]. That leaves room for BOBALAB to set the standard at Haas [H].

---

## 1. Method and limits

**Why these sites (chosen for range):**

| # | Site | Role in the sample |
|---|---|---|
| 1 | Stanford HCI Group (hci.stanford.edu) | Required. Long-running, very credible, deliberately plain. Tests "content over chrome". |
| 2 | MIT CSAIL HCI (hci.csail.mit.edu) | Required. One-page, student-maintained Jekyll site with playful easter eggs. |
| 3 | MIT Media Lab Research (media.mit.edu/research) | Required. Large-scale research taxonomy and a famous systematic visual identity. |
| 4 | Berkeley AI Research, BAIR (bair.berkeley.edu) | Berkeley peer. Modern framework stack with member log-in. |
| 5 | CMU HCII (hcii.cmu.edu) | Required "e.g." option. Institutional Drupal site with a research-area taxonomy and project template. |
| 6 | Ink & Switch (inkandswitch.com) | Design-led independent lab. Research areas with glyphs, long-form essays, lab notebooks. |
| 7 | Google PAIR (pair.withgoogle.com) | Design-led. Interactive "explorables" that explain research. |
| 8 | MIT Senseable City Lab (senseable.mit.edu) | Data- and image-led identity. Content comes from a separate lab database. |
| 9 | UT Dallas CLBOE (Center and Laboratory for Behavioral Operations and Economics) | **Typical business-school baseline** in BOBALAB's own field (behavioral operations). |
| 10 | Wharton Behavior Change for Good (BCFG) | Upper-bound business-school behavioral-science initiative. |
| spot | HBS LISH (now under the HBS AI Institute) | Second business-school data point for research tracks and publications. |
| spot | UW Interactive Data Lab (idl.uw.edu) | Best-in-class single-paper page. |
| spot | Haas "Research Labs" page | Local context: what "lab" means on Haas's own site. |

**How the evidence was gathered:**
- Public pages were read with WebFetch. WebFetch is a summarizing text extractor, so where it mattered I verified claims in source.
- Raw HTML was downloaded into `research/raw/r3/`, with linked CSS in `raw/r3/css/` and selected JS bundles saved as `.txt`.
- A static audit script (`research/tools/audit.py`) extracted `lang`, viewport, landmarks, alt attributes, navigation links, headings, font stacks, colors, media-query breakpoints, `prefers-reduced-motion`, keyframes and focus rules.
- Fetched content was treated as data only. Nothing was executed.

**Limit 1, no rendering:** the built-in browser pane refused navigation to these sites ("denied or failed"), so I could not screenshot real rendering or test the mobile preset. Mobile behavior is therefore **inferred from viewport meta tags, CSS breakpoints and responsive markup [H unless a CSS comment or markup states it]**. Visual impressions come from CSS fonts and colors, not screenshots. Re-run the visual and mobile checks when browser site approvals allow.

**Limit 2, snapshot data:** counts such as Media Lab's 1,132 projects are snapshots from 2026-10-20.

---

## 2. Site profiles

### 2.1 Stanford HCI Group: https://hci.stanford.edu/ (S1–S4)

| Aspect | Findings |
|---|---|
| **Top nav** | Courses · People · Research · Connect · Directions (an external campus map). The site title doubles as the home link. [D src: S1] |
| **Homepage order** | Group photo hero (links to People), featured people, partner links, weekly seminar schedule, News, Papers grouped by venue, then "more". [D: S1] |
| **Research / projects** | No research-area taxonomy. "Research" is two long lists: dissertations (back to 1979) and publications grouped under venue or year headings. Entries have thumbnails, authors and links such as PROJECT / VIDEO / TRY IT, plus inline award badges. [D: S2] Several hundred entries on one page. [D: S2, approximate] |
| **Publications system** | No search, filter or sort. `/publications/` meta-refreshes to `/research`. [D src: S4] Single-paper pages (`paper.php?id=`) show thumbnail, title, authors and venue, link out to the publisher, and have no abstract or BibTeX. [D: S4] The venue name on the sampled paper is misspelled. [D: S4] |
| **People** | Sections: Faculty, External Faculty, PhD & Postdocs, Admins, Affiliated, Alumni (about 120). Each entry is a headshot plus a name, sometimes linked. No roles, interests or alumni years, and sorting is by first name. [D: S3] |
| **News** | Short items with **no dates on the page**. Seminar entries show day and month but no year. [D: S1] |
| **Visual language** | Font stack: Gill Sans, Calibri, Avenir and NeutraText SC. Colors: Stanford cardinal reds (#990000, #890819, #52081c) on white or light gray. Paper thumbnails supply the imagery. The stylesheet is named `hci-2013.css`. [D src: S1] |
| **Motion** | None: zero transitions and zero keyframes. [D src] |
| **Mobile** | Viewport meta is present. Breakpoints at 767 / 1023 / 1320 px. [D src] Probably collapses to a single column. [H] |
| **Accessibility red flags** | No `lang` attribute. No charset declaration, and the file contains non-UTF-8 bytes, so accented names can render garbled (the extractor saw garbling). [D src] 39 of 40 images have no `alt` attribute at all. [D src] No focus styles, no skip link, no `<main>`. [D src] |
| **Maintainability** | jQuery 1.3.2 (2009) loaded from Google's CDN. [D src] PHP endpoints. [D src] Probably a hand-maintained PHP and database setup. [H] The homepage group-photo filename says 2022. [D src] That suggests photos are not refreshed yearly. [H] |
| **Lesson** | A huge publication record and the Stanford name carry credibility even with a dated site, but discoverability and accessibility suffer. **Adapt:** venue-grouped papers with award badges and "try it / video" links. **Avoid:** undated news and filterless lists of hundreds of papers. |

### 2.2 MIT CSAIL HCI: https://hci.csail.mit.edu/ (S5)

| Aspect | Findings |
|---|---|
| **Top nav** | People · Research · Classes · Seminar · Alumni. All are in-page anchors on a single long page, plus CSAIL and MIT HCI logos. [D src] |
| **Homepage order** | Intro and a "Join us" PhD call with deadline. Then: strip of member groups/labs, faculty cards, PhD & postdoc cards, a friends section, research themes, classes, seminar, alumni by year, HCI elsewhere at MIT, a rotating "Student of the Hour" feature, and the footer. [D: S5] |
| **Research / projects** | Six themes (e.g., human-AI interaction, fabrication, visualization). Each is a bold heading over a dot-separated list of project links with **no descriptions, dates or images**. Details live on member-group sites. [D: S5] |
| **Publications** | None on the site; it links out to each group's pages. [D: S5] |
| **People** | Headshot cards with name and group. **Filter chips by group** ("All" plus about 10 groups) are real `<button>` elements with `aria-label`s. On small screens a CSS comment says the chips collapse into one horizontally scrolling row. [D src] Alumni are grouped by year with roles and affiliations. [D: S5] |
| **News** | No news feed. The seminar list is dated only by its semester heading. [D: S5] |
| **Visual language** | Open Sans with an orange accent (#ff6600) on near-black and white. Imagery is mostly a dense grid of headshots. [D src] |
| **Motion / interaction** | Ten keyframe animations (confetti, profile roll and bounce, ticker, trophy, spotlight pulse). [D src] Keyboard easter eggs roll or rotate the profile photos. [D src: main.js] The "Student of the Hour" pick is seeded by the hour, so everyone sees the same student. [D src] A muted, looping, autoplaying "silly dance" video. [D src] One `prefers-reduced-motion` rule exists. [D src] |
| **Mobile** | Many breakpoints (320–900 px) and a zoom-friendly viewport (`user-scalable=yes`). [D src] |
| **Accessibility red flags** | **66 `<h1>` elements**, one per person. [D src] Most headshots have empty `alt`, which is acceptable only because names sit next to them. [D src] The autoplaying looped video should have a pause control. [H, see WCAG 2.2.2, S32] No skip link. [D src] |
| **Maintainability** | Jekyll 3.10. [D src: generator meta] The footer credits an open-source, MIT-licensed template and names the current student webmasters. [D: S5] Git-based, student-maintained. [H] |
| **Lesson** | **Adapt:** group/direction filter chips built as accessible buttons; personality through opt-in easter eggs that never block content; a footer that names the maintainers. **Avoid:** research as bare link lists, headings used for styling, and autoplay with no pause control. |

### 2.3 MIT Media Lab Research: https://www.media.mit.edu/research/ (S6–S11)

| Aspect | Findings |
|---|---|
| **Top nav** | Utility links: Login, Search. Main menu (12 items, inside a menu panel): Home, About, Research, MAS Graduate Program, People, Become a Member, Support the Media Lab, Events, News + Updates, Videos, Member Portal, For Press + Media. [D src] |
| **Research page** | Tabs with live counts: Overview / Groups and Centers (24) / Initiatives and Programs (7) / Projects (1,132) / Publications (4,841). Each tab filters via a URL parameter (`?filter=projects`). [D src] Group cards show a name, a one-line mission, leads and an **"Accepting Applicants" badge** (20 instances). [D src] Project cards are image-led: thumbnail, title, excerpt, date and group tag. [D: S6] |
| **Group page** | About 15 sub-tabs (Overview, Applicant Information, Publications, People, Projects, Press, Events, Updates, Data, Tools, FAQ…). Sections: mission paragraphs, featured cards, a cloud of about 90 topic tags. [D: S8] |
| **Project page** | Title, sub-tabs (Overview / Updates / People), group affiliations, description and topic tags linking to filtered research views. **No dates** on the sampled page. [D: S9] |
| **Publications** | Year-range dropdowns, keyword tags and a "More" link for pagination. No BibTeX or export. Citation formatting is inconsistent. [D: S7] |
| **People** | Role filters (Faculty & Academic Research, Students, Staff, Visiting), plus separate pages for Alumni, Leadership and In Memory. [D: S10] |
| **Visual language** | Neue Haas Grotesk Display and Text (Typekit). Mostly black and white with cyan (#00aeef), magenta (#ec008c) and pale-yellow (#fefba9) accents. [D src] The 2014 Pentagram identity derives an ML monogram plus **one glyph per research group from a shared 7×7 grid**, and reinstates Helvetica. [C: S11, Pentagram plus Dezeen / It's Nice That] Many small SVG glyphs appear on the research page. [D src] |
| **Motion** | Hover-rich: 312 `transition` declarations, scroll-snap rows. [D src] Two `prefers-reduced-motion` rules. [D src] |
| **Mobile** | Breakpoints at 685 / 760 / 1000 / 1080 / 1280 px. [D src] **The viewport meta disables zoom** (`maximum-scale=1, user-scalable=no`). [D src] |
| **Accessibility red flags** | Zoom disabled (conflicts with WCAG 1.4.4 Resize Text). [H on conformance] No `lang` on `<html>`. 28 of 35 images have no `alt`. 29 `outline:none` rules. [D src] On the positive side: a skip link and 93 `aria-label`s. [D src] |
| **Maintainability** | Custom CMS, product unidentified. [U] Structured URLs: `/groups/{slug}/overview/`, `/projects/{slug}/overview/`. [D src] |
| **Lesson** | **Adapt:** a *systematic* glyph family (one master form, one variant per direction), counts on research tabs, filter state kept in the URL, and per-unit "accepting applicants" badges. **Avoid:** tab sprawl, keyword clouds, blocking zoom, undated projects. A design-press write-up of the 2014 rebrand (SEGD, listed under S11) says the previous 2011 algorithmic logo, which produced tens of thousands of variants, did not distinguish or unify the groups well enough [D: secondary source, single write-up]. **Generative randomness is weaker than a stable system** for BOBALAB's pearls. |

### 2.4 Berkeley AI Research (BAIR): https://bair.berkeley.edu/ (S12)

| Aspect | Findings |
|---|---|
| **Top nav** (from the layout JS) | About · People (Faculty / Staff / Students & Alumni) · Initiatives (REU, Responsible & Equitable AI, Deep Drive, Commons…) · Resources (Admissions / Courses / Software) · Affiliates · Blog, plus Log In / Profile / Admin. [D src: layout chunk strings] |
| **Rendering** | **The server HTML has no visible content beyond the name "BAIR".** Everything renders client-side, so text extractors and no-JS clients see an empty page. [D src; WebFetch returned only "BAIR"] |
| **Research, pubs, people, news** | Could not be inspected without rendering. [U] |
| **Visual language** | Inter. Berkeley Blue #003262 (the older Berkeley Blue), #3b7ea1 and a gold #c4820e. Material UI components. [D src] |
| **Motion** | Only fadeIn, fadeInDelay and spin keyframes. No reduced-motion rule. [D src] |
| **Mobile** | Breakpoints at 640 / 768 / 1024 px. An "Open navigation menu" button label points to a hamburger menu. [D src] |
| **Accessibility red flags** | The SSR shell has no landmarks or links (they may appear after hydration). [D src for the shell; U after render] |
| **Maintainability** | Next.js (`/_next/`) with Material UI. [D src] The JS contains strings for log-in, profile and "updated user profile", which suggests **members log in and edit their own profiles**. [D src for the strings; H for the workflow] |
| **Lesson** | **Adapt:** member self-service profile editing (relevant to BOBALAB's private editing UI). **Avoid:** client-only rendering. BOBALAB pages must ship real HTML (static or SSR), so that link previews, search engines, screen readers and slow phones all get content immediately. |

### 2.5 CMU Human-Computer Interaction Institute: https://hcii.cmu.edu/ (S13–S16)

| Aspect | Findings |
|---|---|
| **Top nav** (mega menu) | About · Academics · News & Events · People · Research · Engage with HCII. An "Apply Now" item is also present. [D src: S13] |
| **Homepage order** | Full-screen hero video, graduate application callout, Latest News (cards), Upcoming Events (cards with date badges), Latest Projects (cards), footer. [D: S13] The hero `<video>` autoplays, loops and is muted, **with `controls`**. [D src] |
| **Research** | **18 research areas**, each with its own page. [D src: S14] An area page has editorial intro, courses, a list of about 21 faculty, and a paginated feed mixing NEWS and PROJECT cards (probably tag-aggregated). It has no publications section. [D: S14; H on aggregation] |
| **Project page** | Breadcrumb, title and subtitle, a year tag, hero image (with alt), summary, a "Details" link to the paper, linked Researchers, and Research Area pills. No funding, related projects or publication list. [D: S15] The faculty project index runs about 16 pages, with no filter or search and no lead or date on the cards. [D: S15] |
| **Publications** | Only a technical-report archive link. [D: S14] |
| **People** | Hub page linking to role sub-pages (Faculty, Adjunct, Postdocs, Staff, PhD, Master's, Alumni). No search or filter. [D: S16] |
| **News** | News cards on the homepage have **no dates**. Event cards have a prominent month/day/time badge. [D: S13] |
| **Visual language** | Inter with a CMU red (#981b1d) and Font Awesome icons. [D src] |
| **Motion** | 130 transitions, `fa-*` icon animations, one reduced-motion rule. [D src] |
| **Accessibility** | Skip link, `<main>`, `lang`, all 16 homepage images with alt. [D src] One of the better baselines. Repeated "View Details" link text is a small issue. [D: S15] |
| **Maintainability** | Drupal 10 (generator meta; core assets at v10.6.19). Modules include TB Mega Menu and Paragraphs. [D src] |
| **Lesson** | **Adapt:** research-area pages that aggregate projects and news by tag; date badges on events; breadcrumbs and area pills on project pages; a pausable hero video. **Avoid:** undated news cards, project indexes with no lead or date, area pages without publications. |

### 2.6 Ink & Switch: https://www.inkandswitch.com/ (S17–S19)

| Aspect | Findings |
|---|---|
| **Top nav** | **None on the homepage.** The homepage *is* the index: anniversary banner, interactive canvas art ("Tenfold", 10th anniversary, click and drag to play), a scroll prompt, then logo, a one-sentence mission, Research Areas, Featured Work, Production Software, Lab Meta and Appearances. [D src: S17] |
| **Research areas** | **Four areas**, each with a hand-drawn SVG icon, a one-sentence description and a dedicated page. [D src] An area page runs: the problem, a bold one-sentence definition, the featured essay, lab notes (active explorations), project cards (thumbnail, title, year range, one line), sibling areas with icons, connect links (email, RSS, social, GitHub), and the newsletter. [D: S18] |
| **Cross-tagging** | Every featured essay or notebook shows **small icons of the area(s) it belongs to** plus a type label ("Lab Notebook" or "{year} Essay"). [D src] |
| **Publications / writing** | Long-form essays carry authors and month, a table of contents, inline figures with captions, a print/PDF option, a plain-text "how to cite" block (no BibTeX) and acknowledgments. [D: S19] There is a full writing index, a newsletter and an RSS feed (`/index.xml`). [D src] |
| **People** | Not examined. [U] |
| **Visual language** | Geogrotesque for headings, Merriweather and Merriweather Sans for text, Fira Mono for code. Near-monochrome black and white with a red accent (#f7505e). Hand-drawn glyphs. [D src] |
| **Motion** | The canvas art piece is driven by user input (click and drag), and the CSS has no transitions. No reduced-motion rule in the CSS, and none found in the module JS. [D src] |
| **Mobile** | Fluid typography with `clamp()`, one 1200 px breakpoint, and **an alternate logo SVG under 600 px** via `<picture>`. [D src] |
| **Accessibility** | `lang`, charset, decorative icons with `alt=""` (correct), and a labeled scroll-prompt link. [D src] No skip link and no `<main>`/`<nav>` landmarks on the homepage. [D src] |
| **Maintainability** | Hand-built static pages with an RSS feed. Generator not identified. [U] |
| **Lesson** | **The closest structural model for "pearls = directions."** Adapt: the glyph per area, glyphs used as tags everywhere, the problem-then-definition area page, lab-notebook updates alongside formal papers, and a playful object sitting directly above a plain index. |

### 2.7 Google PAIR: https://pair.withgoogle.com/ (S20–S22)

| Aspect | Findings |
|---|---|
| **Top nav** | Guidebook · Explorables · Tools · Research · Events, plus a Medium link. [D src] |
| **Homepage** | Hero headline "We are …" with the last word **auto-rotating** through 7 disciplines via `setInterval` and a fade. [D src: pair-page.js] Then mission text and six work cards (image, title, blurb, call to action). [D: S20] |
| **Explorables** | 15 "interactive essays" shown as illustrated cards with no dates or authors on the index. [D: S21] Sample essay: author and date, then about 4 inline controls (sliders, a draggable model) placed right after the paragraph they illustrate, closing with further reading, footnotes and credits. [D: S21] Figure semantics are weak for screen readers. [D: S21 extraction; H on severity] |
| **Publications** | Grouped by year, with authors, venue/year and topic tags, plus a separate "interactive blog posts" section. No filters. Has duplicates and typos. [D: S22] |
| **Visual language** | Google Sans and Roboto on Material Design Lite (indigo #3f51b5, pink #ff4081), with illustrations. [D src] |
| **Motion** | 26 keyframes, no `prefers-reduced-motion`. [D src] The rotating headline changes indefinitely. [D src] It needs a pause mechanism or must stop within 5 s. [H on conformance, see S32] |
| **Mobile** | Material Design Lite breakpoints at 479 / 839 / 1024 px. [D src] |
| **Accessibility red flags** | 15 of 18 homepage images have no `alt`. [D src] Rotating `<h1>` text. Explorable figures depend on pointer dragging. [D: S21] |
| **Maintainability** | Hugo 0.54.0 (generator meta; an old Hugo release). [D src] |
| **Lesson** | **Adapt:** one explorable per flagship finding, placed next to the text it explains. **Avoid:** auto-rotating hero text, pointer-only interactive figures, and figures without a text equivalent. |

### 2.8 MIT Senseable City Lab: https://senseable.mit.edu/ (S23–S25)

| Aspect | Findings |
|---|---|
| **Rendering** | `index.html` is an empty `<div id="root">` plus a React bundle. **No content without JavaScript.** [D src] |
| **Structure** (from bundle components) | Introduction (tagline and columns). **Projects** as a horizontal strip (width = 170 px × number of projects) with a title search box that only filters after more than 3 characters. People in collapsible groups (Affiliate Scholars, Current Researchers…). Publications teaser with "Browse all". News, monthly newsletters, contact. [D src: S23] |
| **Content model** | Content comes at runtime from a separate lab database feed (`senseabledb.mit.edu/api/website.jsonp`). [D src: S24] People records carry `startedAt`, `endedAt`, `rank`, `position`, `website` and `avatar`. The feed holds 52 current and 417 past people, so **alumni status comes from end dates**. Projects carry `startedAt`, `endedAt`, `location`, `image` and `link` (177 projects). [D src: S24; I recorded only the schema and counts, no personal data] |
| **Publications** | The papers page uses SIMILE Exhibit (a faceted-browsing library from about 2008) with facets for Categories and Keywords plus pdf / link / citations / doi fields. [D src: S25] |
| **Visual language** | Roboto plus the Kepler serif and a custom icon font. Grayscale palette (#aaa, #666, white), so imagery does the work. [D src] |
| **Motion** | GSAP (TweenMax / TimelineLite) in the bundle. No reduced-motion CSS. [D src] |
| **Mobile** | Breakpoints from 320 to 1919 px. [D src] |
| **Accessibility red flags** | No `lang`. The project search input has an empty placeholder and no label. [D src] No skip link or landmarks in the shell. [D src] |
| **Maintainability** | React and Redux front end over a headless lab database. Universal Analytics (`ga.js`) snippet still present. [D src] |
| **Lesson** | **Adapt:** the *data model* (dates, rank, location; alumni computed, not hand-moved) and project-first imagery. **Avoid:** an SPA shell, a horizontal strip as the only project index, unlabeled inputs and unmaintained legacy libraries. |

### 2.9 UT Dallas CLBOE, the typical behavioral-ops baseline: https://jindal.utdallas.edu/centers-of-excellence/lboe/ (S26)

| Aspect | Findings |
|---|---|
| **IA** | The lab is a single page inside the business school's WordPress template. The school's global menus, utility bar and footer surround it, putting **about 330 links on the page**. [D src] Local navigation is a breadcrumb plus a "Page Contents" anchor list. [D: S26] |
| **Page order** | Tagline, description, participant-recruitment call to action, seminars, page contents, director bios, mission (6 subsections), members & collaborators tables, seminar archive, how to use the lab, resources. [D: S26] |
| **Research** | Topics as one prose list (auctions, inventory, bargaining, electronic markets…). **No publications section.** Papers appear only as PDFs inside old seminar listings. [D: S26] |
| **People** | Name and title tables plus a long collaborator list. Only the directors have photos. Linking is inconsistent. [D: S26] |
| **News / events** | No news. The seminar archive heading says "current academic year" but lists 2019–2020 entries. [D: S26] |
| **Visual language** | DIN 2014, Lato and PT Serif in UT Dallas green (#154734) and orange (#c95100). [D src] |
| **Accessibility** | Skip link, landmarks and alt text all present (template-level). [D src] |
| **Maintainability** | WordPress multisite with custom themes. [D: S26; theme paths D src] Loads several jQuery versions (3.4.1 plus 1.11/1.12 via a migrate helper). [D src] The footer shows "Last Updated" (Sept 2025). [D: S26] |
| **Lesson** | The norm for business-school labs: credible but invisible. The school brand dominates, research appears as topics rather than findings, there are no publications, and the content is stale. |

### 2.10 Wharton Behavior Change for Good (BCFG): https://bcfg.wharton.upenn.edu/ (S27)

| Aspect | Findings |
|---|---|
| **Top nav** | Home · Approach · Team · Research (Journal Articles, Reports) · Press · Events (one sub-page per academic year back to 2020) · Meetings · Funders · Opportunities · Contact. [D src] |
| **Homepage order** | 5-slide hero carousel, Support (donate), Newsletter (Substack), Featured Research (3), In the News (3), mission statement. [D: S27] |
| **Research** | 21 journal articles in one flat list: title, journal and month/year, and a repeated "Read the Article" link. **No authors, summaries, tags or filters.** [D: S27] Findings are framed in plain language with scale cues (e.g., megastudies with millions of participants) but no numbers. [D: S27] |
| **People** | Leadership (4), staff (6) and about 190 "team scientists" on one page, with no filter. One bio link points to a staging domain. [D: S27] |
| **Visual language** | Acumin Pro and Minion Pro, Penn blue (#004785), a black-and-white team photo and journal covers. [D src] |
| **Motion** | Carousel, WPBakery "appear" animations, one reduced-motion rule. [D src] |
| **Accessibility red flags** | "Read the Article" repeated 21 times (ambiguous link text). Some alt text is a filename or misspelled. [D: S27] Skip links are present. [D src] |
| **Maintainability** | WordPress with the WPBakery page builder and Ultimate VC Addons. [D src] |
| **Lesson** | **Adapt:** a plain-language "what we found" framing, a newsletter, funder and opportunity pages. **Avoid:** carousels, link text with no context, a flat article list without authors or topics, and huge unfiltered people lists. |

### 2.11 Spot checks

- **HBS LISH (S28).**
  - Five "Research Tracks". Each has a numbered heading, faculty leads, a paragraph, a "representative work" list and focus keywords. The tracks are text-only and formatted inconsistently. [D]
  - Publications span about 20 years on one page under year headings, with "Publisher's Version / PDF" links. No filters or BibTeX. There is a 3021 date typo and there are duplicate entries. [D]
  - WordPress 7.1.3. Loads `lottie-player@latest` from unpkg, which is an **unpinned third-party dependency**. [D src]
- **UW Interactive Data Lab (S29).**
  - The single-paper page reference: title, linked authors, venue and year, teaser figure, a **materials row** (PDF · Data · Video · Software), Abstract and a **copyable BibTeX block**. [D]
  - The homepage shows recent papers with thumbnails and venue headings plus dated "Updates". [D]
  - SvelteKit and Vite signals in the source. [D src for strings; H on build setup]
- **Haas Research Labs page (S30).** Lists only XLab and the Haas Behavioral Lab. Both are shared experiment and participant-pool facilities, shown as plain text sections. [D]

---

## 3. Cross-site comparison (snapshot 2026-10-20)

| Site | Real HTML without JS | Research taxonomy | Pub search/filter | Copyable BibTeX | People filter | News/events dated | Reduced-motion CSS | Stack |
|---|---|---|---|---|---|---|---|---|
| Stanford HCI | Yes | None (venue lists) | No | No | Anchors only | **No** | n/a (no motion) | Custom PHP [H] |
| MIT CSAIL HCI | Yes | 6 themes (text lists) | n/a (none on site) | n/a | **Chips by group** | Semester only | Yes (1 rule) | Jekyll [D] |
| MIT Media Lab | Yes | Groups + initiatives + tags | Year range + tags | No | By role | Yes | Yes (2 rules) | Custom [U] |
| BAIR | **No** | Initiatives | [U] | [U] | Role pages | [U] | No | Next.js + MUI [D] |
| CMU HCII | Yes | 18 areas | No (tech reports) | No | Role pages | Events yes, news no | Yes (1) | Drupal 10 [D] |
| Ink & Switch | Yes | **4 areas + glyphs** | Writing index | No (plain cite) | [U] | Yes (month/year) | No | Static [U] |
| Google PAIR | Yes | Tags on pubs | No | No | [U] | Pubs by year | No | Hugo 0.54 [D] |
| Senseable | **No** | Projects strip | Facets (legacy) | No | Collapsible groups | Newsletters monthly | No | React + lab DB [D] |
| UTD CLBOE | Yes | Prose list | **No pubs** | No | Tables | Stale archive | No | WordPress [D] |
| Wharton BCFG | Yes | Approach page | No | No | No | Events by year | Yes (1) | WP + WPBakery [D] |

Reading the matrix:
- **No profiled site has a filterable publication list with copyable BibTeX.** UW IDL has BibTeX per paper but no filters.
- **Only MIT HCI filters people by group.**
- **Only Ink & Switch ties every work item back to its research areas visually.**

These three gaps are BOBALAB's opportunity. [H, based on the matrix]

---

## 4. (a) Fifteen patterns worth adapting

| # | Pattern | Source site | How BOBALAB adapts it |
|---|---|---|---|
| 1 | **One master form, one variant per research unit** (a glyph system, not random generation) | MIT Media Lab 2014 identity [C: S11] | Draw one BOBALAB pearl, then give each direction a variant (inner mark, tint, highlight pattern). Use it in the hero, as the page header on direction pages, and as a tag. |
| 2 | **Area icons as tags on every work item** | Ink & Switch [D src: S17] | Every paper, project and news item shows 1–3 small pearl dots for its directions, with text labels for screen readers. |
| 3 | **Area page = problem → one-line definition → featured work → active notes → projects → sibling areas → subscribe** | Ink & Switch [D: S18] | Basis for the research-direction template (§7.4). |
| 4 | **Playful object above, plain index directly below, with a scroll prompt** | Ink & Switch "Tenfold" [D src: S17] | The boba cup is the hero. Directly beneath it is the same set of directions as an accessible card list. Never the cup alone. |
| 5 | **Explorables: interactive figures placed beside the text they explain, ending with further reading and credits** | Google PAIR [D: S21] | One small interactive per flagship finding, built over time. Each needs a text summary and keyboard-operable controls. |
| 6 | **Counts plus URL-encoded filters on the research index** | MIT Media Lab [D src: S6] | `/publications?direction=gig-work&type=working-paper` gives shareable views. Show counts on filter chips. |
| 7 | **"Accepting applicants" badges per unit** | MIT Media Lab [D src: S6] | An "Open to RAs / collaborators" flag per direction or project, which feeds the Join page. |
| 8 | **Single-paper page: teaser figure + materials row + abstract + copyable BibTeX** | UW IDL [D: S29] | Paper page template (§7.6). Add SSRN and working-paper versions, which matter in operations and economics. |
| 9 | **Accessible filter chips (real buttons, `aria-label`, one scrolling row on mobile)** | MIT CSAIL HCI [D src: S5] | People filter by role and direction. Publications filter by type and direction. |
| 10 | **Opt-in delight that never blocks content** (keyboard easter eggs, a rotating spotlight) | MIT CSAIL HCI [D src: S5] | For example, a "pearl of the week" member or paper spotlight, and a hidden "shake the cup" key. Off under reduced motion. |
| 11 | **People and projects with start/end dates and manual rank; alumni derived from dates** | Senseable feed schema [D src: S24] | The editing interface stores `start`/`end`, and the site moves people to Alumni automatically. |
| 12 | **Member self-service profile editing** | BAIR (log-in and profile-update strings) [D src: S12; H on workflow] | Lab members edit their own card (photo, interests, links) in the private interface. The PI or an admin approves. |
| 13 | **Event cards with a prominent date badge** | CMU HCII [D: S13] | Talks and events show a day/month/year badge. News always shows the full date. |
| 14 | **Breadcrumbs + research-area pills on project pages; tag-aggregated feeds on area pages** | CMU HCII [D: S14–S15] | Project pages link up to their direction(s). Direction pages auto-list tagged projects, papers and news. |
| 15 | **Plain-language findings with scale cues, plus newsletter/RSS and a "maintained by / last updated" footer** | Wharton BCFG [D: S27]; Ink & Switch RSS [D src]; MIT HCI footer [D: S5]; UTD "Last Updated" [D: S26] | A "What we've learned" homepage block, an RSS feed for news, and a footer showing the last-updated date plus a contact for site fixes. |

---

## 5. (b) Anti-patterns to avoid

| Anti-pattern | Seen at | BOBALAB rule |
|---|---|---|
| Undated news, or dates without year | Stanford HCI news; MIT HCI seminar [D] | Every item gets a full ISO date, shown as "Oct 20, 2026". |
| Research as bare link lists or prose topic lists | MIT HCI [D]; UTD [D] | Every direction has a question, findings and outputs. |
| Hundreds of publications on one page, no search or filter | Stanford HCI, LISH, PAIR [D] | Filters, search, year anchors and counts. |
| Hand-typed citations → typos, duplicates, inconsistent venues | Stanford "Procedings"; LISH 3021; PAIR duplicates [D] | One structured publication source (BibTeX or YAML) with validation in the editor. |
| Client-only rendering (blank without JS) | BAIR, Senseable [D src] | Static or SSR HTML. JS only for enhancement. |
| Disabling zoom | Media Lab (`user-scalable=no`) [D src] | Never set `maximum-scale` or `user-scalable=no`. |
| Missing `lang`, charset or alt; headings used for styling | Stanford; Media Lab; MIT HCI (66 h1) [D src] | Lint in CI: lang, charset, alt, one `h1`, landmark structure. |
| Auto-rotating hero text or carousels with no pause or reduced-motion path | PAIR, BCFG [D src] | No carousels. Any ambient motion stops within 5 s or has a pause control (WCAG 2.2.2, S32), and respects `prefers-reduced-motion` (S33). |
| Pointer-only interactive figures, no text equivalent | PAIR explorable [D: S21] | Keyboard controls plus a "what this shows" text summary per interactive. |
| Repeated generic link text ("Read the Article", "View Details") | BCFG, CMU [D] | Link text includes the title, or `aria-label`s carry it. |
| Tab sprawl and keyword clouds | Media Lab group page (~15 tabs, ~90 tags) [D] | At most 5–6 nav items, and at most about 8 curated method/topic tags. |
| Huge unfiltered people pages | BCFG (~190), Stanford alumni (~120) [D] | Filter chips. Collapsed alumni grouped by year. |
| Stale "current" labels and old photos | UTD seminar archive; Stanford photo file dated 2022 [D] | Data-driven "upcoming vs past" from dates. A yearly photo-refresh reminder in the editor. |
| Unpinned or legacy dependencies | LISH `@latest`; Stanford jQuery 1.3.2; Senseable SIMILE and Universal Analytics; UTD multiple jQuery versions [D src] | Pin exact versions. Minimal JS. No page-builder plugins. |
| A novel metaphor as the only navigation | (risk for BOBALAB itself) [H] | The cup is an enhancement. The nav always has a plain "Research" link and a card list. |
| A school template drowning the lab | UTD (~330 links) [D src] | Own lean header. Haas/Berkeley affiliation in a header lockup and the footer. |

---

## 6. (c) Where business-school and operations labs fall short, and how BOBALAB can stand out

**Typical shortfalls (from UTD CLBOE, Wharton BCFG, HBS LISH and the Haas labs page):**
1. **"Lab" means a facility.** At Haas, the official research-labs page lists only shared experiment and participant-pool labs [D: S30]. Faculty-led research groups have little web identity. [H: I did not survey all Haas faculty sites; U on how many exist]
2. **The lab lives inside the school template.** The school's global navigation outweighs the lab's own content [D src: S26].
3. **Research is shown as topics or citations, not questions and findings.** UTD uses a prose list, BCFG a title-plus-journal list, LISH text-only tracks [D: S26–S28].
4. **Publications are an afterthought.** UTD has none, BCFG has no authors or filters, LISH runs 20 years on one page [D]. Working papers on SSRN, which are central in OM and economics, are rarely first-class objects [H].
5. **Freshness decays.** UTD's seminar archive labeled "current" holds 2019–20 entries [D]. Many sites show no "last updated" date.
6. **People pages are rosters.** They lack interests, directions or alumni outcomes [D: S26–S27].
7. **There is no explicit path for industry and data partners**, even though empirical and field-experimental operations research depends on partners [H]. BCFG's Funders/Opportunities pages are the exception [D: S27].
8. **Nothing is interactive or visual about the findings** [H, from all three samples].

**How BOBALAB can stand out:**
- **Findings-first direction pages.** Each pearl answers "what question / what we found / why it matters for workers, platforms, managers and policy" before listing papers.
- **A recognizable but disciplined identity.** A pearl glyph system (pattern 1) used consistently as tags. It is playful in form but restrained in color and motion, with Berkeley affiliation clearly visible (see §7.11).
- **The best publication page in the peer set:** filters by direction, type (journal / working paper / conference / chapter / dissertation), year and member, plus PDF / SSRN / DOI / code / data / slides links and copyable BibTeX. No profiled site does all of this (§3).
- **One or two explorables** (pattern 5) for flagship results. The topics Prof. Park lists publicly, such as gig work, human-AI decision support and pricing, lend themselves to small simulations. [D for topics: S34, S35; H that they suit explorables]
- **A "Work with us" page for three audiences:** prospective students and RAs, industry and data partners (the kinds of collaborations, how data is handled, a contact), and press or the public.
- **Built-in freshness:** dated everything, alumni derived from dates (pattern 11), member self-editing (pattern 12), and an automatic "last updated" stamp.
- **Fast and accessible by default:** static HTML, no carousels, zoomable, reduced-motion aware. This alone beats several elite references (§5).

---

## 7. (d) Concrete recommendations

### 7.1 Navigation labels (plain words, boba flavor in microcopy only)

- **Header:** `BOBALAB` wordmark plus pearl (links to Home) · **Research** · **Publications** · **People** · **News** · **Join**
- **Footer:** About & Contact · Accessibility · RSS · "Haas School of Business, UC Berkeley" lockup · last-updated date · "Site issue? Email …".

Rationale for the labels:
- Every strong reference uses plain labels: Research, People and Publications/Papers appear across Media Lab, CMU, UW IDL and BAIR [D].
- Five items or fewer keeps the header to one line at 375 px [H].
- Boba vocabulary goes in section intros, empty states and the 404 page, not in navigation, to protect credibility [H].
- Use "Join" or "Join us" rather than "Opportunities" because it is shorter and clearer. The page itself serves students and partners [H].
- If the PI wants an "About" item, merge it into the homepage plus the footer rather than adding a 6th nav item [H].

### 7.2 Page list (sitemap)

| Path | Page | Notes |
|---|---|---|
| `/` | Home | §7.3 |
| `/research` | Research index | Cup visualization plus an accessible card list of directions, with active projects underneath |
| `/research/{direction}` | Research direction ("pearl") | 4–6 pages. Template §7.4 |
| `/projects/{slug}` | Project | Optional per project. Template §7.5 |
| `/publications` | Publications | Filters and search. §7.6 |
| `/publications/{slug}` | Paper | Materials row and BibTeX. §7.6 |
| `/people` | People | Filters, alumni. §7.7 |
| `/people/{slug}` | Person (optional) | Only for members who opt in. Otherwise link out to their own site |
| `/news` and `/news/{slug}` | News & talks | §7.8. RSS at `/news/feed.xml` |
| `/join` | Join / work with us | Students and RAs · partners · press |
| `/about` | About & contact | Mission, PI short bio, affiliation, address, contact |
| `/accessibility` | Accessibility statement | How to report barriers |
| `/404` | Not found | The one place for a boba joke |
| `/admin` (private) | Editing interface | Not linked publicly. Tool chosen elsewhere (R6). §7.10 gives the content model it must support |

### 7.3 Homepage section order

1. **Hero:** lab name (expanded once: Berkeley Operations and Behavioral Analytics Lab), one-sentence mission, and the **interactive boba cup**, with one labeled pearl per direction. A visible "View all research" link sits next to the cup. (Patterns 1 and 4.)
2. **Research directions as cards:** the same directions as a plain list (pearl glyph, name, one-line question, "Open to RAs" badge if set). On mobile this list *is* the primary navigation and the cup is reduced to a small illustration. (Patterns 3, 4 and 7.)
3. **What we've learned:** 2–3 featured findings, each a plain-language sentence with a scale cue, a direction pearl and a link to the paper or explorable. (Patterns 5 and 15.)
4. **Latest news:** the 3 most recent items with full dates, then "All news". (Pattern 13.)
5. **Recent publications:** 5 entries with type badges (Journal / Working paper / Conference), materials links and pearl tags, then "All publications". (Pattern 8.)
6. **People strip:** PI plus current members (photos only with consent), then "Meet the lab". (Pattern 9.)
7. **Join / work with us:** two short calls to action, "Students & RAs" and "Partners & data collaborators". (Pattern 7.)
8. **Footer:** affiliation lockup, address, contact, RSS, accessibility, last updated. (Pattern 15.)

### 7.4 Research-direction ("pearl") page template

1. **Header:** large pearl glyph in the direction's tint, the direction name as the sole `<h1>`, a one-line guiding question, and a status line ("Active since 20XX · N projects · N papers", with counts computed from tags).
2. **The question (why it matters):** 80–150 words, problem first (Ink & Switch pattern). Who is affected: workers, platforms, managers, policymakers.
3. **What we've found:** 2–4 findings in plain language. Each is linked to its paper and labeled *published* or *working paper*, so the evidence level is honest.
4. **Explorable / key figure (optional):** an interactive or static figure with a caption, a "what this shows" text summary and keyboard controls. Motion off under reduced-motion.
5. **Projects in this direction:** auto-listed cards (title, status Active/Completed, years, partner type, 1 line).
6. **Publications in this direction:** auto-filtered from the publication data, newest first, with type badges and a "See all in Publications" link that preserves the filter (`?direction=…`).
7. **People:** auto-listed members tagged with this direction, plus external collaborators if they have consented.
8. **Methods & data:** at most about 6 tags (e.g., field experiments, econometrics, reinforcement learning, platform data).
9. **Related directions:** the other pearls as small glyph links, with previous/next pearl.
10. **Work with us on this:** shown only if the "open to RAs/collaborators" flag is on.
11. **Footer line:** "Last updated {date}".

### 7.5 Project page template

1. Breadcrumb: Research › {Direction} › {Project} (CMU pattern).
2. Title (`h1`), one-sentence summary, **pearl tags** (1–3), status, start and end years.
3. Hero figure or photo with alt text and caption. No autoplay video, or if video is used, muted with controls.
4. Plain-language overview: question, setting, approach (≤ 250 words).
5. Key findings (if any), each with an evidence label (published / working paper / preliminary).
6. Team: lab members linked to People; external collaborators named only with consent; partner organizations only if public.
7. **Outputs, as a materials row:** Papers · Working paper (SSRN) · Slides · Code · Data · Talk video · Media coverage (UW IDL pattern).
8. Funding / acknowledgments (optional).
9. Related projects in the same direction(s).
10. "How to cite" block when the project has a canonical paper.

### 7.6 Publications page and single-paper page

**Index (`/publications`):**
- **Controls**, as a sticky bar on desktop and a collapsible "Filters (n)" button on mobile:
  - search box with a visible label;
  - chips for Direction (pearls) and Type (Journal · Working paper · Conference/Proceedings · Book chapter · Dissertation · Other);
  - Year range;
  - Lab member (multi-select).
  - The result count is announced in an `aria-live` region.
  - Filter state lives in the URL (Media Lab pattern).
- **Grouping:** by year with jump links. Working papers can optionally be pinned in their own group at the top.
- **Entry anatomy:**
  - Title (links to the paper page).
  - Authors, with lab members highlighted and linked.
  - Venue in italics, year, status (e.g., *Major revision*, *Forthcoming*) and awards.
  - Pearl tags.
  - Materials row: PDF · SSRN · DOI · Code · Data · Slides · Video · Press.
  - Every link label includes the paper title for screen readers.
- **Data:** a single structured source (BibTeX or YAML) validated by the editor: required fields, DOI format, no duplicate keys, year sanity checks. This prevents the typo and duplicate failures seen at Stanford, LISH and PAIR.

**Single paper (`/publications/{slug}`):**
- Title, authors, venue and year, status, pearl tags.
- Teaser figure (optional).
- **"In brief"**: a 2–3 sentence plain-language summary written by the lab.
- Abstract: reproduce only if the authors hold the rights (e.g., their own working paper); otherwise link out.
- Materials row.
- **Copyable BibTeX** (a button with "Copied" feedback announced to screen readers).
- Related papers and the project(s) it belongs to.

### 7.7 People page

- **Order:** PI (Faculty Director) · Postdocs · PhD students · Pre-docs & research staff · Undergraduate RAs · Affiliates & collaborators · **Alumni** (collapsed, grouped by end year, with "now at…" only if the person provides it).
- **Filters:** role chips plus direction (pearl) chips, built as real buttons in one scrolling row on mobile (MIT HCI pattern). No search is needed under about 40 people. [H]
- **Card:** photo (optional and consented, otherwise a pearl-initial avatar), name, role, 1–2 interest phrases, pearl tags, and links (personal site, Google Scholar, LinkedIn: member's choice). Email only if the member opts in.
- **Sorting:** by role, then member-chosen `rank`, then last name. Never first name only (the Stanford issue).
- **Data:** `start` and `end` dates drive Current vs Alumni automatically (Senseable pattern). Members edit their own card in the private interface, with admin approval (BAIR hint).
- **Privacy:** publish only what each member approves. No birthdays, hometowns or personal photos without consent. [H, per task rules]

### 7.8 News

- **Types** (badge plus icon): Paper accepted · Award · Talk/Event · Media · New member/Welcome · Lab life.
- **Item:** full date (day, month, year), type badge, headline, 1–3 sentence body, links to people, directions and papers (auto cross-listing, CMU and Ink & Switch patterns).
- **Index:** reverse chronological with year anchors and a type filter. "Upcoming talks" is computed from dates (no stale "current" labels).
- **Distribution:** RSS feed (Ink & Switch). A newsletter is optional later (BCFG and Ink & Switch use one). [H on whether the lab wants it]
- **Homepage:** the 3 latest items. Never show an item without its date.

### 7.9 Pearl interaction and motion spec (guardrails for "tastefully animated")

1. **Semantics first:**
   - Each pearl is an `<a href="/research/{slug}">` with a visible text label, shown on hover and focus on desktop and always shown on touch screens.
   - The cup is a decorative SVG container.
   - The same links exist in the card list below (pattern 4).
2. **Ambient motion is subtle and finite:**
   - Pearls "settle" into the cup in ≤ 1.5 s on first load.
   - Any idle bobbing stops within 5 s, or a visible "Pause motion" toggle is provided. Indefinite auto-motion needs a pause mechanism under WCAG 2.2.2 (Level A). [D: S32]
3. **Respect `prefers-reduced-motion`:** a static cup, no settle, and instant hover states. WCAG technique C39 uses exactly this query. [D: S33]
4. **Interaction feedback:**
   - Hover/focus: a slight lift (scale ≤ 1.06) plus a label and a 2–3 px focus ring with ≥ 3:1 contrast.
   - Activation: optional View Transition morphing the pearl into the direction page's header glyph (progressive enhancement), with ordinary navigation as the fallback. [H on implementation]
5. **Targets:** at least 44×44 px on touch. Pearls never overlap their hit areas.
6. **Color is never the only cue:** each pearl has a glyph variant *and* a text label (Berkeley brand guidance also says not to rely on color alone). [D: S31]
7. **Performance:** SVG plus CSS. Hero JS under about 50 KB. No WebGL. No layout shift (reserve the cup's dimensions). [H, a budget suggestion]
8. **Delight budget:** at most one hidden easter egg (e.g., the "b" key shakes the cup) and one rotating spotlight ("pearl of the week"). Both are off under reduced motion (pattern 10).

### 7.10 Content model the private editing interface must support (so pages stay fresh)

| Collection | Key fields | Drives |
|---|---|---|
| `directions` | slug, name, guiding question, glyph variant, tint, overview, findings[] (text, paper ref, evidence label), methods[], open_to_collaborators (bool), order | Pearls, direction pages, homepage cards |
| `projects` | slug, title, summary, directions[], status, start, end, team[] (person refs), collaborators[] (consented), partners[] (public only), outputs[] (typed links), hero image + alt, related[] | Project pages, direction aggregation |
| `publications` | key, title, authors[] (with person refs), venue, year, status, type, directions[], links {pdf, ssrn, doi, code, data, slides, video, press}, award, bibtex, in_brief, teaser image + alt | Publications index and pages, direction lists, homepage |
| `people` | slug, name, role, start, end, rank, interests[], directions[], photo (consent flag), links {site, scholar, linkedin, email (opt-in)}, now_at (opt-in) | People page, alumni (auto), project teams |
| `news` | slug, date, type, title, body, people[], directions[], publications[], link | News, homepage, cross-listing, RSS |
| `site` | mission, contact, address, affiliation lockup, last_updated (auto) | Header, footer, About |

Editor validations:
- required alt text on every image;
- date required on news;
- DOI and URL format checks;
- duplicate-title warning on publications;
- consent flag required before a person's photo is published.

### 7.11 Visual language starting points (to be refined by the design workstream)

- **Palette:**
  - A warm milk-tea neutral background with dark tapioca-brown text, which must reach ≥ 4.5:1 contrast for body text [H].
  - One Berkeley accent for links and focus. **The current Berkeley Blue is #002676 and California Gold is #FDB515** per the brand site [D: S31]. BAIR still uses the older #003262 [D src: S12], so confirm which to use.
  - 4–6 restrained direction tints, never saturated candy colors [H].
- **Type:** one characterful display face plus a highly legible text face, both self-hosted and variable. Ink & Switch's serif/sans/mono trio shows how this conveys "thoughtful lab" without corporate stiffness [D src for their fonts; H for applicability].
- **Imagery:** research figures and the lab's own photos over stock. Pearl glyphs act as the illustration system, so no clip-art boba [H].
- **Motion:** only in the hero, on hover/focus feedback, inside explorables and in page transitions. Never autoplay carousels [§5].

---

## 8. Open questions

1. How many research directions, with what names and guiding questions? Only Prof. Park can define the pearls. His public interests (future of work and gig economy, human-AI, people analytics, behavioral pricing, urban analytics) suggest 4–6. [D for interests: S34, S35; H for the grouping]
2. Domain and branding constraints: does Haas or Berkeley require a specific lockup, domain (e.g., a berkeley.edu subdomain) or template for faculty lab sites? [U]
3. Which members consent to photos and profiles, and should alumni "now at" lines be shown? [U]
4. Who will build and maintain explorables, and are there flagship findings the PI is comfortable illustrating interactively (including working papers)? [U]
5. Does the lab want a newsletter, or is RSS plus news enough? [U]
6. Should industry and data partners be named publicly? This depends on agreements. [U]
7. **Re-run visual and mobile verification with a rendering browser** (screenshots at 375 px and 1280 px) for Media Lab, BAIR, Senseable, Ink & Switch and PAIR. This report infers their mobile behavior from CSS. [Method limit]

---

## 9. Sources (all accessed 2026-10-20)

Raw HTML, CSS and JS copies are in `research/raw/r3/`. The audit script is at `research/tools/audit.py`.

- S1 Stanford HCI homepage: https://hci.stanford.edu/ (plus `/templates/*.css`)
- S2 Stanford HCI research: https://hci.stanford.edu/research/
- S3 Stanford HCI people: https://hci.stanford.edu/people/
- S4 Stanford HCI paper page: https://hci.stanford.edu/publications/paper.php?id=538 ; `/publications/` meta-refresh
- S5 MIT CSAIL HCI: https://hci.csail.mit.edu/ (plus `/assets/css/interactive.css`, `/assets/js/main.js`)
- S6 MIT Media Lab research: https://www.media.mit.edu/research/ (plus `/static/styles/app.css`, `/static/v2/css/app.css`)
- S7 Media Lab publications: https://www.media.mit.edu/publications/
- S8 Media Lab group page: https://www.media.mit.edu/groups/affective-computing/overview/
- S9 Media Lab project page: https://www.media.mit.edu/projects/ai-guidance-in-k-12-schools/overview/
- S10 Media Lab people: https://www.media.mit.edu/people/
- S11 Media Lab identity: https://www.pentagram.com/work/mit-media-lab ; https://www.pentagram.com/news/mit-media-lab ; https://www.dezeen.com/?p=579622 ; https://www.itsnicethat.com/articles/pentagram-mit ; https://segd.org/?p=3444
- S12 BAIR: https://bair.berkeley.edu/ (plus `/_next/static/chunks/app/(root)/layout-1e0846d6e006a522.js`, CSS chunks)
- S13 CMU HCII homepage: https://hcii.cmu.edu/
- S14 CMU research and area page: https://hcii.cmu.edu/research ; https://hcii.cmu.edu/research-areas/social-computing
- S15 CMU project and project index: https://hcii.cmu.edu/project/policycraft ; https://hcii.cmu.edu/project-types/faculty
- S16 CMU people: https://hcii.cmu.edu/people
- S17 Ink & Switch homepage: https://www.inkandswitch.com/ (plus `/static/base.css`, `/index.css`, `/index/tenfold/main.js`)
- S18 Ink & Switch area page: https://www.inkandswitch.com/malleable-software
- S19 Ink & Switch essay: https://www.inkandswitch.com/essay/malleable-software/
- S20 Google PAIR homepage: https://pair.withgoogle.com/ (plus `/js/pair-page.js`, `/css/pair-main.css`)
- S21 PAIR explorables: https://pair.withgoogle.com/explorables/ ; https://pair.withgoogle.com/explorables/measuring-fairness/
- S22 PAIR research: https://pair.withgoogle.com/research/
- S23 Senseable City Lab: https://senseable.mit.edu/ (plus `/public/bundle_20261006.min.js`, `/stylesheets/dist/application.css`)
- S24 Senseable public content feed (schema and counts only): https://senseabledb.mit.edu/api/website.jsonp
- S25 Senseable papers: https://senseable.mit.edu/papers/
- S26 UT Dallas CLBOE: https://jindal.utdallas.edu/centers-of-excellence/lboe/
- S27 Wharton BCFG: https://bcfg.wharton.upenn.edu/ ; https://bcfg.wharton.upenn.edu/journal_articles/ ; https://bcfg.wharton.upenn.edu/team/
- S28 HBS LISH: https://aiinstitute.hbs.edu/lish/ ; https://aiinstitute.hbs.edu/lish/research-tracks/ ; https://aiinstitute.hbs.edu/lish/publications/
- S29 UW Interactive Data Lab: https://idl.uw.edu/ ; https://idl.uw.edu/papers/mosaic
- S30 Haas research labs: https://haas.berkeley.edu/faculty-research/research-labs
- S31 UC Berkeley brand colors: https://brand.berkeley.edu/colors/
- S32 WCAG 2.2 Understanding SC 2.2.2 Pause, Stop, Hide: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- S33 WCAG 2.2 Understanding SC 2.3.3 Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- S34 Berkeley research profile of Prof. Sinchaisri: https://vcresearch.berkeley.edu/node/27088
- S35 Prof. Park's personal site, as captured by another workstream in `research/raw/park-site/index.html` (research-interest list only; canonical URL not re-verified in R3)
