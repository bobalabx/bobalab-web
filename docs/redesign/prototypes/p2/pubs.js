// P2 publications: type and direction filters (button[aria-pressed]), search, steeping results,
// mobile disclosure, ?dir= preselect and the ?n= growth harness.
(() => {
  const d = document, q = new URLSearchParams(location.search), res = d.querySelector('.results');
  if (!res) return;
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const n = { '2x': 2, '4x': 4 }[q.get('n')] || 1;
  if (n > 1) $$('.pub', res).forEach(li => { for (let k = n - 1; k > 0; k--) { const c = li.cloneNode(true), t = c.querySelector('.pub-title'); c.removeAttribute('id'); t.textContent = 'SYNTHETIC – ' + t.textContent; li.after(c); } });
  const items = $$('.pub', res), total = items.length;
  const st = { type: 'all', dirs: new Set(), q: '' };
  const SLUG = { 'algorithmic-advice': 'aa', 'ai-at-work': 'ai', 'learning-on-the-job': 'loj', 'platform-work': 'pw' };
  const btns = $$('.ft');
  const count = d.getElementById('count'), empty = d.querySelector('.empty');
  const red = () => window.P2 && window.P2.red();

  function apply(first) {
    let shown = 0;
    items.forEach(li => {
      const ok = (st.type === 'all' || li.dataset.type === st.type) &&
        (!st.dirs.size || li.dataset.dirs.split(' ').some(x => st.dirs.has(x))) &&
        (!st.q || li.textContent.toLowerCase().includes(st.q));
      li.hidden = !ok;
      if (ok) { shown++; if (!first && !red()) { li.classList.remove('steeping'); void li.offsetWidth; li.classList.add('steeping'); } }
    });
    $$('.year', res).forEach(s => { s.hidden = !s.querySelector('.pub:not([hidden])'); });
    count.textContent = shown === total ? `Showing all ${total} entries.` : `Showing ${shown} of ${total} entries.`;
    empty.hidden = shown > 0;
    btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.f === 'type' ? b.dataset.v === st.type : st.dirs.has(b.dataset.v)));
  }
  btns.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.f === 'type') st.type = b.dataset.v;
    else st.dirs.has(b.dataset.v) ? st.dirs.delete(b.dataset.v) : st.dirs.add(b.dataset.v);
    apply();
  }));
  const input = d.getElementById('q');
  input.addEventListener('input', () => { st.q = input.value.trim().toLowerCase(); apply(); });
  d.querySelector('[data-reset]').addEventListener('click', () => { st.type = 'all'; st.dirs.clear(); st.q = input.value = ''; apply(); });
  const tg = d.querySelector('.filter-toggle'), panel = d.getElementById('filters');
  tg.addEventListener('click', () => { const o = tg.getAttribute('aria-expanded') !== 'true'; tg.setAttribute('aria-expanded', o); panel.classList.toggle('open', o); });
  const pre = SLUG[q.get('dir')];
  if (pre) st.dirs.add(pre);
  apply(true);
})();
