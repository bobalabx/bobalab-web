/**
 * Hand-written DRAFT copy used by the importer (WP7, 2026-10-20).
 *
 * Every text here is new wording, grounded only in documented facts from the
 * research dataset (paper titles, documented study designs, the URAP listing,
 * the PI site). Direction bodies describe WHAT the listed papers study; they
 * make no claims about results. All of it ships as `draft: true` and is listed
 * in docs/CONTENT-QUESTIONS.md for the PI to rewrite or approve.
 */

export const DRAFTED_ON = "2026-10-20";

/**
 * Direction question choice (≤ 140 chars). Rule: prefer a non-inferred question
 * that matches one of the five questions in the lab's URAP listing; otherwise
 * the first non-inferred question that fits. `override` = own-words shortening
 * of a non-inferred dataset question that is too long (`basedOn` = its index).
 */
export const DIRECTION_QUESTIONS = {
  // URAP "precise vs. broad advice" = dataset question 1 (146 chars): shortened.
  "algorithmic-advice": {
    override: {
      basedOn: 1,
      text: "When should advice name the exact next move, and when should it give a broader rule people can carry into new situations?",
    },
  },
  // URAP "learning transfer across jobs" is question 3, which is inferred → skipped.
  "learning-on-the-job": { preferredIdx: 0 },
  // URAP "multi-agent incentives" maps to inferred questions 2–3 → skipped.
  "platform-work": { preferredIdx: 0 },
  // URAP "act / ask / defer" is question 4, which is inferred → skipped.
  "ai-at-work": { preferredIdx: 0 },
  // Archived. Question 0 is 179 chars and not inferred: shortened.
  "pricing-experimentation": {
    override: {
      basedOn: 0,
      text: "How should a retailer plan markdowns when shoppers read price as a signal of quality, and does announcing markdowns early help?",
    },
  },
  "cities-communities": { preferredIdx: 0 },
};

/** Direction bodies: 80–150 words, describing what the listed papers study (no findings). */
export const DIRECTION_BODIES = {
  "algorithmic-advice": `
A published study develops a reinforcement-learning method that reads logs of people's step-by-step choices and condenses the costliest gap from a strong policy into one short tip, then tests the tips with participants in a virtual-kitchen game. A working paper compares two ways of phrasing advice, an exact next action or a broader rule of thumb, in experiments on electric-vehicle charging routes, and asks how each shapes what people do once the advice is taken away. A second working paper looks at why people in the virtual-kitchen task pass over tips that are known to be good.

Work in progress develops compliance-aware reinforcement learning for managing human agents.
`,
  "ai-at-work": `
A published study follows K-12 teachers as they use ChatGPT on their own tasks and sorts the kinds of help they ask for. A working paper treats lesson preparation as a choice among tasks and draws on a year-long case study of teachers to examine how generative AI changes their productivity. A game-theoretic preprint models a professional advisor whose clients can also consult a personal AI.

A second preprint asks where an AI assistant's memory of its user breaks down, and a submitted paper asks when an AI agent in a service workflow should act, ask or defer. Work in progress studies how AI changes which tasks people plan and which they carry out.
`,
  "learning-on-the-job": `
So far most of this work comes from gig and delivery platforms. A published study uses more than a million delivery orders to follow how couriers' speed and punctuality change with experience, and how their use of the app's job recommendations shifts as they gain it. A working paper studies how a platform should offer jobs when workers can turn offers down and get better at the work at different rates that the platform cannot see in advance; it proposes learning algorithms and tests them on delivery-platform data.

Newer work includes a second working paper on SSRN, _Dispatching to Develop_, and work in progress on whether skill learned in one job carries over to another.
`,
  "platform-work": `
A published study uses ride-hailing data to model drivers' decisions to start and stop working, looking at pay alongside habits such as earnings targets and the momentum of a long shift. A working paper combines one platform's records with public New York City trip data to estimate how drivers split their time between competing apps, and uses the estimates to compare pay designs such as hourly guarantees, streak bonuses and wage floors.

Work in progress looks at designing and sequencing incentives for platform workers, and at staffing fluid teams in a fragmented labor market. Park Sinchaisri's 2021 doctoral dissertation at the University of Pennsylvania, on managing the gig economy, belongs to this line too.
`,
  // Archived directions: the template's "Archived" badge and notice already say
  // so, so the body starts with the research itself (VIS-13).
  "pricing-experimentation": `
A working paper models shoppers who read a higher price as a sign of higher quality and who react to the size of a discount compared with what they expected. It builds this behavior into a retailer's markdown plan and calibrates the model with a consumer study. The paper grew out of Park Sinchaisri's 2016 MIT master's thesis on pricing with quality perception, which pairs a model with an experiment.

Later work includes a submitted paper on generative-AI simulation for pricing operations, guided by economic mechanisms, and work in progress titled _Experimentation without Experiments_.
`,
  "cities-communities": `
A paper published in PLOS ONE in 2021 uses block-party permits issued in Philadelphia to build two measures of neighborhood vibrancy: how many gatherings a neighborhood holds, and what share of them are spontaneous. It then relates these measures to crime across the city's neighborhoods over time.

The study predates the lab: it comes from Park Sinchaisri's doctoral studies at the University of Pennsylvania. It remains the lab's only paper on neighborhoods and civic data, and no current project continues it.
`,
};

// ---------------------------------------------------------------------------
// Pages (content/pages/*.yml). Markdown strings.

const EMAIL = "bobalab@berkeley.edu";
const MAILTO = `[${EMAIL}](mailto:${EMAIL})`;
const URAP_LIST = "https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753";

export const HOME = {
  // Redesign HOME request 1: P3's display statement (paraphrase of the mission). PI to approve.
  statement: "How people learn to work with algorithms",
  // Paraphrase of the lab's URAP framing ("Improving Human-AI Interactions in the
  // Future of Work") and its URAP description. PI to rewrite or approve (brief §D3).
  mission:
    "We study how people learn, decide and work alongside algorithms and AI, with field data from gig platforms and controlled experiments, to improve human–AI interaction in the future of work.",
  featured_findings: [],
  draft: true,
};

export const ABOUT = {
  title: "About BOBALAB",
  intro:
    "BOBALAB, the Berkeley Operations and Behavioral Analytics Lab, is Prof. Park Sinchaisri's research group at the Haas School of Business, University of California, Berkeley.",
  body: `
## How we work

Our projects draw on operations management, behavioral science, economics, computer science and human–computer interaction. Undergraduates join them through UC Berkeley's Undergraduate Research Apprentice Program (URAP), where our projects run under the title "Improving Human-AI Interactions in the Future of Work".

## Principal investigator

Park Sinchaisri is an Assistant Professor in the Operations & Information Technology Management (OITM) group at Berkeley Haas. He joined the faculty in 2021.
`,
  // WP5 request 3: the PI links and the contact list are not repeated here; the
  // About fact sheet renders them from site.yml and the PI's person record.
  draft: true,
};

export const JOIN = {
  // CON-14: no claim of work with journalists or industry partners (none is documented).
  intro: `Students, collaborators and the press can all reach the lab at one address: ${MAILTO}.`,
  students: `
Undergraduates join through UC Berkeley's [Undergraduate Research Apprentice Program (URAP)](${URAP_LIST}).

Check the [URAP listing](${URAP_LIST}) for the current term, or email ${MAILTO}.
`,
  // WP5 request 4: the open/closed status lives in opportunities/urap.md only.
  partners: `We welcome academic and industry collaborators. To talk about a project, email ${MAILTO}.`,
  press: `For media requests, email ${MAILTO}.`,
  draft: true,
};

export const ACCESSIBILITY = {
  title: "Accessibility",
  intro: "We want everyone to be able to use this site.",
  body: `
## Our target

We aim for this site to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.

## How the site is built

- Every page works without JavaScript and with a keyboard alone.
- The research figure on the home page is built on a plain list of the research directions, with each direction's counts and shared papers written out. Every paper it draws is also listed, by year, on the Publications page.
- Motion is brief and optional: nothing moves in a loop. The site follows your device's reduced-motion setting, and the "Reduce motion" switch in the footer turns animation off.
- Color is never the only way information is shown, and text meets contrast requirements in light and dark mode.
- Images have text alternatives.

## Known limits

- Many papers link to PDFs hosted by publishers, preprint servers or Park Sinchaisri's personal website. We do not control those files and cannot promise they are accessible. Where we can, we also link the publisher's web version.
- The content editor that lab members use is third-party software and has not been fully reviewed for accessibility.
- The site has not yet had an independent accessibility audit.

## Report a barrier

If something on this site does not work for you, email ${MAILTO}. Please include the page address and a short description of the problem, and tell us if you need the content in another format.
`,
  draft: true,
};

export const PRIVACY = {
  title: "Privacy",
  intro: "This site does not track you.",
  body: `
## What we collect

Nothing. The site sets no cookies, runs no analytics and loads no third-party scripts, fonts or embeds.

## What your browser keeps

Three small settings stay in your own browser and are never sent anywhere:

- your "Reduce motion" choice, kept in \`localStorage\` under the key \`bobalab-motion\`;
- a note that the research map's opening animation has already played in this session, kept in \`sessionStorage\` under the key \`bobalab-intro\` and cleared when you close the tab;
- a note that the pearls on the home page have already settled once in this session, kept in \`sessionStorage\` under the key \`bobalab-cup-intro\` and cleared when you close the tab.

You can remove all three by clearing this site's data in your browser settings.

## Hosting

The site is a set of static pages served by GitHub Pages. Like any web host, GitHub may record technical details such as IP addresses in its server logs; see the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The lab does not receive those logs.

## Lab editors

Lab members who edit the site sign in to the content editor with GitHub. The sign-in token is stored only in that editor's own browser.

## Questions

Email ${MAILTO}.
`,
  draft: true,
};
