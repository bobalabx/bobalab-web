/* BOBALAB P1 "Notebook": figures, linked highlighting, view-transition navigation, filters, plate steps.
   All motion is finite, transform/opacity only, and gated by prefers-reduced-motion and html[data-motion]. */
(() => {
  const d = document, H = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const RM = () => H.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const LIM = 150 * Math.PI / 180; // seed arc capped at +-75 degrees from 12 o'clock
  let DATA, figs = [], ro, cur = '', morph = false, tmr;

  /* ---------- data + growth harness (?n=2x / ?n=4x, synthetic, prototype only) ---------- */
  function load() {
    const j = $('#lab-data');
    if (!j) return null;
    const D = JSON.parse(j.textContent), m = parseInt(new URLSearchParams(location.search).get('n'));
    if (m > 1) {
      const base = D.papers.slice();
      for (let k = 1; k < m; k++) D.papers.push(...base.map(p => ({ ...p, s: p.s + '~' + k, y: p.y - 4 * k, t: 'SYNTHETIC – ' + p.t, b: '' })));
      D.papers.sort((a, b) => a.y - b.y);
    }
    return D;
  }

  /* ---------- pearl figures: orbit + one seed per paper, in year-bin order (oldest at left) ---------- */
  function draw(F) {
    const A = F.area.getBoundingClientRect();
    if (!A.width || !DATA) return;
    let orb = '', tw = '', sd = '', sig = '';
    const pos = {};
    F.items.forEach(it => {
      // layout offsets, not client rects: the intro transform must not shift the geometry
      let e = $('.pf-pearl', it), x0 = 0, y0 = 0;
      const D = e.offsetWidth;
      while (e && e !== F.area) { x0 += e.offsetLeft; y0 += e.offsetTop; e = e.offsetParent; }
      const cx = +(x0 + D / 2).toFixed(1), cy = +(y0 + D / 2).toFixed(1), dir = it.dataset.slug;
      sig += cx + ',' + cy + ',' + D + ';';
      const ps = DATA.papers.map((p, r) => ({ ...p, r })).filter(p => p.d.includes(dir));
      const s = Math.max(3.5, 0.055 * D), r1 = 0.64 * D, gap = Math.max(3, s * 0.9);
      let rings = [[ps, r1]];
      // RC-19 overflow: when the pitch would fall below seed + 2 px, papers older than 3 years move to an outer dashed orbit
      if (ps.length > 1 && LIM * r1 / (ps.length - 1) < 2 * s + 2) {
        const cut = +DATA.asOf.slice(0, 4) - 3;
        rings = [[ps.filter(p => p.y > cut), r1], [ps.filter(p => p.y <= cut), 0.82 * D]];
      }
      let g = '';
      rings.forEach(([L, r], j) => {
        if (!L.length) return;
        orb += `<circle class="orb${j ? ' orb--2' : ''}" cx="${cx}" cy="${cy}" r="${r}"/>`;
        const n = L.length, step = n > 1 ? Math.max(Math.min(0.42, LIM / (n - 1)), Math.min((2 * s + gap) / r, LIM / (n - 1))) : 0;
        L.forEach((p, i) => {
          const a = (i - (n - 1) / 2) * step, x = (cx + r * Math.sin(a)).toFixed(1), y = (cy - r * Math.cos(a)).toFixed(1);
          (pos[p.s] = pos[p.s] || []).push([+x, +y, s]);
          g += `<g class="sd${F.hl.includes(p.s) ? ' hl' : ''}" data-p="${p.s}" style="transform-origin:${cx}px ${cy}px;--r:${p.r};--k:${i}"><circle class="seed" cx="${x}" cy="${y}" r="${s}"/>${p.d.length > 1 ? `<circle class="rg" cx="${x}" cy="${y}" r="${s + 2.75}"/>` : ''}<circle class="hit" cx="${x}" cy="${y}" r="${Math.max(12, s + 4)}"/></g>`;
        });
      });
      sd += `<g class="dg c-${it.dataset.k}" data-d="${dir}" style="transform-origin:${cx}px ${cy}px">${g}</g>`;
    });
    if (sig === F.sig) return; // unchanged geometry: keep running animations
    F.sig = sig;
    for (const [p, L] of Object.entries(pos)) if (L.length > 1) {
      const [[x1, y1, s], [x2, y2]] = L, len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, o = s + 4;
      tw += `<g class="tw${F.hl.includes(p) ? ' on' : ''}" data-p="${p}" transform="translate(${x1} ${y1}) rotate(${a.toFixed(2)})"><line x1="${o}" x2="${(len - o).toFixed(1)}"/></g>`;
    }
    F.svg.setAttribute('viewBox', `0 0 ${A.width} ${A.height}`);
    F.svg.innerHTML = orb + tw + sd;
  }

  /* ---------- linked highlighting: text <-> figure, in both directions ---------- */
  function caption(F, dir, paper, from) {
    const ls = $$('.cap-l', F.f);
    if (!ls.length) return;
    let key = '';
    if (paper && $(`.sd[data-p="${paper}"]`, F.f)) {
      const p = DATA.papers.find(x => x.s === paper), other = p.d.filter(x => x !== from).map(x => DATA.dirs[x].n);
      $('[data-cap="seed"]', F.f).innerHTML = `<b>${esc(p.t)}${/[?.!]$/.test(p.t) ? '' : '.'}</b> ${p.ty}, ${p.y}.${other.length ? ` ${from ? 'Also in' : 'In'} ${other.join(' and ')}.` : ''} ${esc(p.b || '')}`;
      key = 'seed';
    } else if (dir) key = dir;
    ls[0].parentNode.classList.add('sw');
    ls.forEach(l => l.classList.toggle('is-on', l.dataset.cap === key));
  }
  function state(dir = '', paper = '', from = '') {
    const k = dir + '|' + paper;
    if (k === cur) return;
    cur = k;
    figs.forEach(F => {
      const f = F.f, has = paper && $(`.sd[data-p="${paper}"]`, f);
      dir ? f.dataset.active = dir : delete f.dataset.active;
      has ? f.dataset.paper = paper : delete f.dataset.paper;
      $$('.pf-item', f).forEach(i => i.classList.toggle('is-on', i.dataset.slug === dir));
      $$('.dg', f).forEach(g => g.classList.toggle('on', g.dataset.d === dir));
      $$('.sd', f).forEach(g => g.classList.toggle('lit', g.dataset.p === paper));
      $$('.tw', f).forEach(g => g.classList.toggle('on', g.dataset.p === paper || F.hl.includes(g.dataset.p)));
      caption(F, dir, paper, from);
    });
    $$('[data-paper]').forEach(e => e.classList.toggle('is-lit', e.dataset.paper === paper));
    $$('.hd').forEach(e => e.classList.toggle('lit', e.dataset.p === paper));
  }
  function sense(t, delay) {
    clearTimeout(tmr);
    const sd = t.closest && t.closest('.sd'), pp = t.closest && (t.closest('[data-paper]') || t.closest('.hd'));
    const dd = t.closest && (t.closest('[data-dir]') || t.closest('.pf-item'));
    if (sd) return state('', sd.dataset.p, sd.parentNode.dataset.d);
    if (pp) return state('', pp.dataset.paper || pp.dataset.p);
    const dir = dd ? dd.dataset.dir || dd.dataset.slug : '';
    if (dir && delay) tmr = setTimeout(() => state(dir), 80); else state(dir);
  }
  d.addEventListener('pointerover', e => sense(e.target, 1));
  d.addEventListener('focusin', e => sense(e.target));
  d.addEventListener('focusout', e => { if (!e.relatedTarget) state(); });

  /* ---------- page navigation with a same-document view transition (pearl -> direction morph) ---------- */
  const canVT = !!d.startViewTransition && /^http/.test(location.protocol);
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !canVT || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !/\.html$/.test(u.pathname) || (u.pathname === location.pathname && u.search === location.search)) return;
    e.preventDefault();
    go(u, true);
  });
  addEventListener('popstate', () => go(new URL(location.href), false));
  async function go(u, push) {
    let doc;
    try { doc = new DOMParser().parseFromString(await (await fetch(u.pathname + u.search)).text(), 'text/html'); }
    catch (err) { location.href = u.href; return; }
    morph = !RM() && !!$('.pf-pearl[style*="view-transition-name"]') && !!$('.pf-pearl[style*="view-transition-name"]', doc);
    const vt = d.startViewTransition(() => {
      d.body.replaceWith(d.adoptNode(doc.body));
      d.title = doc.title;
      H.dataset.page = doc.documentElement.dataset.page;
      if (push) history.pushState(null, '', u.href);
      init();
      const t = u.hash && $(u.hash);
      t ? t.scrollIntoView() : scrollTo(0, 0);
      const m = $('#main');
      if (m) { m.tabIndex = -1; m.focus({ preventScroll: true }); }
    });
    vt.finished.finally(() => $$('.rp.await').forEach(x => { x.classList.remove('await'); x.classList.add('spread'); setTimeout(() => x.classList.remove('spread'), 900); }));
  }

  /* ---------- Figure 2 (direction page) assembles when scrolled into view ---------- */
  function fig2() {
    const f = $('#fig2');
    if (!f || RM() || !('IntersectionObserver' in window)) return;
    f.classList.add('pre');
    const io = new IntersectionObserver(es => {
      if (es.some(x => x.isIntersecting)) { f.classList.replace('pre', 'play'); io.disconnect(); setTimeout(() => f.classList.remove('play'), 1900); }
    }, { threshold: 0.35 });
    io.observe(f);
  }

  /* ---------- publications: type, direction and text filters ---------- */
  function pubs() {
    const box = $('#flt');
    if (!box) return;
    const S = { type: 'all', dirs: new Set(), q: '' }, led = $('.ledger'), q = $('#q'), tg = $('.flt-tg', box);
    const pre = new URLSearchParams(location.search).get('dir');
    if (pre) S.dirs.add(pre);
    tg.onclick = () => tg.setAttribute('aria-expanded', tg.getAttribute('aria-expanded') !== 'true');
    box.onclick = e => {
      const b = e.target.closest('.fb');
      if (!b) return;
      const v = b.dataset.v;
      if (b.dataset.f === 'type') S.type = v; else S.dirs.has(v) ? S.dirs.delete(v) : S.dirs.add(v);
      apply(1);
    };
    q.oninput = () => { S.q = q.value.trim().toLowerCase(); apply(1); };
    $('#clr').onclick = () => { S.type = 'all'; S.dirs.clear(); S.q = q.value = ''; apply(1); };
    function apply(anim) {
      $$('.fb', box).forEach(b => b.setAttribute('aria-pressed', b.dataset.f === 'type' ? b.dataset.v === S.type : S.dirs.has(b.dataset.v)));
      let np = 0, nw = 0;
      const vis = new Set();
      $$('.e', led).forEach(e => {
        const t = e.dataset.type, ok = (S.type === 'all' || t === S.type) && (!S.dirs.size || e.dataset.dirs.split(' ').some(x => S.dirs.has(x))) && (!S.q || e.textContent.toLowerCase().includes(S.q));
        e.hidden = !ok;
        if (ok) { t === 'wip' ? nw++ : np++; vis.add(e.dataset.paper); }
      });
      $$('.yg', led).forEach(g => { g.hidden = !$('.e:not([hidden])', g); });
      $$('.hd').forEach(x => x.classList.toggle('off', !vis.has(x.dataset.p)));
      $('#none').hidden = np + nw > 0;
      const all = !S.dirs.size && S.type === 'all' && !S.q;
      $('#fst').textContent = all ? `Showing all ${np} papers and ${nw} in progress.` : `Showing ${np} of 13 papers${nw ? ` and ${nw} in progress` : ''}.`;
      if (anim) { led.classList.remove('steep'); void led.offsetWidth; led.classList.add('steep'); }
    }
    apply(0);
    if (pre && matchMedia('(max-width: 39.99rem)').matches) tg.setAttribute('aria-expanded', 'true');
  }

  /* ---------- study-design plate: reader-triggered, four finite steps ---------- */
  const MSG = [
    'Orders arrive. Each round brings four burger orders, and players manage three virtual workers: chef, sous-chef and server.',
    'Each order splits into three subtasks in a fixed order: chop, then cook, then plate. A worker’s speed on a task is revealed only after the assignment.',
    'The chef leaves. The disrupted configuration runs two full rounds, then four without the chef; the optimal finish rises from 20 to 34 ticks.',
    'Two phases. Phase I has no tips and records play as trace data; Phase II randomises participants into four arms.'];
  function plate() {
    const P = $('#plate'), b = $('#step'), st = $('#step-st');
    if (!P) return;
    const els = $$('[data-s]', P);
    let k = 0;
    const show = n => {
      k = n;
      els.forEach(e => e.classList.remove('in'));
      if (!n) { delete P.dataset.step; els.forEach(e => e.classList.remove('off')); st.textContent = ''; b.textContent = 'Step through the design'; return; }
      P.dataset.step = n;
      void P.offsetWidth;
      els.forEach(e => { const s = +e.dataset.s; e.classList.toggle('off', s > n); if (s === n) e.classList.add('in'); });
      st.textContent = `Step ${n} of 4. ${MSG[n - 1]}`;
      b.textContent = n < 4 ? `Next step, ${n + 1} of 4` : 'Step through again';
    };
    P.reset = () => { show(0); b.hidden = RM(); };
    P.reset();
    b.onclick = () => show(k >= 4 ? 1 : k + 1);
  }

  /* ---------- small things ---------- */
  function misc() {
    const rm = $('#rm');
    if (rm) {
      rm.setAttribute('aria-pressed', H.dataset.motion === 'reduce');
      rm.onclick = () => {
        const on = H.dataset.motion !== 'reduce';
        on ? H.dataset.motion = 'reduce' : delete H.dataset.motion;
        try { localStorage.setItem('p1-motion', on ? 'reduce' : ''); } catch (e) {}
        rm.setAttribute('aria-pressed', on);
        const P = $('#plate');
        if (P && P.reset) P.reset();
      };
    }
    $$('[data-copy]').forEach(b => b.onclick = async () => {
      try { await navigator.clipboard.writeText($('#' + b.dataset.copy).textContent); b.textContent = 'Copied'; }
      catch (e) { b.textContent = 'Select the text to copy it'; }
      setTimeout(() => { b.textContent = 'Copy BibTeX'; }, 2000);
    });
    $$('canvas[data-px]').forEach(c => {
      const i = new Image();
      i.onload = () => { const x = c.getContext('2d'); x.clearRect(0, 0, 16, 16); x.drawImage(i, 0, 0, 16, 16); };
      i.src = 'favicon.svg';
    });
  }

  function init() {
    DATA = load();
    cur = '';
    if (ro) ro.disconnect();
    figs = DATA ? $$('.pf').map(f => ({ f, area: $('.pf-area', f), svg: $('.pf-svg', f), items: $$('.pf-item', f), hl: (f.dataset.hl || '').split(' ').filter(Boolean) })) : [];
    if (morph) $$('.rp').forEach(x => x.classList.add('await'));
    morph = false;
    figs.forEach(draw);
    ro = new ResizeObserver(() => figs.forEach(draw));
    figs.forEach(F => ro.observe(F.area));
    if (H.hasAttribute('data-intro')) setTimeout(() => H.removeAttribute('data-intro'), 1700);
    fig2(); pubs(); plate(); misc();
  }
  init();
  if (d.fonts) d.fonts.ready.then(() => figs.forEach(draw));
})();
