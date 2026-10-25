// Four Pearls: progressive disclosure for the home pile.
// Rest: four pearls with names. Hover / keyboard focus / first tap: the pearl lifts,
// its papers come out as seeds, and the reading panel shows its question and counts.
// Click (or a second tap): go to the direction, with a cross-document pearl morph.
document.documentElement.classList.add('js');
(() => {
  const DIRS = {
    'algorithmic-advice': {
      name: 'Algorithmic Advice', arc: -100, step: 13,
      q: 'When should advice name the exact next move, and when should it give a broader rule people can carry into new situations?',
      papers: [['Improving Human Sequential Decision Making with Reinforcement Learning', 2026], ['Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design', 2026], ['Strategic Advice in the Age of Personal AI', 2026], ['Managing Human Agents with Compliance-Aware Reinforcement Learning', 2026]],
      wip: ['Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows', 'Understanding Non-Adoption of “Optimal” Algorithmic Advice for Problem Solving'],
    },
    'ai-at-work': {
      name: 'AI at Work', arc: -125, step: 10,
      q: 'What kinds of help do teachers ask ChatGPT for on their own real tasks, and do their conversations stick to one kind?',
      papers: [['Making ChatGPT Work for Me', 2025], ['Stale, Misattributed, or Late: Where Personal Memory Fails Before Generation', 2026], ['The Teacher’s Knapsack: Generative AI and Teacher Productivity', 2026], ['Strategic Advice in the Age of Personal AI', 2026], ['Planning vs. Execution: How AI Changes Task Portfolio Choice', 2026]],
      wip: ['Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows', 'Mechanism-Guided Generative AI Simulation for Pricing Operations'],
    },
    'learning-on-the-job': {
      name: 'Learning on the Job', arc: -60, step: 11,
      q: 'Do gig workers get faster and more reliable with experience, and do they lean on or drift away from the app’s recommendations as they learn?',
      papers: [['Learning to Gig: Workforce Development under Worker Agency', 2025], ['Learning on the Go: How Gig Economy Workers Learn with Recommendation Algorithms', 2025], ['Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design', 2026], ['Dispatching to Develop: Worker Agency and Workforce Development in Gig Platforms', 2026]],
      wip: ['Learning Across Jobs'],
    },
    'platform-work': {
      name: 'Platform Work', arc: -94, step: 13,
      q: 'What drives a ride-hail driver’s choice to log on and log off: the pay rate, an earnings target, or the momentum of a long shift?',
      papers: [['Managing the Gig Economy via Behavioral and Operational Lenses (dissertation)', 2021], ['The Impact of Behavioral and Economic Drivers on Gig Economy Workers', 2023], ['Learning to Gig: Workforce Development under Worker Agency', 2025], ['Learning on the Go: How Gig Economy Workers Learn with Recommendation Algorithms', 2025], ['Managing Multihoming Workers in the Gig Economy', 2026], ['Dispatching to Develop: Worker Agency and Workforce Development in Gig Platforms', 2026]],
      wip: ['Designing and Sequencing Incentives for Platform Workers', 'Fruits of Labor: Staffing Fluid Teams in a Fragmented Market'],
    },
  };
  const pile = document.getElementById('pile');
  if (!pile) return;
  const items = [...pile.querySelectorAll('.p')];
  const reading = document.getElementById('reading');
  const rest = reading.querySelector('.reading__rest');
  const dir = reading.querySelector('.reading__dir');
  const rName = reading.querySelector('.reading__name');
  const rQ = reading.querySelector('.reading__q');
  const rSeeds = reading.querySelector('.reading__seeds');
  const rN = reading.querySelector('.reading__n');
  const rGo = reading.querySelector('.reading__go a');
  const root = document.documentElement;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const countText = (d) => `${plural(d.papers.length, 'paper')}, ${d.wip.length} in progress`;

  // Seeds: papers (filled) then work in progress (open), fanned along a free arc.
  items.forEach((li) => {
    const d = DIRS[li.dataset.d];
    const all = d.papers.map((p) => ({ t: `${p[0]}, ${p[1]}`, w: false })).concat(d.wip.map((t) => ({ t: `${t} (in progress)`, w: true })));
    const n = all.length, step = d.step, R = 1.24; // degrees between seeds; radius in pearl radii
    const box = li.querySelector('.seeds');
    all.forEach((s, i) => {
      const a = (d.arc + (i - (n - 1) / 2) * step) * Math.PI / 180;
      const e = document.createElement('i');
      e.className = 'seed' + (s.w ? ' is-wip' : '');
      e.style.setProperty('--sx', `calc(${(Math.cos(a) * R).toFixed(3)} * var(--u))`);
      e.style.setProperty('--sy', `calc(${(Math.sin(a) * R).toFixed(3)} * var(--u))`);
      e.style.setProperty('--i', i);
      e.dataset.t = s.t;
      box.append(e);
    });
  });

  let on = null, hideT = 0;
  function show(li) {
    clearTimeout(hideT);
    if (on === li) return;
    items.forEach((x) => x.classList.toggle('is-on', x === li));
    pile.classList.add('has-on');
    on = li;
    const d = DIRS[li.dataset.d];
    reading.dataset.d = li.dataset.d;
    rest.hidden = true;
    dir.hidden = false;
    dir.style.animation = 'none'; void dir.offsetWidth; dir.style.animation = '';
    rName.textContent = d.name;
    rQ.textContent = d.q;
    rSeeds.innerHTML = d.papers.map(() => '<i></i>').join('') + d.wip.map(() => '<i class="w"></i>').join('');
    rN.textContent = countText(d);
    rGo.textContent = `Explore ${d.name}`;
    rGo.href = li.querySelector('.pearl').getAttribute('href');
    root.style.setProperty('--wm-pearl', `var(--${{ 'algorithmic-advice': 'bp', 'ai-at-work': 'ly', 'learning-on-the-job': 'ma', 'platform-work': 'oo' }[li.dataset.d]}-e)`);
  }
  function hide() {
    items.forEach((x) => x.classList.remove('is-on'));
    pile.classList.remove('has-on');
    on = null;
    rest.hidden = false;
    dir.hidden = true;
    delete reading.dataset.d;
    root.style.removeProperty('--wm-pearl');
  }
  const hideSoon = () => { clearTimeout(hideT); hideT = setTimeout(hide, 260); };

  let lastPointer = 'mouse';
  items.forEach((li) => {
    const a = li.querySelector('.pearl');
    a.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
    a.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(li); });
    a.addEventListener('focus', () => show(li));
    a.addEventListener('click', (e) => {
      // Touch: the first tap reveals (what hover reveals); a second tap goes deeper.
      if (lastPointer !== 'mouse' && on !== li) {
        e.preventDefault();
        show(li);
        if (matchMedia('(max-width: 63.99rem)').matches) {
          const r = reading.getBoundingClientRect();
          if (r.bottom > innerHeight) reading.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
        return;
      }
      // Morph: only the chosen pearl carries the shared name into the next page.
      li.querySelector('.pdisc').style.viewTransitionName = 'pearl';
      try { sessionStorage.setItem('fp-from', li.dataset.d); } catch (err) {}
    });
    // A seed names its paper, but only under a pointer that actually moves onto it
    // (seeds fly out from under a resting cursor; pointerenter would fire for each).
    li.querySelectorAll('.seed').forEach((s) => {
      s.addEventListener('pointermove', () => {
        if (s.classList.contains('is-hot')) return;
        show(li);
        pile.querySelectorAll('.seed.is-hot').forEach((x) => x.classList.remove('is-hot'));
        s.classList.add('is-hot');
        rN.textContent = s.dataset.t;
      });
      s.addEventListener('pointerleave', () => { s.classList.remove('is-hot'); if (on) rN.textContent = countText(DIRS[on.dataset.d]); });
    });
  });
  pile.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pile.contains(document.activeElement)) hideSoon(); });
  pile.addEventListener('pointerenter', () => clearTimeout(hideT));
  pile.addEventListener('focusout', (e) => { if (!pile.contains(e.relatedTarget)) hideSoon(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && on) hide(); });
  // A tap outside the pile closes the reveal.
  document.addEventListener('pointerdown', (e) => { if (on && e.pointerType !== 'mouse' && !pile.contains(e.target) && !reading.contains(e.target)) hide(); });
  // Coming back (bfcache): clear the morph name.
  addEventListener('pageshow', () => { pile.querySelectorAll('.pdisc').forEach((d) => (d.style.viewTransitionName = '')); hide(); });

  // First visit in a session: the pearls settle once (skipped for reduced motion).
  let seen = false;
  try { seen = sessionStorage.getItem('fp-settled') === '1'; sessionStorage.setItem('fp-settled', '1'); } catch (e) {}
  if (!seen && !matchMedia('(prefers-reduced-motion: reduce)').matches && !location.hash.includes('nosettle')) {
    pile.classList.add('is-settling');
    setTimeout(() => pile.classList.remove('is-settling'), 1400);
  }
})();
