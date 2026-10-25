// P2 study-design plate: a reader-driven, finite step-through (no autoplay).
(() => {
  const d = document, pl = d.getElementById('plate');
  if (!pl) return;
  const SETTLE = 'linear(0,.18,.455,.671,.812,.896,.944,.971,.985,.992,.996,.998,.999,1)';
  const red = () => window.P2 && window.P2.red();
  const st = pl.querySelector('.stepper'), b = d.getElementById('step-btn'), tx = d.getElementById('step-text');
  const $$ = s => [...pl.querySelectorAll(s)];
  const say = [
    'Four orders arrive in a round.',
    'Each order splits into three subtasks: chop, then cook, then plate. Twelve subtasks.',
    'Disrupted configuration: after two full rounds the chef leaves, and four rounds are understaffed.',
    'Phase I records play without tips; Phase II randomises players into four arms.',
  ];
  const fall = (els, by, gap, base = 0) => els.forEach((e, i) => e.animate([{ transform: `translateY(-${by}px)`, opacity: 0 }, { opacity: 1, offset: .12 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: base + i * gap, easing: SETTLE, fill: 'backwards' }));
  let s = 0;
  function go(k) {
    s = k; pl.dataset.step = k;
    if (!k) { tx.textContent = 'Whole design shown.'; b.textContent = 'Step through the design'; return; }
    tx.textContent = `Step ${k} of 4. ${say[k - 1]}`;
    b.textContent = k < 4 ? 'Next step' : 'Show the whole design';
    if (red()) return;
    if (k === 1) fall($$('.order'), 36, 110);
    if (k === 3) fall($$('.disrupt .rd.under'), 8, 90, 200);
    if (k === 4) { fall($$('.arms li'), 14, 110, 160); $$('.arm-link').forEach((p, i) => p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 100 + i * 110, fill: 'backwards' })); }
  }
  st.hidden = false;
  b.addEventListener('click', () => go(s === 4 ? 0 : s + 1));
})();
