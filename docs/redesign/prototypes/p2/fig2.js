// P2 Figure 2 (direction page): key rows and pearls light each other; papers settle once on arrival.
(() => {
  const d = document, P = window.P2 || {};
  const SETTLE = 'linear(0,.18,.455,.671,.812,.896,.944,.971,.985,.992,.996,.998,.999,1)';
  const red = () => !P.red || P.red();
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const drop = (els, gap, by) => els.forEach((c, i) => c.animate([{ transform: `translateY(-${by}px)`, opacity: 0 }, { opacity: 1, offset: .1 }, { transform: 'none', opacity: 1 }], { duration: 440, delay: gap(i), easing: SETTLE, fill: 'backwards' }));
  const f2 = d.getElementById('fig2');
  if (f2) {
    const hot = id => { $$('.hot', f2).forEach(x => x.classList.remove('hot')); if (id) $$(`[data-s="${id}"],[data-w="${id}"]`, f2).forEach(x => x.classList.add('hot')); };
    const pick = e => { const el = e.target.closest('[data-s],[data-w]'); hot(el && (el.dataset.s || el.dataset.w)); };
    f2.addEventListener('pointerover', pick);
    f2.addEventListener('focusin', pick);
    f2.addEventListener('pointerleave', () => hot());
    f2.addEventListener('focusout', () => hot());
    // Arrival: the first time Figure 2 scrolls into view, its papers settle in year order.
    const ps = $$('.fig2-pile .pearl', f2), rg = $$('.fig2-pile .ring', f2), all = [...ps, ...rg];
    if (!red() && 'IntersectionObserver' in window && f2.getBoundingClientRect().top > innerHeight * .8) {
      all.forEach(c => { c.style.opacity = 0; });
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        all.forEach(c => { c.style.opacity = ''; });
        drop(ps, i => i * 160, .9);
        rg.forEach(r => r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: ps.length * 160 + 300, fill: 'backwards' }));
      }, { threshold: .5 });
      io.observe(f2.querySelector('.fig2-art'));
    }
  }
})();
