// P2 Figure 1: settling intro, hover naming, twin papers, growth harness (RC-19).
(() => {
  const d = document, P = window.P2 = window.P2 || {}, S3 = Math.sqrt(3) / 2;
  const SETTLE = 'linear(0,.18,.455,.671,.812,.896,.944,.971,.985,.992,.996,.998,.999,1)';
  const red = () => !P.red || P.red();
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const circ = (cls, cx, cy, r, k, v) => { const c = d.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('class', cls); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r); c.dataset[k] = v; return c; };
  const drop = (els, gap, by) => els.forEach((c, i) => c.animate([{ transform: `translateY(-${by}px)`, opacity: 0 }, { opacity: 1, offset: .1 }, { transform: 'none', opacity: 1 }], { duration: 440, delay: gap(i), easing: SETTLE, fill: 'backwards' }));

  P.fig = () => {
    const D = JSON.parse((d.getElementById('lab-data') || {}).textContent || 'null');
    if (!D) return;
    const name = s => { const b = s.split('~'), p = D.papers[b[0]]; return [(b[1] ? 'SYNTHETIC – ' : '') + p[0], p]; };

    const f1 = d.getElementById('fig1');
    if (f1) {
      const cap = f1.querySelector('.cap'), live = cap.querySelector('.cap-live');
      const say = html => { if (html) live.innerHTML = html; cap.classList.toggle('live', !!html); };
      const n = { '2x': 2, '4x': 4 }[new URLSearchParams(location.search).get('n')] || 1;
      if (n > 1) { // growth harness (RC-19): duplicate papers; one floor width for every pile
        const ol = f1.querySelector('.piles'), piles = $$('.pile', ol);
        const sets = piles.map(li => { const [ps, ws] = D.piles[li.dataset.dir]; return [li, ps.flatMap(s => [s, ...Array.from({ length: n - 1 }, (_, k) => s + '~' + (k + 1))]), ws]; });
        let w = 3; const max = Math.max(...sets.map(s => s[1].length)); while (w * (w + 1) / 2 < max) w++;
        const rows = Math.max(...sets.map(s => Math.ceil(s[2].length / w))), H = rows + .55 + .84 + (w - 1) * S3;
        const u = Math.min(parseFloat(getComputedStyle(ol).getPropertyValue('--u')), Math.floor(piles[0].clientWidth / w));
        ol.style.cssText = `--w:${w};--hp:${H.toFixed(3)};--u:${u}px`;
        sets.forEach(([li, ps, ws]) => {
          const svg = li.querySelector('svg'), gp = svg.querySelector('.pearls'), gr = svg.querySelector('.rings');
          svg.setAttribute('viewBox', `0 0 ${w} ${H.toFixed(3)}`); gp.textContent = ''; gr.textContent = '';
          let k = 0;
          for (let r = 0; r < w && k < ps.length; r++) for (let i = 0; i < w - r && k < ps.length; i++, k++) gp.append(circ('pearl', i + r / 2 + .5, (H - .42 - r * S3).toFixed(3), .42, 's', ps[k]));
          ws.forEach((s, i) => gr.append(circ('ring', i % w + .5, Math.floor(i / w) + .5, .4, 'w', s)));
          li.querySelector('.pile-count').textContent = `${ps.length} papers, ${ws.length} in progress`;
        });
        cap.querySelector('.cap-static').insertAdjacentHTML('beforeend', ` <span class="synthetic">Growth test: every paper duplicated ${n} times; copies are marked SYNTHETIC.</span>`);
      }
      d.addEventListener('p2hl', e => { if (f1.querySelector('.hot')) return; const q = e.detail && D.dirs[e.detail]; say(q && `<b>${q[0]}.</b> ${q[1]}`); });
      f1.addEventListener('pointerover', e => {
        const c = e.target.closest('.pearl, .ring');
        $$('.hot', f1).forEach(x => x.classList.remove('hot'));
        if (!c) return;
        if (c.dataset.w) { c.classList.add('hot'); say(`<b>${D.wip[c.dataset.w]}.</b> In progress.`); return; }
        const [t, p] = name(c.dataset.s);
        $$(`.pearl[data-s="${c.dataset.s}"]`, f1).forEach(x => x.classList.add('hot'));
        const own = c.closest('.pile').dataset.dir, other = p[2].filter(x => x !== own).map(x => D.dirs[x][0]);
        say(`<b>${t}.</b> ${p[1]}${other.length ? ` Also in ${other.join(' and ')}.` : ''} ${p[3]}`);
      });
      f1.addEventListener('pointerleave', () => { $$('.hot', f1).forEach(x => x.classList.remove('hot')); say(''); });

      // Intro, once per session: papers settle into their piles in order of year, all piles together,
      // so the lab's output visibly accumulates; work in progress fades in last, unsettled.
      let seen = false;
      try { seen = sessionStorage.getItem('p2-intro') && !/intro=1/.test(location.search); sessionStorage.setItem('p2-intro', 1); } catch (e) {}
      if (!red() && !seen) {
        const ps = $$('.pearl', f1), yr = c => +D.papers[c.dataset.s.split('~')[0]][4];
        const years = [...new Set(ps.map(yr))].sort();
        const order = ps.slice().sort((a, b) => yr(a) - yr(b)), k = {};
        const ds = order.map(c => { const y = years.indexOf(yr(c)), j = k[y] = (k[y] || 0) + 1; return 120 + y * 150 + (j - 1) * Math.max(8, 36 / n); });
        drop(order, i => ds[i], .7);
        const end = Math.max(...ds) + 380;
        $$('.ring', f1).forEach(r => r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: end, fill: 'backwards' }));
      }
    }

  };
  P.fig();
})();
