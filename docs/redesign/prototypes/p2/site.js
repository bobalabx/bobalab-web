// P2 shared: motion gate + toggle, direction highlighting (tags and piles share one state),
// BibTeX copy, and the pearl-to-page view transition.
(() => {
  const d = document, h = d.documentElement;
  const red = () => h.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = window.P2 = window.P2 || {};
  P.red = red;

  const t = d.querySelector('.motion-toggle');
  if (t) {
    t.setAttribute('aria-pressed', h.dataset.motion === 'reduce');
    t.onclick = () => {
      const on = h.dataset.motion !== 'reduce';
      on ? (h.dataset.motion = 'reduce') : delete h.dataset.motion;
      t.setAttribute('aria-pressed', on);
      try { on ? localStorage.setItem('p2-motion', 'reduce') : localStorage.removeItem('p2-motion'); } catch (e) {}
    };
  }

  // Hovering or focusing anything that belongs to a direction lights every mark of that direction.
  let cur = null;
  const set = k => {
    if (k === cur) return;
    cur = k;
    k ? (d.body.dataset.hl = k) : delete d.body.dataset.hl;
    d.dispatchEvent(new CustomEvent('p2hl', { detail: k }));
  };
  const key = e => { const el = e.target.closest && e.target.closest('[data-dir]'); return el ? el.dataset.dir : null; };
  d.addEventListener('pointerover', e => set(key(e)));
  d.addEventListener('focusin', e => set(key(e)));
  d.addEventListener('focusout', () => set(null));

  d.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (!b || !navigator.clipboard) return;
    navigator.clipboard.writeText(d.getElementById(b.dataset.copy).textContent).then(() => {
      b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy BibTeX'; }, 2000);
    });
  });

  // Cross-document view transitions are declared in CSS; skip them when motion is reduced.
  const skip = e => { if (e.viewTransition && red()) e.viewTransition.skipTransition(); };
  addEventListener('pageswap', skip);
  addEventListener('pagereveal', skip);

  // Same-document fallback for browsers with startViewTransition but no cross-document support.
  if (d.startViewTransition && !('onpagereveal' in window)) {
    const ran = new Set([...d.querySelectorAll('script[src]')].map(x => x.getAttribute('src')));
    d.addEventListener('click', async e => {
      const a = e.target.closest('a[href="research.html"]');
      if (!a || red() || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      const doc = new DOMParser().parseFromString(await (await fetch(a.href)).text(), 'text/html');
      d.startViewTransition(() => {
        d.title = doc.title; d.body.replaceWith(d.adoptNode(doc.body));
        history.pushState(null, '', a.href); scrollTo(0, 0);
        d.body.querySelectorAll('script[src]').forEach(x => { const src = x.getAttribute('src'); if (!ran.has(src)) { ran.add(src); const n = d.createElement('script'); n.src = src; d.head.append(n); } });
        P.fig && P.fig();
      });
    });
    addEventListener('popstate', () => location.reload());
  }
})();
