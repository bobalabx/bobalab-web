// Site behaviour for P3: motion toggle, pearl -> direction morph, publication filters, plate step-through, copy.
(() => {
  const R = document.documentElement;
  const reduced = () => R.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pearl -> direction page morph: fetch the page, swap it in inside a same-document view transition.
  document.addEventListener('click', async e => {
    const a = e.target.closest('a[data-morph]');
    if (!a || !document.startViewTransition || reduced() || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    let doc;
    try { doc = new DOMParser().parseFromString(await (await fetch(a.href)).text(), 'text/html'); } catch (x) { location.href = a.href; return; }
    document.startViewTransition(() => {
      document.body.replaceWith(document.adoptNode(doc.body));
      document.title = doc.title;
      history.pushState(null, '', a.href);
      scrollTo(0, 0);
      init(true);
    });
  });
  addEventListener('popstate', () => location.reload());

  function init(arrived) {
    const B = document.body;
    // footer toggle
    const m = document.getElementById('motion');
    if (m) {
      m.setAttribute('aria-pressed', R.dataset.motion === 'reduce');
      m.onclick = () => {
        const on = R.dataset.motion !== 'reduce';
        on ? R.dataset.motion = 'reduce' : delete R.dataset.motion;
        m.setAttribute('aria-pressed', on);
        try { on ? localStorage.setItem('p3m', 1) : localStorage.removeItem('p3m'); } catch (x) {}
      };
    }
    // Figure 2: the line draws and its labels arrive (finite)
    const f2 = B.querySelector('.f2');
    if (f2) { f2.classList.add('arrive'); setTimeout(() => f2.classList.remove('arrive'), arrived ? 1400 : 1200); }

    // Plates: reader-triggered step-through, 4 finite steps
    B.querySelectorAll('.plate').forEach(pl => {
      const box = pl.querySelector('.pl'), st = pl.querySelector('.step'), all = pl.querySelector('.all'), note = pl.querySelector('.stepnote');
      const set = k => {
        if (k === 1 && !reduced()) { box.dataset.at = 1; box.classList.add('pre'); box.offsetWidth; box.classList.remove('pre'); }
        box.dataset.at = k;
        note.innerHTML = k ? box.dataset['n' + k] : '';
        st.textContent = k === 0 ? 'Step through the design' : k < 4 ? 'Next step' : 'Start again';
        all.hidden = !k;
      };
      st.onclick = () => set(+box.dataset.at % 4 + 1);
      all.onclick = () => { set(0); st.focus(); };
    });

    // Publications: filters, search, deep link ?dir=
    const led = B.querySelector('#ledger');
    if (led) {
      const rows = [...led.querySelectorAll('.row')], q = B.querySelector('#q'), res = B.querySelector('#res');
      const tb = [...B.querySelectorAll('[data-ft]')], db = [...B.querySelectorAll('[data-fd]')];
      const apply = () => {
        const t = tb.find(b => b.getAttribute('aria-pressed') === 'true').dataset.ft;
        const ds = db.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.fd);
        const s = q.value.trim().toLowerCase();
        let n = 0;
        rows.forEach(r => {
          const ty = r.dataset.type, ok = (t === 'all' || ty === t || (t === 'thesis' && /dissertation|other/.test(ty)))
            && (!ds.length || ds.some(d => r.dataset.dirs.includes(d))) && (!s || r.textContent.toLowerCase().includes(s));
          if (ok && r.classList.contains('out')) { r.classList.add('in'); setTimeout(() => r.classList.remove('in'), 260); }
          r.classList.toggle('out', !ok); n += ok;
        });
        led.querySelectorAll('.yg').forEach(g => {
          const k = g.querySelectorAll('.row:not(.out)').length;
          g.classList.toggle('out', !k);
          g.querySelector('.cn').textContent = k + (k > 1 ? ' papers' : ' paper');
        });
        res.textContent = n === rows.length ? `Showing all ${n} papers.` : `Showing ${n} of ${rows.length} papers.`;
      };
      tb.forEach(b => b.onclick = () => { tb.forEach(x => x.setAttribute('aria-pressed', x === b)); apply(); });
      db.forEach(b => b.onclick = () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); apply(); });
      q.oninput = apply;
      const d = new URLSearchParams(location.search).get('dir');
      const pre = db.find(b => b.dataset.fd === d);
      if (pre) { pre.setAttribute('aria-pressed', 'true'); apply(); }
      const fb = B.querySelector('.fbtn'), fl = B.querySelector('.filters');
      fb.onclick = () => { const o = fl.dataset.open !== 'true'; fl.dataset.open = o; fb.setAttribute('aria-expanded', o); };
    }

    // Copy citation
    B.querySelectorAll('.cp').forEach(b => b.onclick = () => {
      navigator.clipboard && navigator.clipboard.writeText(document.getElementById(b.dataset.c).textContent).then(() => {
        b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1600);
      });
    });
  }
  init();
})();
