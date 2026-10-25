// Research page: (1) receive the pearl morph from the home page; (2) the optional
// timeline (the former home Fig. 1), drawn only when the reader asks for it.
(() => {
  // (1) Cross-document view transition: the target direction's pearl takes the shared name.
  addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    const id = location.hash.slice(1);
    const disc = id && document.querySelector(`#${CSS.escape(id)} .dir__pearl`);
    if (!disc) { e.viewTransition.skipTransition(); return; }
    disc.style.viewTransitionName = 'pearl';
    e.viewTransition.finished.finally(() => { disc.style.viewTransitionName = ''; });
  });

  // (2) Timeline data (from content/**, as drawn on the current home Fig. 1).
  const LANES = [
    ['algorithmic-advice', 'Algorithmic Advice'],
    ['ai-at-work', 'AI at Work'],
    ['learning-on-the-job', 'Learning on the Job'],
    ['platform-work', 'Platform Work'],
  ];
  const AA = 'algorithmic-advice', AI = 'ai-at-work', LJ = 'learning-on-the-job', PW = 'platform-work';
  const PAPERS = [
    ['Managing the Gig Economy via Behavioral and Operational Lenses', 2021, [PW], 'Doctoral dissertation, University of Pennsylvania'],
    ['The Impact of Behavioral and Economic Drivers on Gig Economy Workers', 2023, [PW], 'Manufacturing & Service Operations Management'],
    ['Learning to Gig: Workforce Development under Worker Agency', 2025, [LJ, PW], 'Working paper, major revision'],
    ['Learning on the Go: How Gig Economy Workers Learn with Recommendation Algorithms', 2025, [LJ, PW], 'Proceedings of the ACM on Human-Computer Interaction'],
    ['Making ChatGPT Work for Me', 2025, [AI], 'Proceedings of the ACM on Human-Computer Interaction'],
    ['Managing Multihoming Workers in the Gig Economy', 2026, [PW], 'Working paper, revise and resubmit'],
    ['Improving Human Sequential Decision Making with Reinforcement Learning', 2026, [AA], 'Management Science'],
    ['Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design', 2026, [AA, LJ], 'Working paper, major revision'],
    ['Dispatching to Develop: Worker Agency and Workforce Development in Gig Platforms', 2026, [LJ, PW], 'SSRN working paper'],
    ['Stale, Misattributed, or Late: Where Personal Memory Fails Before Generation', 2026, [AI], 'arXiv preprint'],
    ['The Teacher’s Knapsack: Generative AI and Teacher Productivity', 2026, [AI], 'Working paper'],
    ['Strategic Advice in the Age of Personal AI', 2026, [AA, AI], 'arXiv preprint'],
    ['Managing Human Agents with Compliance-Aware Reinforcement Learning', 2026, [AA], '2026 INFORMS MSOM Conference talk'],
    ['Planning vs. Execution: How AI Changes Task Portfolio Choice', 2026, [AI], '2026 INFORMS MSOM Conference talk'],
  ];
  const WIP = {
    [AA]: ['Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows', 'Understanding Non-Adoption of “Optimal” Algorithmic Advice for Problem Solving'],
    [AI]: ['Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows', 'Mechanism-Guided Generative AI Simulation for Pricing Operations'],
    [LJ]: ['Learning Across Jobs'],
    [PW]: ['Designing and Sequencing Incentives for Platform Workers', 'Fruits of Labor: Staffing Fluid Teams in a Fragmented Market'],
  };
  const COL = { [AA]: 'var(--bp)', [AI]: 'var(--ly)', [LJ]: 'var(--ma)', [PW]: 'var(--oo)' };
  const PE = { [AA]: 'var(--bp-e)', [AI]: 'var(--ly-e)', [LJ]: 'var(--ma-e)', [PW]: 'var(--oo-e)' };

  const btn = document.querySelector('.explore__btn');
  const fig = document.getElementById('fig-timeline');
  const svg = fig.querySelector('svg');
  const live = fig.querySelector('.tl__live');
  let drawn = false;

  function draw() {
    const W = 1000, labW = 190, top = 40, laneH = 64, H = top + LANES.length * laneH + 8;
    const yOf = (d) => top + LANES.findIndex((l) => l[0] === d) * laneH + laneH / 2;
    const years = [...new Set(PAPERS.map((p) => p[1]))];
    const cw = 40, bg = 26;
    const X = [];
    let x = labW + 24, html = '';
    years.forEach((y) => {
      const ps = PAPERS.map((p, i) => [p, i]).filter(([p]) => p[1] === y);
      const a = x;
      ps.forEach(([, i]) => { X[i] = x + cw / 2; x += cw; });
      html += `<text class="yr" x="${(a + x) / 2}" y="16" text-anchor="middle">${y}</text><path d="M${a + 4} 24H${x - 4}" stroke="var(--hairline)"/>`;
      x += bg;
    });
    const nowX = x + 6;
    html = `<rect class="zone" x="${nowX}" y="${top - 6}" width="${W - nowX}" height="${H - top + 2}"/>` + html;
    html += `<text x="${nowX}" y="16" text-anchor="middle">now</text><text x="${nowX + 30}" y="16">in progress</text>`;
    LANES.forEach(([d, name]) => {
      const y = yOf(d);
      const mine = PAPERS.map((p, i) => i).filter((i) => PAPERS[i][2].includes(d));
      const nP = mine.length, nW = WIP[d].length;
      html += `<text class="lane-name" x="0" y="${y - 3}">${name}</text><text class="lane-n" x="0" y="${y + 15}">${nP} papers, ${nW} in progress</text>`;
      html += `<path class="ln" data-d="${d}" d="M${X[mine[0]]} ${y}H${nowX}" stroke="${COL[d]}"/>`;
      if (d !== LANES[LANES.length - 1][0]) html += `<path d="M0 ${y + laneH / 2}H${W}" stroke="var(--hairline)"/>`;
    });
    // shared papers: a link from the upper lane to the lower, with a gap where it passes over a lane
    PAPERS.forEach((p, i) => {
      if (p[2].length < 2) return;
      const ys = p[2].map(yOf), a = Math.min(...ys), b = Math.max(...ys);
      LANES.forEach(([d]) => { const v = yOf(d); if (v > a && v < b) html += `<path class="gap" data-s="${i}" d="M${X[i] - 4} ${v}h8"/>`; });
      html += `<path class="lk" data-s="${i}" d="M${X[i]} ${a + 6}V${b - 6}"/>`;
    });
    PAPERS.forEach((p, i) => p[2].forEach((d) => {
      html += `<circle data-s="${i}" cx="${X[i]}" cy="${yOf(d)}" r="6.5" fill="${COL[d]}"/><circle class="hit" data-h="${i}" cx="${X[i]}" cy="${yOf(d)}" r="13"/>`;
    }));
    LANES.forEach(([d]) => {
      const y = yOf(d);
      html += `<circle cx="${nowX}" cy="${y}" r="13" fill="${PE[d]}"/>`;
      WIP[d].forEach((t, j) => { html += `<circle class="ring" data-s="w${d}${j}" cx="${nowX + 34 + j * 22}" cy="${y}" r="6.5" stroke="${COL[d]}"/><circle class="hit" data-w="${d}|${j}" cx="${nowX + 34 + j * 22}" cy="${y}" r="11"/>`; });
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = html;
    svg.addEventListener('pointerover', (e) => {
      const t = e.target.dataset;
      if (t.h !== undefined) {
        const p = PAPERS[+t.h];
        focus((el) => el.dataset.s === t.h);
        live.innerHTML = `<b>${p[0]}</b>. ${p[3]}, ${p[1]}.${p[2].length > 1 ? ` Shared by ${p[2].map((d) => LANES.find((l) => l[0] === d)[1]).join(' and ')}.` : ''}`;
      } else if (t.w) {
        const [d, j] = t.w.split('|');
        focus((el) => el.dataset.s === `w${d}${j}`);
        live.innerHTML = `<b>${WIP[d][+j]}</b>. In progress.`;
      }
    });
    svg.addEventListener('pointerout', (e) => { if (e.target.classList.contains('hit')) { svg.classList.remove('is-focus'); live.textContent = 'Point at a dot to name the paper.'; } });
    function focus(f) {
      svg.classList.add('is-focus');
      svg.querySelectorAll('[data-s]').forEach((el) => el.classList.toggle('on', f(el)));
    }
    drawn = true;
  }

  function open(on) {
    btn.setAttribute('aria-expanded', String(on));
    btn.textContent = on ? 'Hide the timeline' : 'Show the timeline';
    fig.hidden = !on;
    if (on && !drawn) draw();
  }
  btn.addEventListener('click', () => open(btn.getAttribute('aria-expanded') !== 'true'));
  if (location.hash === '#timeline' || new URLSearchParams(location.search).has('timeline')) open(true);
})();
