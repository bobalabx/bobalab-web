/* The research map (the former home Fig. 1, now an optional exploration on
   Research). Simplified from docs/redesign/prototypes/p3/fig.js: same encoding
   (lanes by direction, dots by year, vertical links for shared papers, pearl
   at "now", open rings for work in progress), data from content/publications. */
(() => {
  const det = document.getElementById('map-d'); if (!det) return;
  const svg = document.getElementById('fig1-svg'), out = document.getElementById('readout');
  const DIRS = [
    ['algorithmic-advice', 'Algorithmic Advice'],
    ['ai-at-work', 'AI at Work'],
    ['learning-on-the-job', 'Learning on the Job'],
    ['platform-work', 'Platform Work'],
  ];
  const AA = 'algorithmic-advice', AI = 'ai-at-work', LJ = 'learning-on-the-job', PW = 'platform-work';
  // [title, year, directions, kind]
  const PAPERS = [
    ['Managing the Gig Economy via Behavioral and Operational Lenses', 2021, [PW], 'Ph.D. dissertation'],
    ['The Impact of Behavioral and Economic Drivers on Gig Economy Workers', 2023, [PW], 'M&SOM'],
    ['Learning to Gig: Workforce Development under Worker Agency', 2025, [LJ, PW], 'Working paper'],
    ['Learning on the Go', 2025, [LJ, PW], 'Proc. ACM HCI'],
    ['Making ChatGPT Work for Me', 2025, [AI], 'Proc. ACM HCI'],
    ['Managing Multihoming Workers in the Gig Economy', 2026, [PW], 'Working paper'],
    ['Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design', 2026, [AA, LJ], 'Working paper'],
    ['Improving Human Sequential Decision Making with Reinforcement Learning', 2026, [AA], 'Management Science'],
    ['Dispatching to Develop', 2026, [LJ, PW], 'Working paper'],
    ['The Teacher’s Knapsack: Generative AI and Teacher Productivity', 2026, [AI], 'Working paper'],
    ['Planning vs. Execution: How AI Changes Task Portfolio Choice', 2026, [AI], 'MSOM Conference talk'],
    ['Strategic Advice in the Age of Personal AI', 2026, [AA, AI], 'Preprint'],
    ['Managing Human Agents with Compliance-Aware Reinforcement Learning', 2026, [AA], 'MSOM Conference talk'],
    ['Stale, Misattributed, or Late: Where Personal Memory Fails Before Generation', 2026, [AI], 'Preprint'],
  ];
  const WIP = [
    ['Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows', [AA, AI]],
    ['Understanding Non-Adoption of “Optimal” Algorithmic Advice for Problem Solving', [AA]],
    ['Mechanism-Guided Generative AI Simulation for Pricing Operations', [AI]],
    ['Learning Across Jobs', [LJ]],
    ['Designing and Sequencing Incentives for Platform Workers', [PW]],
    ['Fruits of Labor: Staffing Fluid Teams in a Fragmented Market', [PW]],
  ];
  const nm = Object.fromEntries(DIRS);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const def = out.textContent;

  function draw() {
    const box = svg.parentElement, Wd = Math.max(760, box.clientWidth);
    const lab = Wd < 900 ? 150 : 210, top = 44, lane = 66, H = top + lane * DIRS.length + 8;
    svg.setAttribute('viewBox', `0 0 ${Wd} ${H}`); svg.setAttribute('width', Wd); svg.setAttribute('height', H);
    const yc = {}; DIRS.forEach(([d], i) => yc[d] = top + lane * i + lane / 2);
    const yrs = [...new Set(PAPERS.map(p => p[1]))], gap = 22, wipW = 4 * 24 + 40;
    const cw = Math.min(54, (Wd - lab - 40 - wipW - gap * (yrs.length - 1)) / PAPERS.length);
    let x = lab + 16, s = '', X = [];
    yrs.forEach((y, k) => {
      const a = x;
      PAPERS.forEach((p, i) => { if (p[1] === y) { X[i] = x + cw / 2; x += cw; } });
      s += `<text class="yr" x="${(a + x) / 2}" y="22" text-anchor="middle">${y}</text><path class="yl" d="M${a + 4} 30H${x - 4}"/>`;
      x += gap;
    });
    const now = x - gap + 26;
    let lanes = '', links = '', dots = '', rings = '';
    DIRS.forEach(([d, label]) => {
      const first = X[PAPERS.findIndex(p => p[2].includes(d))];
      lanes += `<g class="lane" data-d="${d}"><text class="ll" x="0" y="${yc[d] + 6}">${label}</text><path class="lr" d="M0 ${yc[d] + lane / 2}H${Wd}"/><path class="line" d="M${first} ${yc[d]}H${now}"/></g>`;
      let j = 0;
      WIP.forEach(([t, ds]) => { if (ds.includes(d)) { rings += `<a href="#" class="pt" data-d="${ds.join(' ')}" aria-label="${esc(t)}, in progress"><circle class="ring" data-d="${d}" cx="${now + 32 + j * 22}" cy="${yc[d]}" r="6.5"/><circle class="hit" cx="${now + 32 + j * 22}" cy="${yc[d]}" r="11"/></a>`; j++; } });
    });
    PAPERS.forEach(([t, y, ds, kind], i) => {
      const ys = ds.map(d => yc[d]);
      let g = '';
      if (ds.length > 1) {
        const a = Math.min(...ys), b = Math.max(...ys);
        DIRS.forEach(([d]) => { if (yc[d] > a && yc[d] < b) g += `<path class="gapm" d="M${X[i] - 5} ${yc[d]}h10"/>`; });
        g += `<path class="lk" d="M${X[i]} ${a + 6}V${b - 6}"/>`;
      }
      ds.forEach(d => g += `<circle class="dot" data-d="${d}" cx="${X[i]}" cy="${yc[d]}" r="6"/>`);
      const label = `${t}. ${kind}, ${y}. ${ds.map(d => nm[d]).join(' and ')}`;
      dots += `<a href="#" class="pt" data-d="${ds.join(' ')}" data-t="${esc(t)}" data-m="${esc(kind)}, ${y} · ${ds.map(d => nm[d]).join(' + ')}" aria-label="${esc(label)}">${g}${ds.map(d => `<circle class="hit" cx="${X[i]}" cy="${yc[d]}" r="12"/>`).join('')}</a>`;
    });
    const zone = `<rect class="zone" x="${now}" y="${top}" width="${Wd - now}" height="${lane * DIRS.length}"/>`;
    const pearls = DIRS.map(([d]) => `<circle class="np" cx="${now}" cy="${yc[d]}" r="12"/>`).join('');
    svg.innerHTML = `<title id="fig1-t">Map of BOBALAB papers by year and direction</title>${zone}${s}<text class="yr" x="${now}" y="22" text-anchor="middle">today</text><text class="yr wl" x="${now + 26}" y="22">in progress</text>${lanes}<path class="nowl" d="M${now} 32V${H - 8}"/>${links}${dots}${rings}${pearls}`;
    svg.querySelectorAll('.pt').forEach(a => {
      const on = () => {
        const ds = a.dataset.d.split(' ');
        svg.classList.add('focus');
        svg.querySelectorAll('.pt').forEach(o => o.classList.toggle('on', o === a));
        svg.querySelectorAll('.lane').forEach(l => l.classList.toggle('on', ds.includes(l.dataset.d)));
        out.innerHTML = a.dataset.t ? `<b>${a.dataset.t}</b> <span>${a.dataset.m}</span>` : `<b>${a.getAttribute('aria-label').replace(/, in progress$/, '')}</b> <span>In progress</span>`;
      };
      const off = () => { svg.classList.remove('focus'); svg.querySelectorAll('.on').forEach(o => o.classList.remove('on')); out.textContent = def; };
      a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
      a.addEventListener('pointerleave', off); a.addEventListener('blur', off);
      a.addEventListener('click', e => e.preventDefault());
    });
  }
  const openFromHash = () => { if (location.hash === '#map') det.open = true; };
  openFromHash(); addEventListener('hashchange', openFromHash);
  if (new URLSearchParams(location.search).has('open')) det.open = true;
  det.addEventListener('toggle', () => { if (det.open) draw(); });
  if (det.open) draw();
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => det.open && draw(), 150); });
})();
