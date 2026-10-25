// Builds index.html and research.html for prototype D ("People & pearls").
// All facts come from the repo's content/** (copied by hand into the tables below).
const fs = require('fs');
const path = require('path');
const OUT = path.resolve(__dirname, '..');
const R = 'C:/Users/jiami/OneDrive/Desktop/Claude/bobalab-website/src/components/brand/wordmark-geometry.ts';
const geo = JSON.parse(fs.readFileSync(R, 'utf8').replace(/^[\s\S]*?export const WORDMARK = /, '').replace(/ as const;\s*$/, ''));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const wordmark = (h = 26) => {
  const [, , w, hh] = geo.viewBox;
  return `<svg class="wm-svg" viewBox="0 0 ${w} ${hh}" style="height:${h}px;width:auto;aspect-ratio:${w}/${hh}" role="img" aria-label="BOBALAB" focusable="false"><g fill="currentColor"><path d="${geo.boba[0]}"/><circle class="wm-pearl" cx="${geo.pearl.cx}" cy="${geo.pearl.cy}" r="${geo.pearl.r}"/>${geo.boba.slice(1).map(d => `<path d="${d}"/>`).join('')}${geo.lab.map(d => `<path d="${d}"/>`).join('')}</g></svg>`;
};

// ---- content/directions (live, in site.yml direction_order) ----------------
const DIRS = [
  { s: 'algorithmic-advice', sw: 'butterfly-pea', name: 'Algorithmic Advice',
    plain: 'Advice from algorithms that people actually use, and learn from',
    q: 'When should advice name the exact next move, and when should it give a broader rule people can carry into new situations?',
    summary: 'How algorithms should advise people through multi-step decisions so the advice gets used, helps now, and still leaves people better on their own.',
    find: 'Short tips, distilled by reinforcement learning from people’s own decisions, raised performance in virtual-kitchen experiments, and people combined them with their own strategies.',
    cite: ['Bastani, Bastani & Sinchaisri, Management Science', 'https://pubsonline.informs.org/doi/10.1287/mnsc.2022.02455'],
    n: '4 papers, 2 in progress', people: ['haonan-william-deng', 'park-sinchaisri'] },
  { s: 'ai-at-work', sw: 'lychee', name: 'AI at Work',
    plain: 'How professionals really use generative AI and AI agents',
    q: 'What kinds of help do teachers ask ChatGPT for on their own real tasks, and do their conversations stick to one kind?',
    summary: 'How professionals actually use generative AI and AI assistants, what it changes about their work, and how much authority AI agents should hold.',
    find: 'Watching 24 K-12 teachers use ChatGPT on their own work, the study found a handful of distinct ways of asking for help; most conversations stay within one of them.',
    cite: ['Keppler, Sinchaisri & Snyder, 2025', 'https://dl.acm.org/doi/10.1145/3711026'],
    n: '5 papers, 2 in progress', people: ['haonan-william-deng', 'park-sinchaisri'] },
  { s: 'learning-on-the-job', sw: 'matcha', name: 'Learning on the Job',
    plain: 'How gig workers get better at their work alongside apps',
    q: 'Do gig workers get faster and more reliable with experience, and do they lean on or drift away from the app’s recommendations as they learn?',
    summary: 'How workers build skill alongside app recommendations, and how platforms can assign work so people improve instead of only covering today’s demand.',
    find: 'Across more than a million delivery orders, couriers got faster and more punctual with experience. Newcomers tend to follow the app’s job recommendations; seasoned workers increasingly go their own way.',
    cite: ['Jiang & Sinchaisri, 2025', 'https://dl.acm.org/doi/10.1145/3757621'],
    n: '4 papers, 1 in progress', people: ['ryan-jesubalan', 'haonan-william-deng', 'park-sinchaisri'] },
  { s: 'platform-work', sw: 'oolong', name: 'Platform Work',
    plain: 'When gig workers choose to work, and how platforms should pay them',
    q: 'What drives a ride-hail driver’s choice to log on and log off: the pay rate, an earnings target, or the momentum of a long shift?',
    summary: 'When and where flexible workers choose to work, and how platforms can pay, motivate and staff them in competitive labor markets.',
    find: 'Pay matters, but so do habits: drivers tend to stop after reaching an earnings goal and to stay on once a shift has momentum.',
    cite: ['Allon, Cohen & Sinchaisri, M&SOM 2023', 'https://pubsonline.informs.org/doi/10.1287/msom.2023.1191'],
    n: '6 papers, 2 in progress', people: ['haonan-william-deng', 'park-sinchaisri'] },
];

// ---- content/people (current members: no `end`) ----------------------------
const UG = 'Undergraduate research assistant';
const PEOPLE = {
  'park-sinchaisri': ['Park Sinchaisri', 'Assistant Professor at Berkeley Haas, leads the lab', null, 'PS'],
  'haonan-william-deng': ['William Deng', 'Master’s student, IEOR', null, 'WD'],
  'aaron-tu': ['Aaron Tu', UG + ', Math', null, 'AT'],
  'vinayak-sarkar': ['Vinayak Sarkar', UG, null, 'VS'],
  'alex-chen': ['Alex Hanyu Chen', UG, 1], 'andrew-li': ['Andrew Li', UG, 1], 'brian-hwang': ['Brian Seong Hyun Hwang', UG, 1],
  'chloe-xiao': ['Chloe Xiao', UG, 1], 'clinton-nguyen': ['Clinton Nguyen', UG + ', Statistics', 1], 'daniil-kardava': ['Daniil Kardava', UG, 1],
  'felicia-ye': ['Felicia Ye', UG, 1], 'jiaming-guan': ['Jiaming Guan', UG, 1], 'jian-kweon': ['Jian Kweon', UG, 1],
  'mete-ehliz': ['Mete Ehliz', UG, 1], 'milosz-platek': ['Milosz Rafal Platek', UG, 1], 'nathaniel-kung': ['Nathaniel Xian-Zhi Kung', UG, 1],
  'nicholas-chen': ['Nicholas Chen', UG + ', EECS', 1], 'ryan-chan': ['Ryan Sing Chan', UG, 1], 'ryan-jesubalan': ['Ryan Jesubalan', UG + ', Applied Math/DS', 1],
  'ryan-lam': ['Ryan Shek Wah Lam', UG, 1], 'siddhartha-chatterjee': ['Siddhartha Chatterjee', UG, 1], 'suyang-ma': ['Suyang Ma', UG, 1],
  'tanish-kher': ['Tanish Kher', UG, 1], 'thomas-morelli': ['Thomas Michael Morelli', UG, 1], 'zixian-li': ['Zixian “Amy” Li', UG, 1],
};
// Pile rows, bottom to top: 6, 5, 6, 5, 3 = 25 (hex packing: pearls settled in a cup, a ragged top).
const ROWS = [
  [0, ['nicholas-chen', 'felicia-ye', 'aaron-tu', 'ryan-lam', 'chloe-xiao', 'tanish-kher']],
  [0.5, ['jiaming-guan', 'thomas-morelli', 'ryan-jesubalan', 'andrew-li', 'vinayak-sarkar']],
  [0, ['daniil-kardava', 'haonan-william-deng', 'clinton-nguyen', 'suyang-ma', 'alex-chen', 'mete-ehliz']],
  [0.5, ['milosz-platek', 'park-sinchaisri', 'siddhartha-chatterjee', 'jian-kweon', 'zixian-li']],
  [1, ['ryan-chan', 'nathaniel-kung', 'brian-hwang']],
];
const COLS = 6, NR = ROWS.length, RH = Math.sqrt(3) / 2, D = 0.94;
const H = (NR - 1) * RH + 1; // in pitch units
const pile = () => {
  // Drop order (--i) is bottom-up, as pearls settle; DOM and keyboard order read top-down, left to right.
  let i = 0, html = '';
  const drop = {}; ROWS.forEach(([, ids]) => ids.forEach(id => { drop[id] = i++; }));
  let n = 0;
  ROWS.map((row, r) => [row, r]).reverse().forEach(([[base, ids], r]) => ids.forEach((id, k) => {
    const [name, role, photo, ini] = PEOPLE[id];
    const x = ((base + k + 0.5 - D / 2) / COLS) * 100, y = (((NR - 1 - r) * RH + (1 - D) / 2) / H) * 100;
    const lit = DIRS.filter(d => d.people.includes(id)).map(d => d.s).join(' ');
    const inner = photo ? `<img src="img/${id}.jpg" alt="" width="160" height="160" decoding="async">` : `<span class="ini" aria-hidden="true">${ini}</span>`;
    html += `<li class="p${photo ? '' : ' np'}${id === 'park-sinchaisri' ? ' pi' : ''}" style="left:${x.toFixed(3)}%;top:${y.toFixed(3)}%;--i:${drop[id]};--r:${r}" data-dirs="${lit}"><button type="button" tabindex="${n++ === 0 ? 0 : -1}" data-name="${esc(name)}" data-role="${esc(role)}" aria-label="${esc(name)}, ${esc(role)}">${inner}<span class="ring" aria-hidden="true"></span></button></li>`;
  }));
  return `<ul class="pile" role="list" aria-label="The 25 people in the lab" style="aspect-ratio:${COLS} / ${H.toFixed(4)}">${html}</ul>`;
};

const head = (title, desc) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<link rel="preload" href="archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="d.css">
<script>document.documentElement.classList.add('js')</script>
</head>`;
const header = cur => `<a class="skip" href="#main">Skip to content</a>
<header class="hd wrap">
  <a class="wm" href="index.html"${cur === 'home' ? ' aria-current="page"' : ''}>${wordmark(26)}</a>
  <nav aria-label="Main"><ul role="list">${['Research', 'Publications', 'People', 'News', 'Join'].map(n => `<li><a href="${n === 'Research' ? 'research.html' : '#' + n.toLowerCase()}"${cur === n ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul></nav>
</header>`;
const footer = `<footer class="ft wrap">
  <div class="ft-a">${wordmark(22)}<p>Berkeley Operations and Behavioral Analytics Lab<br>Haas School of Business, University of California, Berkeley</p></div>
  <p class="ft-b">2220 Piedmont Avenue<br>Berkeley, CA 94720<br><a href="mailto:bobalab@berkeley.edu">bobalab@berkeley.edu</a></p>
  <ul class="ft-c" role="list"><li><a href="#about">About &amp; contact</a></li><li><a href="#accessibility">Accessibility</a></li><li><a href="#privacy">Privacy</a></li><li><a href="#rss">RSS feed</a></li></ul>
</footer>`;

// ---- index.html ------------------------------------------------------------
const dirRows = DIRS.map((d, k) => `
      <li class="dir" data-swatch="${d.sw}" data-dir="${d.s}">
        <h3><button type="button" class="dir-b" aria-expanded="false" aria-controls="dd-${d.s}"><span class="dot" aria-hidden="true"></span><span class="dir-n">${d.name}</span><span class="dir-p">${d.plain}</span><span class="pm" aria-hidden="true"></span></button></h3>
        <div class="dir-more" id="dd-${d.s}" hidden>
          <p class="dir-q">${d.q}</p>
          <p class="dir-f"><b>One finding:</b> ${d.find} <a href="${d.cite[1]}">${d.cite[0]}</a></p>
          <p class="dir-m">${d.n}. With ${d.people.map(p => PEOPLE[p][0]).join(', ').replace(/, ([^,]*)$/, ' and $1')}. <a href="research.html#${d.s}">Explore ${d.name}</a></p>
        </div>
      </li>`).join('');

const PUBS = [
  { t: 'Stale, Misattributed, or Late: Where Personal Memory Fails Before Generation', a: 'Haonan Deng and Wichinpong Park Sinchaisri', v: 'arXiv preprint, October 2026', d: ['lychee:AI at Work'], u: 'https://arxiv.org/abs/2610.10265' },
  { t: 'Dispatching to Develop: Worker Agency and Workforce Development in Gig Platforms', a: 'Haonan Deng and Wichinpong Park Sinchaisri', v: 'SSRN working paper, 2026', d: ['matcha:Learning on the Job', 'oolong:Platform Work'], u: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7151739' },
  { t: 'Strategic Advice in the Age of Personal AI', a: 'Yueyang Liu and Wichinpong Park Sinchaisri', v: 'arXiv preprint, 2026', d: ['lychee:AI at Work', 'butterfly-pea:Algorithmic Advice'], u: 'https://arxiv.org/abs/2603.02055' },
];
const NEWS = [
  ['2026-05-11', 'May 11, 2026', 'Learning to Gig gets a major revision at M&amp;SOM'],
  ['2026-05-08', 'May 8, 2026', 'Three papers on the 2026 MSOM Conference program'],
  ['2026-04-16', 'Apr 16, 2026', 'Precise or Broad? gets a major revision at M&amp;SOM'],
  ['2026-04-10', 'Apr 10, 2026', 'Park Sinchaisri wins a second Cheit Teaching Award'],
];
const tags = arr => arr.map(x => { const [sw, l] = x.split(':'); return `<span class="tag" data-swatch="${sw}"><span class="dot" aria-hidden="true"></span>${l}</span>`; }).join('');

const index = `${head('BOBALAB · How people learn to work with algorithms', 'BOBALAB is a research lab at UC Berkeley’s Haas School of Business, led by Professor Park Sinchaisri, studying how people learn, decide and work alongside algorithms and AI.')}
<body>
${header('home')}
<main id="main">
  <section class="hero wrap" aria-labelledby="h1">
    <div class="hero-text">
      <h1 id="h1">How people learn to work with algorithms</h1>
      <p class="lede"><strong>BOBALAB is a research lab at UC Berkeley’s Haas School of Business, led by Professor Park Sinchaisri.</strong> Apps and AI now hand out gig work, give advice and help with everyday tasks. We study how people learn, decide and work alongside them, using field data and experiments, to improve human–AI interaction in the future of work.</p>
      <h2 class="vh" id="h-dirs">What we study</h2>
      <ol class="dirs" role="list" aria-labelledby="h-dirs">${dirRows}
      </ol>
      <p class="hero-more"><a href="research.html">All our research, and how the four directions connect</a></p>
    </div>
    <figure class="lab" aria-labelledby="lab-cap">
      ${pile()}
      <div class="floor" aria-hidden="true"></div>
      <figcaption class="lab-cap" id="lab-cap"><span class="cap-live" aria-hidden="true"><b>The lab today:</b> 25 people.</span> <a class="cap-link" href="#people">Meet everyone</a></figcaption>
    </figure>
  </section>

  <section class="sec wrap" aria-labelledby="h-pubs">
    <h2 id="h-pubs">New papers</h2>
    <div>
      <ol class="pubs" role="list">${PUBS.map(p => `
        <li><h3><a href="${p.u}">${p.t}</a></h3><p class="au">${p.a}</p><p class="ve">${p.v}</p><p class="tags">${tags(p.d)}</p></li>`).join('')}
      </ol>
      <p class="more"><a href="#publications">Publications: 17 papers, 8 in progress</a></p>
    </div>
  </section>

  <section class="sec wrap" aria-labelledby="h-news">
    <h2 id="h-news">News</h2>
    <div>
      <ol class="log" role="list">${NEWS.map(n => `
        <li><time datetime="${n[0]}">${n[1]}</time><a href="#news">${n[2]}</a></li>`).join('')}
      </ol>
      <p class="more"><a href="#news">News: 19 items since 2023</a></p>
    </div>
  </section>

  <section class="sec join wrap" id="join" aria-labelledby="h-join">
    <h2 id="h-join">Work with us</h2>
    <div class="join-in">
      <p><b>Berkeley undergraduates</b> join through the Undergraduate Research Apprentice Program. Check the <a href="https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753">URAP listing</a> for this term, or write to us.</p>
      <p><b>Academic and industry collaborators</b> are welcome, and so are press requests. One address reaches the lab: <a href="mailto:bobalab@berkeley.edu">bobalab@berkeley.edu</a></p>
    </div>
  </section>
</main>
${footer}
<script src="d.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), index);

// ---- research.html ---------------------------------------------------------
// Fig. 1 data, read from the live figure's DOM (columns in order; years; directions).
const PAPERS = [
  ['sinchaisri-2021-penn-dissertation', 2021, ['platform-work'], 'Managing the Gig Economy via Behavioral and Operational Lenses', 'Dissertation'],
  ['allon-2023-gig-drivers', 2023, ['platform-work'], 'The Impact of Behavioral and Economic Drivers on Gig Economy Workers', 'M&SOM'],
  ['deng-2025-learning-to-gig', 2025, ['learning-on-the-job', 'platform-work'], 'Learning to Gig', 'Working paper'],
  ['jiang-2025-learning-on-the-go', 2025, ['learning-on-the-job', 'platform-work'], 'Learning on the Go', 'PACM HCI'],
  ['keppler-2025-making-chatgpt-work', 2025, ['ai-at-work'], 'Making ChatGPT Work for Me', 'PACM HCI'],
  ['allon-2026-multihoming-workers', 2026, ['platform-work'], 'Managing Multihoming Workers in the Gig Economy', 'Working paper'],
  ['bastani-2026-rl-tips', 2026, ['algorithmic-advice'], 'Improving Human Sequential Decision Making with Reinforcement Learning', 'Management Science'],
  ['blaettchen-2026-precise-or-broad', 2026, ['algorithmic-advice', 'learning-on-the-job'], 'Precise or Broad?', 'Working paper'],
  ['deng-2026-dispatching-to-develop', 2026, ['learning-on-the-job', 'platform-work'], 'Dispatching to Develop', 'Working paper'],
  ['deng-2026-stale-misattributed-late', 2026, ['ai-at-work'], 'Stale, Misattributed, or Late', 'Preprint'],
  ['keppler-2026-teachers-knapsack', 2026, ['ai-at-work'], 'The Teacher’s Knapsack', 'Working paper'],
  ['liu-2026-strategic-advice-personal-ai', 2026, ['algorithmic-advice', 'ai-at-work'], 'Strategic Advice in the Age of Personal AI', 'Preprint'],
  ['sinchaisri-2026-compliance-aware-rl', 2026, ['algorithmic-advice'], 'Managing Human Agents with Compliance-Aware Reinforcement Learning', 'Conference talk'],
  ['snyder-2026-planning-vs-execution', 2026, ['ai-at-work'], 'Planning vs. Execution', 'Conference talk'],
];
const WIP = [
  ['deng-2026-act-ask-defer', ['algorithmic-advice', 'ai-at-work'], 'Act, Ask, or Defer?'],
  ['lee-2025-non-adoption-algorithmic-advice', ['algorithmic-advice'], 'Understanding Non-Adoption of “Optimal” Algorithmic Advice'],
  ['chen-2026-genai-pricing-simulation', ['ai-at-work'], 'Mechanism-Guided Generative AI Simulation for Pricing Operations'],
  ['sinchaisri-2026-learning-across-jobs', ['learning-on-the-job'], 'Learning Across Jobs'],
  ['sinchaisri-2026-sequencing-incentives', ['platform-work'], 'Designing and Sequencing Incentives for Platform Workers'],
  ['sinchaisri-2026-fruits-of-labor', ['platform-work'], 'Fruits of Labor: Staffing Fluid Teams'],
];
const figData = { dirs: DIRS.map(d => [d.s, d.name, d.sw]), papers: PAPERS, wip: WIP };

const research = `${head('Research · BOBALAB', 'BOBALAB’s four research directions, and an optional timeline of how the lab’s papers connect them.')}
<body class="pg-research">
${header('Research')}
<main id="main">
  <section class="r-head wrap" aria-labelledby="h1">
    <h1 id="h1">Research</h1>
    <p class="lede">Four directions, one thread: how people learn to work with algorithms. Each direction has its own page with papers, projects and people.</p>
  </section>
  <ol class="r-dirs wrap" role="list">${DIRS.map(d => `
    <li id="${d.s}" data-swatch="${d.sw}"><span class="dot big" aria-hidden="true"></span>
      <h2><a href="#${d.s}">${d.name}</a></h2>
      <p class="r-q">${d.q}</p>
      <p class="r-s">${d.summary}</p>
      <p class="r-n">${d.n}</p>
    </li>`).join('')}
  </ol>

  <section class="explore wrap" id="explore" aria-labelledby="h-ex">
    <div class="ex-head">
      <h2 id="h-ex">Explore: the papers over time</h2>
      <p>For the curious. Every paper the lab has made public, on the line of each direction it belongs to. Papers shared by two directions are joined by a vertical link; open rings on the right are work in progress.</p>
      <button type="button" class="ex-toggle" aria-expanded="false" aria-controls="fig1">Show the timeline</button>
    </div>
    <figure class="f1" id="fig1" hidden aria-labelledby="f1c">
      <div class="f1-body"><ol class="f1-lanes" role="list">${DIRS.map(d => `<li data-d="${d.s}" data-swatch="${d.sw}"><a href="#${d.s}">${d.name}</a><span>${d.n}</span></li>`).join('')}</ol><svg class="f1-svg" aria-hidden="true"></svg></div>
      <p class="f1-live" aria-live="polite" data-def="Point at a dot to name the paper.">Point at a dot to name the paper.</p>
      <figcaption id="f1c"><b>Figure 1.</b> Papers in the lab’s four research directions, by year. Each filled dot is a paper with a public version or a documented talk; a vertical link joins a paper that belongs to two directions. Order within a year is not meaningful. Open rings after the “now” pearl are work in progress. As of Oct 24, 2026.</figcaption>
    </figure>
    <script type="application/json" id="fig-data">${JSON.stringify(figData)}</script>
  </section>

  <section class="sec wrap" aria-labelledby="h-earlier">
    <h2 id="h-earlier">Earlier work</h2>
    <ul class="log wide" role="list">
      <li><span class="tag" data-swatch="jasmine"><span class="dot" aria-hidden="true"></span>Pricing &amp; Experiments</span><a href="#pricing-experimentation">How shoppers read prices and discounts, and how firms can learn about pricing without costly live tests</a></li>
      <li><span class="tag" data-swatch="black-sesame"><span class="dot" aria-hidden="true"></span>Cities</span><a href="#cities-communities">Whether blocks with more community gatherings are safer</a></li>
    </ul>
  </section>
</main>
${footer}
<script src="d.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'research.html'), research);
console.log('built');
