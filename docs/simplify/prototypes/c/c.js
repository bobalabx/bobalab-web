/* BOBALAB concept C "The beaker": the home figure. Vanilla JS, no build step.
   Reads the direction list already in the page (#dirs, works without JS) and
   draws it as four pearls settled in a lab beaker. Choosing a pearl (click, tap,
   Enter/Space) makes it rise to the surface and reveals its question. */
(() => {
  document.documentElement.classList.add('js');
  const menu = document.querySelector('.menu-btn');
  if (menu) menu.addEventListener('click', () => {
    const hd = menu.closest('.hd'); const open = hd.classList.toggle('open');
    menu.setAttribute('aria-expanded', open);
  });

  const fig = document.getElementById('beaker'); if (!fig) return;
  const list = document.getElementById('dirs');
  const D = [...list.querySelectorAll('li')].map(li => ({
    slug: li.dataset.d,
    label: li.querySelector('.n').textContent,
    title: li.dataset.title,
    q: li.querySelector('.q').textContent,
    count: li.dataset.count,
    start: li.querySelector('.start').innerHTML,
    href: li.querySelector('a').getAttribute('href'),
  }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 75rem)');

  /* Geometry in stage units. One drawing, two proportions. */
  const GEO = {
    wide: { W: 860, H: 800, rim: 118, surf: 178, floor: 756, bot: 770, L: 50, R: 340, r: 26, px: [146, 199, 252, 305], ly: [548, 590, 632, 674], lx: 410, hy: 742, ticks: [290, 340, 390, 440], straw: [100, 744, 86, 0, 32] },
    narrow: { W: 720, H: 470, rim: 40, surf: 90, floor: 440, bot: 454, L: 50, R: 340, r: 27, px: [146, 201, 256, 311], ly: [196, 250, 304, 358], lx: 388, hy: 420, ticks: [130, 158], straw: [100, 430, 88, 2, 32] },
  };

  let sel = -1, G;
  const stage = document.createElement('div');
  stage.className = 'stage';
  const panel = document.createElement('div');
  panel.className = 'panel'; panel.id = 'dir-panel'; panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  const hint = document.createElement('p');
  hint.className = 'hint'; hint.id = 'beaker-hint';

  function draw() {
    G = wide.matches ? GEO.wide : GEO.narrow;
    const { W, H, rim, surf, floor, bot, L, R, r, px, ly, lx, hy, ticks } = G;
    const rise = surf + r + 12;
    G.rise = rise;
    stage.style.cssText = `--W:${W};--H:${H};--lx:${lx};--rise:${rise};--hy:${hy}`;
    fig.style.setProperty('--W', W); fig.style.setProperty('--lx', lx);
    const cy = floor - r;
    const rr = 22; // bottom corner radius
    // beaker: open top, spout lip on the left, flat bottom with a thick base
    const wall = `M${L - 14} ${rim - 10} Q${L - 2} ${rim - 6} ${L} ${rim + 8} V${bot - rr} Q${L} ${bot} ${L + rr} ${bot} H${R - rr} Q${R} ${bot} ${R} ${bot - rr} V${rim} Q${R} ${rim - 6} ${R + 6} ${rim - 8}`;
    const tea = `M${L} ${surf - 4} Q${L + 5} ${surf} ${L + 14} ${surf} H${R - 14} Q${R - 5} ${surf} ${R} ${surf - 4} V${bot - rr} Q${R} ${bot} ${R - rr} ${bot} H${L + rr} Q${L} ${bot} ${L} ${bot - rr} Z`;
    const surface = `M${L} ${surf - 4} Q${L + 5} ${surf} ${L + 14} ${surf} H${R - 14} Q${R - 5} ${surf} ${R} ${surf - 4}`;
    // straw: rests on the spout, tip on the floor in the left gap; the top end is cut on a slant
    const [sx0, sy0, sx1, sy1, sw] = G.straw;
    const ang = Math.atan2(sy1 - sy0, sx1 - sx0), nx = Math.sin(ang) * sw / 2, ny = -Math.cos(ang) * sw / 2;
    const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    const t = (surf - sy0) / (sy1 - sy0), mx = sx0 + (sx1 - sx0) * t;
    const dx = (sx1 - sx0) / Math.hypot(sx1 - sx0, sy1 - sy0), dy = (sy1 - sy0) / Math.hypot(sx1 - sx0, sy1 - sy0);
    const cut = 16; // slant: one side of the straw ends higher than the other
    const strawOut = `M${P(mx - nx, surf - ny)} L${P(sx1 - nx + dx * cut, sy1 - ny + dy * cut)} L${P(sx1 + nx - dx * cut, sy1 + ny - dy * cut)} L${P(mx + nx, surf + ny)} Z`;
    const strawIn = `M${P(sx0 - nx, sy0 - ny)} L${P(mx - nx, surf - ny)} L${P(mx + nx, surf + ny)} L${P(sx0 + nx, sy0 + ny)} Z`;
    const tk = ticks.map((y, i) => `<path class="tick" d="M${R} ${y}h${i % 2 ? -10 : -20}"/>`).join('');

    let grp = '', html = '';
    D.forEach((d, i) => {
      const x = px[i], y = ly[i];
      grp += `<g class="ln" data-i="${i}" data-d="${d.slug}" style="--i:${i}">
        <path class="ld" d="M${x} ${cy - r} V${y} H${lx - 10}"/>
        <path class="ld ext" d="M${x} ${rise} V${y}"/>
        <path class="ld sfc" d="M${x + r + 2} ${rise} H${lx - 10}"/>
      </g>`;
      html += `<div class="grp" data-i="${i}" data-d="${d.slug}" style="--x:${x};--y:${cy};--r:${r};--ly:${y};--i:${i}">
        <span class="pearl" aria-hidden="true"></span>
        <button class="lab" type="button" aria-expanded="false" aria-controls="dir-panel"><span class="t">${d.label}</span></button>
      </div>`;
    });
    stage.innerHTML = `<svg class="draw" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
      <path class="tea" d="${tea}"/>
      ${tk}
      <path class="straw-in" d="${strawIn}"/>
      <path class="surface" d="${surface}"/>
      <path class="straw" d="${strawOut}"/>
      ${grp}
      <path class="wall" d="${wall}"/>
      <path class="base" d="M${L + 10} ${floor} H${R - 10}"/>
    </svg>${html}`;
    hint.innerHTML = `<span class="pick">Pick a pearl to see the question behind it.</span> <a href="research.html#map">${wide.matches ? 'See how the four directions connect' : 'How the four connect'}</a>`;
    stage.querySelectorAll('.grp').forEach(g => {
      const i = +g.dataset.i, b = g.querySelector('button'), p = g.querySelector('.pearl');
      const hov = on => { g.classList.toggle('hov', on && sel !== i); stage.querySelector(`.ln[data-i="${i}"]`).classList.toggle('hov', on); };
      [b, p].forEach(el => { el.addEventListener('pointerenter', () => hov(true)); el.addEventListener('pointerleave', () => hov(false)); });
      b.addEventListener('focus', () => hov(true)); b.addEventListener('blur', () => hov(false));
      b.addEventListener('click', () => choose(i === sel ? -1 : i, true));
      p.addEventListener('click', () => { choose(i === sel ? -1 : i, true); });
    });
    if (wide.matches) stage.append(hint, panel); else stage.after(hint, panel);
    apply(false);
  }

  function bubbles(i) {
    if (reduce.matches) return;
    const g = stage.querySelector(`.grp[data-i="${i}"]`); if (!g) return;
    const x = G.px[i], cy = G.floor - G.r;
    [0, 1, 2].forEach(k => {
      const s = document.createElement('span'); s.className = 'bub'; s.dataset.d = D[i].slug;
      s.style.left = `${(x - 10 + k * 9) / G.W * 100}%`; s.style.top = `${(cy - G.r - 6 - k * 4) / G.H * 100}%`;
      s.style.setProperty('--d', -((cy - G.rise) * stage.clientWidth / G.W * (0.75 + k * 0.08)).toFixed(0));
      s.style.animationDelay = `${k * 110}ms`;
      stage.append(s); requestAnimationFrame(() => s.classList.add('go'));
      setTimeout(() => s.remove(), 1600);
    });
  }

  function apply(animate) {
    stage.classList.toggle('has-sel', sel >= 0);
    stage.querySelectorAll('.grp').forEach(g => {
      const on = +g.dataset.i === sel;
      g.classList.toggle('sel', on); g.classList.remove('hov');
      g.querySelector('button').setAttribute('aria-expanded', on);
    });
    stage.querySelectorAll('.ln').forEach(l => l.classList.toggle('sel', +l.dataset.i === sel));
    if (sel < 0) { panel.hidden = true; panel.innerHTML = ''; if (wide.matches) stage.append(panel); return; }
    const d = D[sel];
    panel.dataset.d = d.slug;
    panel.innerHTML = `<h2>${d.title}</h2><p class="q">${d.q}</p><p class="start">A first read: ${d.start}</p><p class="go"><a href="${d.href}">Explore ${d.label}</a> <span>${d.count}</span></p>`;
    // keep the reveal next to its button in the tab order
    if (wide.matches) stage.querySelector(`.grp[data-i="${sel}"]`).after(panel);
    panel.hidden = false;
    fit();
    panel.classList.remove('in'); void panel.offsetWidth; if (animate) panel.classList.add('in');
  }

  // on wide screens the reveal sits between the surface and the label stack: keep it there
  function fit() {
    panel.classList.remove('compact', 'compact2');
    if (!wide.matches) return;
    const sc = stage.clientWidth / G.W, room = (G.ly[0] - G.rise) * sc - 22;
    if (panel.offsetHeight > room) panel.classList.add('compact');
    if (panel.offsetHeight > room) panel.classList.add('compact2');
  }
  addEventListener('resize', () => { if (sel >= 0) fit(); });

  function choose(i, animate) {
    sel = i; apply(animate);
    if (i >= 0 && animate) bubbles(i);
    if (i >= 0 && !wide.matches && animate) {
      const r = panel.getBoundingClientRect();
      if (r.bottom > innerHeight) panel.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
    }
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sel >= 0) { const b = stage.querySelector(`.grp[data-i="${sel}"] button`); choose(-1, true); b && b.focus(); } });

  fig.prepend(stage);
  list.hidden = true; // the list stays in the DOM as the source of the drawing
  draw();
  let seen = false; try { seen = !!sessionStorage.getItem('c-intro'); sessionStorage.setItem('c-intro', '1'); } catch (e) {}
  if (!reduce.matches && !seen) {
    stage.classList.add('intro');
    setTimeout(() => stage.classList.remove('intro'), 1800);
  }
  wide.addEventListener('change', draw);
  // allow ?sel=n for screenshots
  const q = new URLSearchParams(location.search).get('sel');
  if (q !== null) choose(+q, false);
})();
