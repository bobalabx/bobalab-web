# REFS-SIMPLE: homepages that are clear at first glance and reward exploration

Research for the BOBALAB "simplify" iteration. The owner's feedback: the live homepage is now too complicated. A first-time visitor has to decode the research timeline (years, publication dots, cross-direction links, black pearls, open rings, a legend) before they can explore.

Snapshot 2026-10-24. Playwright Chromium at desktop 1440x900 (DSF 1) and mobile 390x844 (DSF 2, iPhone UA), light scheme. Cookie banners were declined where a decline button existed. I looked at every screenshot cited here.

**Labels.** MEASURED = seen in a screenshot or counted by the probe. DOCUMENTED = the site says so. HYPOTHESIS = my judgement.

**Files** (outside the repo):
- Screenshots are in `scratchpad/simplify/refs/`, named `{site}-desktop.png`, `-desktop-full.png`, `-mobile.png` and `-mobile-full.png`.
- Interaction states are `atlasemotions-x1/x3`, `dschool-x1-menu`, `arena-x1-plus` and `stripepress-x1/x2`.
- The mobile contact sheets are `_sheet-mobile-a.png` and `_sheet-mobile-b.png`.
- Per-site first-screen metrics are in `_metrics.jsonl`.
- The scripts are in `scratchpad/simplify/tools/`: `shoot.js` (screens plus first-screen probe), `interact.js` (clicks and hovers) and `sheet.py`.

**Probe definitions.**
- *Words* means words in visible text whose element starts above the fold.
- *Interactive* means visible links, buttons and inputs in the first viewport.
- *Media* means visible images, SVGs, videos and canvases wider than 40 px.
- Caveat: the word counts for Hey Studio and Dynamicland are inflated by hidden or overlay text, and Wellcome's mobile count includes its cookie banner.

**Continuity with earlier research.** I kept two sites from `redesign/REFS-LABS.md` (Ink & Switch, Dynamicland) and re-shot them, because both changed or are directly relevant to "simple first, depth later". Everything else is new, chosen for homepage clarity rather than for "not looking AI-generated".

**Copyright.** No assets, copy or code from these sites goes into the repo. Notes are in my own words, and every "transferable principle" is meant as a principle, not a form.

---

## 0. Baseline: the live BOBALAB homepage (MEASURED)

`bobalab-live-desktop.png`, `bobalab-live-mobile.png`

| | Desktop | Mobile |
|---|---|---|
| Words above the fold | **215** | 115 |
| Interactive elements above the fold | 14 | 12 |
| H1 size | 36 px (largest text on the page) | 32 px |
| Page height | 3013 px | 4822 px |

**What the first screen asks a stranger to decode** (counted from the desktop screenshot):
- **8 visual encodings**: x = year; row = direction; colour = direction; filled dot = paper; vertical link = paper shared by two directions; large black pearl = "now"; open ring = in progress; grey band = the future.
- About 19 filled dots, 5 vertical links, 4 black pearls and 7 open rings.
- A 4-label year axis, plus "now" and "in progress".
- A 70-word caption that works as a legend ("Each filled dot is a paper… a vertical link joins… Open rings after the 'now' line…").

**Why this is hard to read** (HYPOTHESIS):
- The H1 is the same size as the four direction names (36 px MEASURED against roughly 34 px for the direction names, estimated by eye from the screenshot). So nothing is clearly first.
- The black pearl, the one "boba" moment, means "now", which is an abstract position rather than a thing a visitor can open.
- On mobile the timeline turns into per-direction strips, and the first pearl appears only after about 1,150 px of text.

**What is already right and should be kept:**
- The H1 sentence "How people learn to work with algorithms" is clear on its own.
- The mission sentence (`content/pages/home.yml`) answers who, what and how.
- Typography is clean, and there are no cards or pills.

**Unused assets in the content** (MEASURED from `content/directions/*.md`):
- Every direction has a `question:` field with a concrete, human question. One example: "Do gig workers get faster and more reliable with experience, and do they lean on or drift away from the app's recommendations as they learn?"
- Every direction has a `summary:` line.
- Every direction has a tea or boba-flavour colour name: butterfly-pea, lychee, matcha, oolong (plus jasmine and black-sesame for the two archived directions).
- These are a ready-made layer for progressive disclosure, and a source of warmth that is true to the lab, not decoration. None of it is visible on the homepage today.

---

## 1. Reference set at a glance (first screen, MEASURED)

| Site | Type | D words | D interactive | H1 / largest text, desktop | 5-second read (HYPOTHESIS) |
|---|---|---|---|---|---|
| Recurse Center | community / school | 61 | 10 | 54 px sentence | ✓ who + what + for whom |
| Wellcome Collection | museum and library | ~100 (cookie bar) | 17 | 31 px sentence | ✓ |
| Stanford Digital Economy Lab | peer research lab | **26** | 10 | **146 px** sentence | ✓ (but rotating word) |
| Atlas of Emotions | research explorable | 43 | 11 | 46 px | ✓ what, then one action ("Begin") |
| Stripe Press | publisher | 22 | 31 | name + tagline only | ½ (what it is comes from the objects) |
| Are.na | research tool / community | 84 | 7 | 19 px list | ✓ (wit carries it) |
| Stanford d.school | design institute | 121 | 8 | 19 px; italic selector | ½ (one control is clear; the cards are noisy) |
| People + AI Research (Google) | thematic sibling lab | 78 | 7 | 48 px | ✓ (but rotating word) |
| Nicky Case | explorable explanations | 121 | 10 | 40 px | ✓ (voice) |
| Ink & Switch | research lab | 65 | 5 | 32 px sentence (below the art) | ½ on desktop: the art comes first |
| Dynamicland | research lab | photo | 4 | photo with a "START HERE" sign | ✓ (one entry point) |
| School for Poetic Computation | school | 232 | 30 | 53 px sentence | ✓ (dense below) |
| *Brief notes* (§3): Collins, Teenage Engineering, UW IDL, ideas42, Hey Studio, Senseable City Lab, Arc, Ai2 / Busara / MIT Work of the Future / Growth Lab, Kurzgesagt | | | | | |
| **BOBALAB live** | | **215** | 14 | 36 px | ✗ the figure competes with the sentence |

**The pattern in the table.** Every site that reads in five seconds uses one of two first screens:
1. **One sentence, much larger than anything else** (Recurse, Digital Economy Lab, SFPC, Wellcome, Collins).
2. **One object or image plus one short line** (Atlas, Stripe Press, Dynamicland).

No clear site puts a multi-encoding figure on its first screen. The ones that show a lot (Senseable, SFPC below the H1, UW IDL) depend on the H1 sentence to carry comprehension.

---

## 2. Site studies

### 2.1 Recurse Center: https://www.recurse.com/
`recurse-desktop.png`, `recurse-mobile.png`, `recurse-desktop-full.png`

- **Clear because:**
  - The H1 is a single sentence that follows the pattern **[Name] is a [what] for [whom].** The name is set in a lighter, green, smaller line above the predicate, so the predicate is what you read.
  - Three real photos of people working sit underneath, followed by one primary button.
  - Interactive elements on the first screen: 10 on desktop (MEASURED).
- **Original or warm because:**
  - The logo is a pixel-art computer.
  - The photos are of real people in the real space: mugs, plants, a hand-wired LED board.
  - Further down, quotes from participants carry yellow highlighter on the key phrase.
  - The voice is plain and a little funny (it mentions a "Whac-A-Mole" game in one quote).
- **Depth on exploration:** the full page is one reading column of short sections, each with a light heading ("Dedicated time…", "A community…"). They alternate with photo rows and quotes. Directories (FAQ, user's manual, alumni) sit in the footer, not on the page.
- **Transferable principle:** *Name + predicate.* Make the H1 a definitional sentence and let the lab name be the subject, so the reader learns who and what in one line. Put real people right after it.
- **Don't copy:** the green pill button with an arrow, and the three-photo strip, which reads as a template when the photos are weaker than RC's.

### 2.2 Wellcome Collection: https://wellcomecollection.org/
`wellcome-desktop.png`, `wellcome-mobile.png`

- **Clear because:**
  - The first line under the nav is a 31 px descriptive sentence: "A free museum and library exploring health and human experience." It states the type, a distinguishing fact ("free") and the subject.
  - Then exactly **one** featured item: a large photo with a title and a two-line description.
- **Original or warm because:** the bold custom wordmark and confident yellow accent rules (DOCUMENTED house style). The photography is of real exhibitions, with people in them.
- **Depth:** "This week", then stories, then collections. Each section is a level deeper, and none of them is on the first screen.
- **Transferable principle:** *Sentence, then one featured thing.* The first screen says what the place is and shows one current item. It does not try to show everything.
- **Don't copy:** the tag-on-image labels ("Exhibition") and the dark text panel. Those are card idioms we have removed.

### 2.3 Stanford Digital Economy Lab: https://digitaleconomy.stanford.edu/ (thematic peer)
`digecon-desktop.png`, `digecon-mobile.png`, `digecon-desktop-full.png`

- **Clear because:**
  - The H1 is set at **146 px**, with just 26 words above the fold (MEASURED). The first screen is almost entirely the sentence "Researching the Economics of AI for …".
  - The page states its topic before anything else. Whitespace does the work.
- **Original because:**
  - Each of the four research areas has its own **geometric glyph** made from one rule: half-discs and quarter-discs in two reds.
  - The areas sit in a 2x2 grid immediately below the hero, each as a title, a one-line summary and a glyph. That is a legend-free way to say "we have four directions, here they are".
- **Depth:** quote from the executive director, then photos of the lab at work, then a statement campaign, then about. Each block is a single idea.
- **Transferable principle:**
  - *Directions as four glyphs from one rule, each labelled in words, each opening a page.* This is the most direct analogue to "pearls as directions". It works because the label is right next to the shape and there is nothing to decode.
  - *One huge sentence* is enough of a hero for a research lab.
- **Don't copy:**
  - The **typewriter-rotating final word** (workers / businesses / science / prosperity / everyone). It breaks our "no auto-rotating text" rule, and the screenshot catches it mid-cycle.
  - The white rounded cards.
  - The specific half-disc vocabulary. Ours must come from boba, not Bauhaus.

### 2.4 Atlas of Emotions (Ekman and Stamen): http://atlasofemotions.org/
`atlasemotions-desktop.png`, `atlasemotions-x1-begin.png`, `atlasemotions-x3-click.png`, mobile

- **Clear because:**
  - The first screen holds one title ("Welcome to the Atlas of Emotions"), one sentence on what it is ("an interactive tool that builds your vocabulary of emotions…") and **one action, "Begin"**.
  - It uses 43 words and 2 media elements (MEASURED).
- **Original because:**
  - On "Experience", the five universal emotions appear as five large translucent concentric-ring circles. Each one is **labelled directly in its own colour** (ANGER, FEAR, DISGUST, SADNESS, ENJOYMENT).
  - Clicking one opens a small panel with a **one-sentence plain-language definition** ("We get angry when something blocks us or when we think we're being treated unfairly") and a way to go deeper.
  - The side column says "Select an emotion to learn more". That single instruction replaces a legend.
- **Depth:** five chapters (Introduction, Timeline, Experience, Response, Strategies), each a more detailed visualisation. The complex charts live **after** the simple circles, never before them.
- **Transferable principle:** this is the closest model for refined pearls.
  - **A small number of round objects, each named in words on the object.**
  - **One instruction.**
  - **Click reveals one human sentence, then a link to the full story.**
  - Complexity, like our timeline, comes later and behind an explicit choice.
- **Don't copy:**
  - Scroll-jacking. The "Timeline" chapter rendered as an almost empty dark screen while I scrolled (`atlasemotions-x1-begin.png`).
  - Slow transitions.
  - The thin 300-weight type, which has low contrast.
  - Glowing translucent gradients, which edge towards the "glossy orb" tell in DIRECTION.md §1.

### 2.5 Stripe Press: https://press.stripe.com/
`stripepress-desktop.png`, `stripepress-x1-hover.png`, `stripepress-x2-click.png`, mobile

- **Clear because:** the products *are* the page. The first screen is a stack of book spines with real titles and authors, and you understand "this is a publisher" without being told. The only text is the name and the tagline "Ideas for progress" (22 words, MEASURED).
- **Original because:**
  - The spines are rendered as tactile 3D objects in a dark warm room.
  - Clicking a spine turns the book to its cover and opens the description beside it (`stripepress-x2-click.png`).
  - A thin tick rail on the left shows the position in the collection.
- **Depth:** shelf, then book, then excerpt or purchase. Every level is reached by touching the object itself.
- **Transferable principle:** ***The object is the navigation.*** If the four directions are pearls, a pearl should open its direction the way a spine opens its book, not via a separate link list. The rail of ticks is a quiet "you are here" for a collection.
- **Don't copy:**
  - The WebGL and canvas weight (2 canvases plus a video).
  - Its weak "what is this?" for strangers.
  - The 31 interactive elements above the fold.
  - The dark, luxurious palette.
  - The 3D gloss in general. It would reproduce the glossy-pearl tell we removed.

### 2.6 Are.na: https://www.are.na/
`arena-desktop.png`, `arena-x1-plus.png`, mobile

- **Clear because:**
  - "Are.na is" is followed by a lettered list: a) online software for saving and organizing content, b) "a toolkit for assembling new worlds from the scraps of the old", c) `+`.
  - Then one paragraph and two buttons. The type is small (19 px) inside a lot of whitespace, and the definition still lands.
- **Original or warm because:**
  - The `+` on line c adds a definition contributed by a community member ("A curated portal to the internet, Added by kent", `arena-x1-plus.png`). It is wit and participation in a definition list.
  - "For the last **15 years and 76 days**" is a live counter: honest data used as voice.
- **Depth:** "How it works" uses a product screenshot with a stepper (Capture / Arrange / Search). Detail comes only after the definition.
- **Transferable principle:** *Personality through a precise, honest detail and one small surprise.* You do not need decoration for it. A list that defines the lab and reveals one more line on interaction is simple and memorable.
- **Don't copy:** the lettered list form itself, and the user-contributed lines (we have no community input). The live day counter is fine only if it is honest, for example "since 2022" from site data.

### 2.7 Stanford d.school: https://dschool.stanford.edu/
`dschool-desktop.png`, `dschool-x1-menu.png`, `dschool-mobile.png`

- **Clear because:** the first screen offers **one control** in the form of a sentence: "I'm curious about… *Everything*" with a red round button. Opening it gives six completions ("…studying *design*", "…applying design to *my work*", "…designing with *emerging tech*", …), and the cards below re-filter.
- **Original or warm because:**
  - The red italic display serif.
  - The painted ragged red band holding "About the d.school".
  - Tilted, overlapping cards, like a pinboard.
- **Depth:** the selector *is* progressive disclosure. The visitor picks a path, and the page shows only that path.
- **Transferable principle:** ***Let the visitor finish the sentence.*** A single sentence-shaped control ("I'm curious about … [Algorithmic Advice]") is a legend-free way to choose a direction. It is a strong candidate for how pearl selection could read on mobile.
- **Don't copy:**
  - The tilted collage cards (cognitive load: 28 media elements on the first screen, MEASURED).
  - The painted brush band.
  - The "About" statement placed at the bottom of the first screen, where it is easy to miss.

### 2.8 People + AI Research (PAIR, Google): https://pair.withgoogle.com/ (thematic sibling)
`pair-desktop.png`, `pair-mobile.png`

- **Clear because:** "We are Researchers" (48 px), then a plain paragraph: "a multidisciplinary team at Google that explores the human side of AI…". Navigation is five words.
- **Original or warm because:**
  - A large **hand-drawn ink and watercolour** illustration: a small figure looking up at a cloud of geometric marks.
  - The tone is humane and the topic is close to BOBALAB's.
- **Depth:** "Check out our work", then the guidebook, explorables and tools, which are separate destinations.
- **Transferable principle:** *A single authored image that is about people and AI does more for warmth than any UI flourish.* It is clearly made by someone, not generated.
- **Don't copy:**
  - The rotating "We are Designers / Researchers" headline (rotating text again).
  - Commissioning an illustration style we cannot keep up.
  - Thin 300 body text.

### 2.9 Nicky Case: https://ncase.me/
`ncase-desktop.png`, `ncase-mobile.png`

- **Clear because:** "**Hi, I'm Nicky!** I make shtuff for curious & playful folks." The visitor is greeted in the first person, with one sentence of who and what.
- **Original or warm because:**
  - A self-portrait drawing peeks over the content box.
  - A tiny envelope with a heart and an RSS icon with feet.
  - A section titled "SHTUFF YOU CAN PLAY".
  - Each item is a picture plus one line that says what you will *do* ("an interactive guide to the game theory of why & how we trust each other").
- **Depth:** every item is an explorable you can play. The homepage is just the shelf.
- **Transferable principle:**
  - *Warmth is mostly voice.* A greeting and a verb-led line per item ("play", "explore") tells people what happens when they click.
  - *Describe each research thread as a question a person could ask.* BOBALAB already has these in `question:`.
- **Don't copy:** the cartoon register, the misspelled jokes and the rounded speech-bubble box. They are too childish for Prof. Park's audience (HYPOTHESIS), and the owner explicitly warned against "childish".

### 2.10 Ink & Switch: https://www.inkandswitch.com/ (continuity, re-shot)
`inkandswitch-desktop.png`, mobile

- **What changed since the last study:**
  - The homepage now opens with "Tenfold", a 10-year anniversary piece: ten line-drawn interactive letterforms spelling INK & SWITCH, with "Play with it! Click/drag everywhere."
  - The plain H1 ("An independent research lab exploring the future of tools for thought") moved below it.
- **Clear because:** on the right, five short lines say what it is and what to do ("Play with it!"). Below the fold the page is the same calm reading list as before.
- **Original because:** each letter is a small toy built "with technology from our research" (DOCUMENTED). The playful object is evidence of the work, not decoration.
- **Transferable principle:** *Play is acceptable on a research homepage when (a) it is optional, (b) one line explains it, and (c) it is made of the lab's own ideas.*
- **Don't copy:**
  - Putting the art *before* the definition. On desktop, a stranger sees letterforms first and the sentence second.
  - The black field.
  - The monoline-art vocabulary.

### 2.11 Dynamicland: https://dynamicland.org/ (continuity, re-shot)
`dynamicland-desktop.png`

- **Clear because:**
  - One photograph of a real shelf. A hand-made **"START HERE"** sign with an arrow points at the first item (a "6-minute intro" video).
  - Every item is labelled with its format and length ("Video, 6 min", "Essay, 5 pages").
- **Original or warm because:** it is a photo of a physical place made by people: a quilted DYNAMICLAND banner, laminated cards, tin cans.
- **Transferable principle:**
  - ***Name the one first step.*** A visitor should never wonder where to begin.
  - *Honest metadata (format, length) lowers the cost of clicking.*
- **Don't copy:** the photo-as-whole-page approach (accessibility: tiny text in the image), and the hand-made shelf aesthetic, which is theirs.

### 2.12 School for Poetic Computation: https://sfpc.study/
`sfpc-desktop.png`, mobile on `_sheet-mobile-a.png`

- **Clear because:** the 53 px H1 is a complete definitional sentence: "The School for Poetic Computation is an experimental school in New York City and online supporting interdisciplinary study in art, code, hardware and critical theory." It answers who, what, where and which fields.
- **Original or warm because:**
  - Blackletter and monospace mixes.
  - A CRT glow.
  - A footer toggle: "you are in cathode ray mode. switch to liquid crystal mode."
  - A tilted "Stay updated" sticker.
- **Depth:** the classes grid sits right under the H1. It is dense (232 words and 30 interactive elements, MEASURED), but the H1 has already done the job.
- **Transferable principle:** *A mode switch is personality that costs nothing at first glance.* It is a hidden, optional delight. For BOBALAB this could be a small easter egg tied to boba (HYPOTHESIS: for example, the pearls settling or "sinking" on a long hover), never required to understand anything.
- **Don't copy:** the grid of bordered boxes (cards), the 30 links on the first screen, and the blackletter.

---

## 3. Brief notes (looked at; useful mainly as contrasts)

- **Collins** (wearecollins.com, `collins-desktop.png`):
  - The first screen is one centred serif sentence ("Rewrite your worth.") in about 60% empty space, plus a small row of awards. It has 2 interactive elements (MEASURED).
  - Lesson: whitespace makes a single line feel authoritative.
  - Caution: the sentence says nothing about what Collins does. Studio sites can afford ambiguity; a lab cannot.
- **Teenage Engineering** (teenage.engineering, `teenage-desktop.png`):
  - Each nav item is a small line pictogram plus a word plus three sub-links (products / store / latest / finder).
  - Lesson: *a pictogram per destination gives the nav personality without decoration.* A pearl glyph per direction in the nav or footer is the BOBALAB version.
  - Caution: the product-photo hero assumes you already know the brand.
- **UW Interactive Data Lab** (idl.cs.washington.edu, `idl-desktop.png`):
  - Mission sentence, one figure from a recent paper, then publications with thumbnails and an updates column.
  - Highly credible but dense: 232 words and 39 interactive elements (MEASURED).
  - Lesson: this is the right density for a **Publications page**, not for a first screen.
- **ideas42** (behavioral design, `ideas42-desktop.png`):
  - A strong sentence H1 ("Social impact [policies] designed for the people who use them.") on a duotone photo.
  - The key noun **rotates** (programs / policies / products / processes). The rotation breaks our rule and makes the H1 unstable to read.
- **Hey Studio** (heystudio.es):
  - The homepage is a playable Pong game, "Tap to Play".
  - It is unforgettable and says nothing about who they are. It is the clearest example of *originality without comprehension*, which is exactly what to avoid.
- **MIT Senseable City Lab** (`senseable-desktop.png`):
  - Three columns of serif prose (about 350 words, MEASURED) before the project thumbnails.
  - Lesson: a long mission statement is not clarity.
- **Arc Institute** (`arc-desktop.png`): a good H1, followed by **four paragraphs** on the first screen. On mobile the DNA visual is pushed off-screen. Same lesson.
- **Ai2, Busara, MIT Work of the Future, Harvard Growth Lab:**
  - Stock or 3D-render heroes (silk ribbons, collage hands with gears, a blurred blue photo, a drone city video), each with a centred slogan.
  - They are clear but anonymous. This is the "generic" end the owner does not want.
- **Kurzgesagt:** a strong house illustration style, but glowing stars and rockets read as decorative and loud. It is evidence that "playful" can tip into childish.
- **Max Planck Center for Humans and Machines** (`chm-desktop.png`):
  - A topical peer in an institutional template.
  - One useful idea: "Canonical Papers" shown as journal covers. Credibility comes from the venue, with no explanation needed.

---

## 4. Cross-site findings (HYPOTHESIS unless marked)

1. **Every clear site has exactly one dominant element on the first screen.** It is either a sentence at 1.5–4x the size of anything else (Digital Economy Lab: H1 146 px, MEASURED; nav text roughly a seventh of that, by eye) or a single object or photo. BOBALAB's H1 (36 px) is the same size as the direction names under it, so the figure wins the eye.
2. **The sentence does the 5-second work. The visual does the memorability work.** The best pairs never make the visual *necessary* for comprehension:
   - Atlas: the title explains, and the circles invite.
   - Stripe Press: the spines explain because they carry real titles.
   - Recurse: the sentence explains, and the photos warm it up.
3. **Categories as objects work when the label is written on or next to the object.** Atlas of Emotions and the Digital Economy Lab glyphs need no legend. The live BOBALAB figure needs one because it encodes *time, membership, sharing and status* at once.
4. **Progressive disclosure is one click deep each time, and every reveal is a human sentence first.** Atlas: click a circle, get a one-line definition, then "Learn more". d.school: pick a path, then filtered items. Stripe: a spine opens a cover and blurb, then the book. None of them reveals a chart on the first click.
5. **Warmth comes from voice, real people and one tactile motif.** Examples: the greeting (Nicky), the participants' quotes with highlighter (Recurse), a live day counter (Are.na), a hand-made sign (Dynamicland), the mode switch (SFPC). None of these relies on gradients, glows or rounded cards.
6. **One named first step.** "Begin" (Atlas), "START HERE" (Dynamicland), "Start your application" (Recurse). The clear sites make one action visually primary. The BOBALAB first screen has 14 equal-weight links.
7. **Rotating or typewriter headlines are common, and they are a trap.** Digital Economy Lab, PAIR and ideas42 all do it. It moves the most important line, fails screenshot and screen-reader clarity, and is banned by our brief.
8. **Complex visualisations live one level down.** Atlas has the Timeline chapter. UW IDL's figure belongs to a paper page. Our World in Data (earlier study) uses its own chart pages. This supports moving the timeline to `/research` (or a "/research/map" view) behind an explicit "See how the work connects" link.
9. **Originality that costs comprehension fails.** Hey's Pong and Ink & Switch's art-first desktop are memorable, but a stranger cannot say what the place is after five seconds. The playful element has to be *second* in reading order or *optional*.

---

## 5. Principles for the BOBALAB homepage

1. **Sentence first, and make it the largest thing on the page.**
   - Lead with the existing statement "How people learn to work with algorithms", or a name-plus-predicate version ("BOBALAB studies how people learn to work with algorithms").
   - Set it at least 2x the next-largest text: about 72–110 px on desktop and 40–48 px on mobile.
   - Follow it with the mission sentence from `home.yml`, edited down to about 30 words. Keep the affiliation (Berkeley Haas · UC Berkeley) as one small line.
   - *(Recurse, Digital Economy Lab, SFPC, Wellcome)*
2. **Four pearls, four words, no legend.**
   - Show only the **four active** directions as four pearls. Each has its `short_label` set beside or under it in plain text (Algorithmic Advice, AI at Work, Learning on the Job, Platform Work).
   - The pearls encode exactly one thing: *which direction*. No years, no counts, no links between them, and no state symbols on the first screen.
   - Archived directions (Cities, Pricing & Experiments) belong on `/research`, not the homepage.
   - *(Atlas of Emotions, Digital Economy Lab glyphs)*
3. **A pearl is a door: one interaction, one human sentence, then a link.**
   - Hover, focus or tap on a pearl reveals that direction's `question:` (or `summary:`) as one sentence, plus a link to the direction page ("Explore Algorithmic Advice").
   - A second click or Enter goes to the page. On mobile, a tap reveals and a second tap or the link navigates; never require hover.
   - Keep one instruction line ("Pick a pearl to see a question we're asking") or an equivalent visible label.
   - *(Atlas, Stripe Press, Nicky Case)*
4. **Make the pearls refined and true to boba, not glossy.**
   - Use flat, matte discs in the existing direction colours (butterfly-pea, lychee, matcha, oolong), with an optional subtle tapioca texture or a soft shadow at rest.
   - No sheen, no halos, no orbit animation (DIRECTION.md §1).
   - Personality comes from **motion with a physical metaphor**:
     - pearls settle into place once on load (finite, and off under `prefers-reduced-motion`);
     - a pearl lifts slightly on hover;
     - optionally, an easter egg, such as the pearls rolling to the cursor or "sinking" back. It must never be required.
   - *(Stripe Press tactility, SFPC easter egg, Ink & Switch "play is optional")*
5. **Name one first step.** One primary action on the first screen. Candidates:
   - choosing a pearl;
   - "Read our latest paper";
   - "See all research".

   The nav stays, but it should be visually quieter than the primary action. *(Atlas "Begin", Dynamicland "START HERE")*
6. **Curate below the fold to three short blocks, each a single idea.**
   - (a) **One** featured finding or paper, with an authentic research figure from the paper.
   - (b) Three recent publications, using the current list style.
   - (c) People as a row of consented photos with "Join us".

   News, full directories and the timeline move to their pages. Each block has one link out. *(Wellcome, Recurse, Digital Economy Lab)*
7. **The timeline becomes an opt-in exploration on `/research`.**
   - Keep the component intact. Introduce it with one sentence ("See how our papers connect across directions, year by year") and keep its legend there.
   - The homepage links to it once and quietly.
   - *(Atlas chapters, UW IDL density on the right page)*
8. **Warmth through voice and real people, not ornament.**
   - Use first-person plural verbs ("We ask…", "We study…").
   - Use the direction questions verbatim, real lab photos, and the tea-flavour colour names (for example, in a hover title or a footnote on the colophon).
   - A single honest detail adds life, such as "since 2022" or "6 papers, 2 in progress" **on the direction page**.
   - *(Recurse, Are.na, Nicky Case)*
9. **Mobile is a re-composition, not a squeeze.**
   - On a 390 px screen, the sentence and the four pearls must both appear in the first viewport (about 844 px).
   - The pearls should sit in a row of four, or a 2x2 grid, of 56–72 px tap targets with labels, before any paragraph text. Today the first pearl is about 1,150 px down.
   - The d.school-style sentence control ("I'm curious about … [direction]") is the fallback if four labelled pearls do not fit.
10. **Keep the redesign's strengths; add nothing that needs explaining.**
    - Archivo type, hairline lists, real figures, no cards or pills, and no arrows on every link stay.
    - Any new visual element must pass the test: *could a first-time visitor describe what it is without a caption?*

---

## 6. Cognitive-load checklist for every homepage concept

Score each concept on desktop (1440x900) and mobile (390x844) **first viewport**. A concept passes when it meets every **must**.

| # | Check | Target | Live BOBALAB today |
|---|---|---|---|
| C1 | **must:** distinct visual element *types* in the first viewport (sentence, pearl set, nav, CTA, photo…) | ≤ 5 | ~9 (H1, affiliation block, mission, 4 inline colour keys, year axis, dot network, rings, band, caption) |
| C2 | **must:** visual encodings a visitor must decode | **1** (pearl = direction) | 8 |
| C3 | **must:** legend or caption needed to understand the first screen | none | a 70-word caption |
| C4 | **must:** words above the fold | ≤ 60 desktop, ≤ 50 mobile | 215 / 115 |
| C5 | **must:** the H1 is the largest text, at ≥ 2x the next level | yes | no (36 px against ~34 px) |
| C6 | **must:** who + what + why answered by text alone (cover the visuals and read) | yes | yes, but buried in the figure's noise |
| C7 | **must:** one visually primary action | exactly 1 | 0 (14 equal links) |
| C8 | interactive elements in the first viewport (including nav) | ≤ 12 desktop, ≤ 10 mobile | 14 / 12 |
| C9 | **must:** every interactive visual is labelled in words, reachable by keyboard, and works by tap (no hover-only meaning) | yes | partly (hover names) |
| C10 | **must:** motion is finite, under 1 s, and off with `prefers-reduced-motion`. No rotating text, no autoplay carousel | yes | yes |
| C11 | depth of reveal per interaction | 1 sentence, then 1 link | n/a (everything at once) |
| C12 | **must:** sentence and the four directions both visible in the mobile first viewport | yes | no (the first pearl is at ~1,150 px) |
| C13 | colours on the first screen | ≤ 4 direction colours plus ink | 4 plus ink plus grey band |
| C14 | **must:** 5-second test. A naive reader shown the screen for 5 s can say (a) it is a research lab at Berkeley, (b) it studies people working with algorithms or AI, (c) there are about four themes | 3 out of 3 | likely (a)(b); (c) as "a chart" |
| C15 | an authentic BOBALAB artefact (a real figure, a photo or a direction question) appears within one scroll | yes | the timeline only |
| C16 | **must:** nothing is deleted. The timeline, the directories and news are still reachable within 1 click from the homepage | yes | n/a |

**How to measure:**
- C4, C5, C8 and C12 can be measured automatically with `simplify/tools/shoot.js` (it reports words, interactive count, H1 size and media count above the fold). Add a probe for the pearl `getBoundingClientRect().top` on mobile.
- C1–C3 and C13 are counted by eye from the screenshot.
- C14 should be run as a quick hallway or agent test: show the screenshot for 5 s, then ask three questions.

---

## 7. Concept seeds these references support (for the concept step; HYPOTHESIS)

Each seed uses the same content and the same four pearls.

- **A. "Sentence and four pearls" (Atlas plus Digital Economy Lab).**
  - A huge statement sits over one row of four large matte pearls, each with its label.
  - Selecting a pearl reveals its question underneath, with a link.
  - This is the most legible option, and the safest for Prof. Park.
- **B. "Finish the sentence" (d.school plus Are.na).**
  - The H1 is followed by "We ask: …", which completes with the selected pearl's `question:`. The pearls act as the selector.
  - The first screen reads as one sentence. The questions carry the warmth and the "why it matters".
- **C. "The cup" (Stripe Press plus Ink & Switch, the most original).**
  - The four pearls rest at the bottom of an implied cup or glass line, drawn in hairline as a single stroke, beside the sentence.
  - Tapping a pearl lifts it and opens its direction like a spine opening a book.
  - Optional play: drag or stir the pearls.
  - It risks reading as a gimmick or childish, so it must pass C2, C3 and C14 strictly.
- **Baseline to compare against:** the live timeline homepage.
