// Research page: the full timeline (the former homepage Fig. 1), now an optional "explore" figure.
// Data: the live Fig. 1 on the current build (localhost:3100, 24 Oct 2026), i.e. content/publications.
(() => {
  const host = document.getElementById('tl');
  if (!host) return;
  const D = {
    'algorithmic-advice': ['Algorithmic Advice', 'pea'],
    'ai-at-work': ['AI at Work', 'lychee'],
    'learning-on-the-job': ['Learning on the Job', 'matcha'],
    'platform-work': ['Platform Work', 'oolong'],
  };
  const order = Object.keys(D);
  // [slug, year, directions, title, kind]
  const P = [
    ['sinchaisri-2021-penn-dissertation', 2021, ['platform-work'], 'Managing the Gig Economy via Behavioral and Operational Lenses', 'Dissertation'],
    ['allon-2023-gig-drivers', 2023, ['platform-work'], 'The Impact of Behavioral and Economic Drivers on Gig Economy Workers', 'Journal article'],
    ['deng-2025-learning-to-gig', 2025, ['learning-on-the-job', 'platform-work'], 'Learning to Gig: Workforce Development under Worker Agency', 'Working paper'],
    ['jiang-2025-learning-on-the-go', 2025, ['learning-on-the-job', 'platform-work'], 'Learning on the Go: Understanding How Gig Economy Workers Learn with Recommendation Algorithms', 'Journal article'],
    ['keppler-2025-making-chatgpt-work', 2025, ['ai-at-work'], 'Making ChatGPT Work for Me', 'Journal article'],
    ['allon-2026-multihoming-workers', 2026, ['platform-work'], 'Managing Multihoming Workers in the Gig Economy', 'Working paper'],
    ['bastani-2026-rl-tips', 2026, ['algorithmic-advice'], 'Improving Human Sequential Decision Making with Reinforcement Learning', 'Journal article'],
    ['blaettchen-2026-precise-or-broad', 2026, ['algorithmic-advice', 'learning-on-the-job'], 'Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design', 'Working paper'],
    ['deng-2026-dispatching-to-develop', 2026, ['learning-on-the-job', 'platform-work'], 'Dispatching to Develop: Worker Agency and Workforce Development in Gig Platforms', 'Working paper'],
    ['deng-2026-stale-misattributed-late', 2026, ['ai-at-work'], 'Stale, Misattributed, or Late: Where Personal Memory Fails Before Generation', 'Working paper'],
    ['keppler-2026-teachers-knapsack', 2026, ['ai-at-work'], 'The Teacher’s Knapsack: Generative AI and Teacher Productivity', 'Working paper'],
    ['liu-2026-strategic-advice-personal-ai', 2026, ['algorithmic-advice', 'ai-at-work'], 'Strategic Advice in the Age of Personal AI', 'Working paper'],
    ['sinchaisri-2026-compliance-aware-rl', 2026, ['algorithmic-advice'], 'Managing Human Agents with Compliance-Aware Reinforcement Learning', 'Conference presentation'],
    ['snyder-2026-planning-vs-execution', 2026, ['ai-at-work'], 'Planning vs. Execution: How AI Changes Task Portfolio Choice', 'Conference presentation'],
  ];
  const W = [
    ['deng-2026-act-ask-defer', ['algorithmic-advice', 'ai-at-work'], 'Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows'],
    ['lee-2025-non-adoption-algorithmic-advice', ['algorithmic-advice'], 'Understanding Non-Adoption of “Optimal” Algorithmic Advice for Problem Solving'],
    ['chen-2026-genai-pricing-simulation', ['ai-at-work'], 'Mechanism-Guided Generative AI Simulation for Pricing Operations'],
    ['sinchaisri-2026-learning-across-jobs', ['learning-on-the-job'], 'Learning Across Jobs'],
    ['sinchaisri-2026-sequencing-incentives', ['platform-work'], 'Designing and Sequencing Incentives for Platform Workers'],
    ['sinchaisri-2026-fruits-of-labor', ['platform-work'], 'Fruits of Labor: Staffing Fluid Teams in a Fragmented Market'],
  ];

  const narrow = innerWidth < 640;
  const LAB = narrow ? 112 : 230, CW = narrow ? 34 : 54, YG = 26, ROW = narrow ? 96 : 78, TOP = 46, NOWG = 44, RG = 26;
  const years = [...new Set(P.map(p => p[1]))];
  const X = {};
  let x = LAB + 24;
  const yr = [];
  years.forEach(y => {
    const a = x;
    P.filter(p => p[1] === y).forEach(p => { X[p[0]] = x + CW / 2; x += CW; });
    yr.push([y, a, x]);
    x += YG;
  });
  const nowX = x - YG + NOWG;
  const maxW = Math.max(...order.map(d => W.filter(w => w[1].includes(d)).length));
  const width = nowX + 40 + maxW * RG + 24;
  const height = TOP + order.length * ROW + 8;
  const Y = d => TOP + order.indexOf(d) * ROW + ROW / 2;
  const col = d => `var(--${D[d][1]})`;

  let s = `<rect class="tl-zone" x="${nowX}" y="${TOP}" width="${width - nowX}" height="${order.length * ROW}"/>`;
  s += yr.map(([y, a, b]) => `<path class="tl-yr" d="M${a + 4} ${TOP - 14}H${b - 4}"/><text class="tl-yt" x="${(a + b) / 2}" y="${TOP - 22}" text-anchor="middle">${y}</text>`).join('');
  s += `<text class="tl-yt" x="${nowX}" y="${TOP - 22}" text-anchor="middle">now</text><text class="tl-yt tl-wl" x="${nowX + 30}" y="${TOP - 22}">in progress</text>`;
  order.forEach((d, i) => {
    const y = Y(d);
    if (i) s += `<path class="tl-sep" d="M0 ${TOP + i * ROW}H${width}"/>`;
    const first = P.find(p => p[2].includes(d));
    s += `<path class="tl-ln" data-d="${d}" style="stroke:${col(d)}" d="M${X[first[0]]} ${y}H${nowX}"/>`;
  });
  P.filter(p => p[2].length > 1).forEach(p => {
    const ys = p[2].map(Y), a = Math.min(...ys), b = Math.max(...ys);
    order.forEach(d => { const v = Y(d); if (v > a && v < b) s += `<path class="tl-gap" d="M${X[p[0]] - 5} ${v}h10"/>`; });
    s += `<path class="tl-lk" data-s="${p[0]}" d="M${X[p[0]]} ${a}V${b}"/>`;
  });
  s += `<path class="tl-now" d="M${nowX} ${TOP - 6}V${TOP + order.length * ROW}"/>`;
  P.forEach(p => p[2].forEach(d => { s += `<circle class="tl-dot" data-s="${p[0]}" data-d="${d}" cx="${X[p[0]]}" cy="${Y(d)}" r="7" style="fill:${col(d)}"/>`; }));
  order.forEach(d => {
    s += `<circle class="tl-pearl" cx="${nowX}" cy="${Y(d)}" r="15"/>`;
    W.filter(w => w[1].includes(d)).forEach((w, j) => { s += `<circle class="tl-ring" data-w="${w[0]}" cx="${nowX + 40 + j * RG}" cy="${Y(d)}" r="7" style="stroke:${col(d)}"/>`; });
  });
  // hit targets
  P.forEach(p => p[2].forEach(d => { s += `<circle class="tl-hit" tabindex="0" role="button" aria-label="${p[3].replace(/"/g, '&quot;')}, ${p[4]}, ${p[1]}" data-h="${p[0]}" cx="${X[p[0]]}" cy="${Y(d)}" r="13"/>`; }));
  W.forEach(w => w[1].forEach(d => { const j = W.filter(v => v[1].includes(d)).indexOf(w); s += `<circle class="tl-hit" tabindex="0" role="button" aria-label="${w[2].replace(/"/g, '&quot;')}, in progress" data-hw="${w[0]}" cx="${nowX + 40 + j * RG}" cy="${Y(d)}" r="12"/>`; }));

  const labels = order.map(d => {
    const n = P.filter(p => p[2].includes(d)).length, m = W.filter(w => w[1].includes(d)).length;
    return `<li style="top:${Y(d) - (narrow ? 36 : 24)}px;width:${LAB - 10}px" class="c-${D[d][1]}"><a href="#${d}">${D[d][0]}</a><span>${n} papers, ${m} in progress</span></li>`;
  }).join('');
  host.innerHTML = `<div class="tl-scroll"><div class="tl-canvas" style="width:${width}px;height:${height}px"><ol class="tl-labs">${labels}</ol><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${s}</svg></div></div>`;

  const live = document.getElementById('tl-live'), def = live.innerHTML, svg = host.querySelector('svg');
  const show = (h, w) => {
    svg.classList.add('focus');
    svg.querySelectorAll('.on').forEach(e => e.classList.remove('on'));
    if (h) {
      const p = P.find(q => q[0] === h);
      svg.querySelectorAll(`[data-s="${h}"]`).forEach(e => e.classList.add('on'));
      live.innerHTML = `<b>${p[3]}</b>. ${p[4]}, ${p[1]}. ${p[2].map(d => D[d][0]).join(' and ')}.`;
    } else {
      const q = W.find(v => v[0] === w);
      svg.querySelectorAll(`[data-w="${w}"]`).forEach(e => e.classList.add('on'));
      live.innerHTML = `<b>${q[2]}</b>. In progress. ${q[1].map(d => D[d][0]).join(' and ')}.`;
    }
  };
  const clear = () => { svg.classList.remove('focus'); svg.querySelectorAll('.on').forEach(e => e.classList.remove('on')); live.innerHTML = def; };
  svg.querySelectorAll('.tl-hit').forEach(h => {
    const go = () => show(h.dataset.h, h.dataset.hw);
    h.addEventListener('pointerenter', go); h.addEventListener('focus', go);
    h.addEventListener('pointerleave', clear); h.addEventListener('blur', clear);
    h.addEventListener('click', go);
  });
})();
