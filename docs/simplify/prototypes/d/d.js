(() => {
  const $ = (s, e = document) => [...e.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- home: the pile of people + the four directions ----------------------
  const pile = document.querySelector('.pile');
  if (pile) {
    const btns = $('.p button', pile);
    const live = document.querySelector('.cap-live');
    const def = live.innerHTML;
    const dirs = $('.dir');
    let open = null; // the open direction <li>

    // Desktop: rest the pile's floor on the bottom of the closed directions list,
    // then keep it still while a direction opens (only re-measured when all are closed).
    const lab = document.querySelector('.lab'), list = document.querySelector('.dirs'), hero = document.querySelector('.hero');
    const seat = () => {
      if (innerWidth < 1024) { lab.style.removeProperty('--lab-top'); return; }
      if (document.querySelector('.dir-b[aria-expanded="true"]')) return;
      const y = list.getBoundingClientRect().bottom - hero.getBoundingClientRect().top - parseFloat(getComputedStyle(hero).paddingTop);
      lab.style.setProperty('--lab-top', Math.max(0, y - pile.offsetHeight - 2) + 'px');
    };
    seat(); addEventListener('resize', seat); document.fonts && document.fonts.ready.then(seat);
    // The pearls settle once, when the pile first comes into view (finite; off under reduced motion).
    const drop = () => { pile.classList.remove('wait'); pile.classList.add('settle'); setTimeout(() => pile.classList.remove('settle'), 1600); };
    if (!reduce && 'IntersectionObserver' in window) {
      pile.classList.add('wait');
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); drop(); } }, { threshold: 0.25 });
      io.observe(pile);
      setTimeout(() => { if (pile.classList.contains('wait')) { io.disconnect(); pile.classList.remove('wait'); } }, 8000);
    }

    const say = html => { live.innerHTML = html; };
    const names = d => {
      const lit = $(`.p[data-dirs~="${d.dataset.dir}"] button`, pile).map(b => b.dataset.name);
      return lit.join(', ').replace(/, ([^,]*)$/, ' and $1');
    };
    const light = d => {
      $('.p', pile).forEach(p => p.classList.remove('is-lit'));
      pile.classList.toggle('has-lit', !!d);
      dirs.forEach(x => x.classList.toggle('is-hot', x === d));
      if (!d) { say(def); return; }
      const c = getComputedStyle(d).getPropertyValue('--dir');
      $(`.p[data-dirs~="${d.dataset.dir}"]`, pile).forEach(p => { p.classList.add('is-lit'); p.style.setProperty('--lit', c); });
      say(`<b>${d.querySelector('.dir-n').textContent}:</b> ${names(d)} work on its current projects.`);
    };
    const rest = () => light(open);

    dirs.forEach(d => {
      const b = d.querySelector('.dir-b'), more = d.querySelector('.dir-more');
      b.addEventListener('click', () => {
        const was = b.getAttribute('aria-expanded') === 'true';
        dirs.forEach(x => { x.querySelector('.dir-b').setAttribute('aria-expanded', 'false'); x.querySelector('.dir-more').hidden = true; });
        if (!was) { b.setAttribute('aria-expanded', 'true'); more.hidden = false; open = d; } else open = null;
        light(open);
      });
      d.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') light(d); });
      d.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') rest(); });
      b.addEventListener('focus', () => light(d));
      b.addEventListener('blur', rest);
    });

    // People: hover, focus or tap shows a name; one tab stop, arrow keys move.
    const person = b => say(`<b>${b.dataset.name}</b>, ${b.dataset.role}.`);
    const me = b => { $('.p.is-me', pile).forEach(p => p.classList.remove('is-me')); if (b) b.parentNode.classList.add('is-me'); };
    btns.forEach((b, i) => {
      b.addEventListener('pointerenter', () => person(b));
      b.addEventListener('pointerleave', () => { if (document.activeElement !== b) rest(); });
      b.addEventListener('focus', () => { person(b); btns.forEach(x => x.tabIndex = -1); b.tabIndex = 0; });
      b.addEventListener('blur', () => { me(null); rest(); });
      b.addEventListener('click', () => { person(b); me(b); });
      b.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); btns[(i + k + btns.length) % btns.length].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); btns[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1].focus(); }
        else if (e.key === 'Escape') { b.blur(); }
      });
    });
  }

  // ---- research: optional timeline ------------------------------------------
  const fig = document.getElementById('fig1');
  if (fig) {
    const tg = document.querySelector('.ex-toggle');
    const D = JSON.parse(document.getElementById('fig-data').textContent);
    const name = Object.fromEntries(D.dirs.map(d => [d[0], d[1]]));
    const svg = fig.querySelector('svg'), body = fig.querySelector('.f1-body'), lv = fig.querySelector('.f1-live');
    const lanes = $('.f1-lanes li', fig);
    const col = d => getComputedStyle(lanes.find(l => l.dataset.d === d)).getPropertyValue('--dir');
    const draw = () => {
      if (fig.hidden || innerWidth < 768) return;
      const B = body.getBoundingClientRect(), W = B.width, x0 = Math.min(300, W * 0.24), off = 34;
      const yc = {}; lanes.forEach(l => { const r = l.getBoundingClientRect(); yc[l.dataset.d] = r.top - B.top + r.height / 2 + off; });
      const yrs = [...new Set(D.papers.map(p => p[1]))], n = D.papers.length, gap = 18;
      const cw = Math.min(56, (W - x0 - 170 - gap * (yrs.length - 1)) / n);
      let i = 0, s = '', X = {};
      yrs.forEach((y, k) => {
        const a = x0 + k * gap + i * cw;
        D.papers.filter(p => p[1] === y).forEach(p => { X[p[0]] = x0 + k * gap + i * cw + cw / 2; i++; });
        const b = x0 + k * gap + i * cw;
        s += `<path d="M${a + 3} 24H${b - 3}" stroke="var(--rule)"/><text x="${(a + b) / 2}" y="16" text-anchor="middle">${y}</text>`;
      });
      const nx = X[D.papers[n - 1][0]] + cw / 2 + 26, top = off, bot = body.offsetHeight + off;
      let ln = '', lk = '', dt = '';
      D.dirs.forEach(([d]) => {
        const f = D.papers.find(p => p[2].includes(d)), y = yc[d];
        ln += `<path class="ln" data-d="${d}" d="M${X[f[0]]} ${y}H${nx}" stroke="${col(d)}" stroke-width="1.5"/>`;
        D.wip.filter(w => w[1].includes(d)).forEach((w, j) => {
          dt += `<circle class="rg hit" data-w="${w[0]}" data-d="${w[1].join(' ')}" cx="${nx + 44 + j * 26}" cy="${y}" r="7" fill="var(--paper)" stroke="${col(d)}" stroke-width="2"/>`;
        });
        dt += `<circle class="pearl" cx="${nx}" cy="${y}" r="16"/>`;
      });
      D.papers.forEach(p => {
        const x = X[p[0]], ys = p[2].map(d => yc[d]);
        if (ys.length > 1) lk += `<path class="lk" data-s="${p[0]}" data-d="${p[2].join(' ')}" d="M${x} ${Math.min(...ys) + 7}V${Math.max(...ys) - 7}" stroke="var(--ink)"/>`;
        p[2].forEach(d => { dt += `<circle class="dot hit" data-s="${p[0]}" data-d="${p[2].join(' ')}" cx="${x}" cy="${yc[d]}" r="7" fill="${col(d)}"/>`; });
      });
      svg.innerHTML = `<rect class="zone" x="${nx}" y="${top + 2}" width="${W - nx}" height="${bot - top - 4}"/><text x="${nx}" y="16" text-anchor="middle">now</text><text x="${nx + 36}" y="16">in progress</text>${s}${ln}${lk}<path class="now" d="M${nx} ${top}V${bot}"/>${dt}`;
    };
    const reset = () => { svg.classList.remove('dimming'); $('.dim', svg).forEach(e => e.classList.remove('dim')); lv.textContent = lv.dataset.def; };
    svg.addEventListener('pointerover', e => {
      const t = e.target.dataset; if (!t.s && !t.w) return;
      const p = t.s ? D.papers.find(x => x[0] === t.s) : null, w = t.w ? D.wip.find(x => x[0] === t.w) : null;
      svg.classList.add('dimming');
      $('[data-d]', svg).forEach(el => el.classList.toggle('dim', t.s ? el.dataset.s !== t.s && !(el.classList.contains('ln') && p[2].includes(el.dataset.d)) : el.dataset.w !== t.w));
      lv.innerHTML = p ? `<b>${p[3]}</b>${/[?.!]$/.test(p[3]) ? '' : '.'} ${p[4]}, ${p[1]}. ${p[2].map(d => name[d]).join(' and ')}.` : `<b>${w[2]}</b>. In progress, ${w[1].map(d => name[d]).join(' and ')}.`;
    });
    svg.addEventListener('pointerout', reset);
    tg.addEventListener('click', () => {
      const on = fig.hidden; fig.hidden = !on; tg.setAttribute('aria-expanded', String(on));
      tg.textContent = on ? 'Hide the timeline' : 'Show the timeline'; draw();
    });
    if (location.hash === '#explore-open') tg.click();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 80); });
  }
})();
