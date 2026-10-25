(() => {
  const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];

  // Footer wordmark: the header's outlined SVG, cloned.
  const wm = $('.hd .wm svg'), fw = $('.ft .wm svg');
  if (wm && fw) fw.replaceWith(wm.cloneNode(true));

  // Questions: a tap or click opens one question (hover previews it on desktop).
  const list = $('#qlist');
  if (list) {
    const items = $$('.q', list);
    const set = (li, open) => {
      li.classList.toggle('open', open);
      $('.q-btn', li).setAttribute('aria-expanded', String(open));
    };
    items.forEach(li => {
      $('.q-btn', li).addEventListener('click', () => {
        const open = !li.classList.contains('open');
        items.forEach(o => o !== li && set(o, false));
        set(li, open);
        list.classList.toggle('has-open', open);
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const o = items.find(li => li.classList.contains('open'));
      if (o) { set(o, false); list.classList.remove('has-open'); $('.q-btn', o).focus(); }
    });
    document.addEventListener('click', e => {
      if (!list.contains(e.target)) { items.forEach(o => set(o, false)); list.classList.remove('has-open'); }
    });
  }

  // After the entrance, the pearls drop the entrance class so hover can make them bob.
  document.querySelectorAll('.settle').forEach(el => el.addEventListener('animationend', () => el.classList.remove('settle'), { once: true }));

  // People: consented photos only (content/people/*.md with photo_consent: true).
  const faces = $('#faces');
  if (faces) {
    const P = [
      ['ryan-chan', 'Ryan Sing Chan'], ['siddhartha-chatterjee', 'Siddhartha Chatterjee'], ['alex-chen', 'Alex Hanyu Chen'],
      ['nicholas-chen', 'Nicholas Chen'], ['mete-ehliz', 'Mete Ehliz'], ['jiaming-guan', 'Jiaming Guan'],
      ['brian-hwang', 'Brian Seong Hyun Hwang'], ['ryan-jesubalan', 'Ryan Jesubalan'], ['daniil-kardava', 'Daniil Kardava'],
      ['tanish-kher', 'Tanish Kher'], ['nathaniel-kung', 'Nathaniel Xian-Zhi Kung'], ['jian-kweon', 'Jian Kweon'],
      ['ryan-lam', 'Ryan Shek Wah Lam'], ['andrew-li', 'Andrew Li'], ['zixian-li', 'Zixian “Amy” Li'],
      ['suyang-ma', 'Suyang Ma'], ['thomas-morelli', 'Thomas Michael Morelli'], ['clinton-nguyen', 'Clinton Nguyen'],
      ['milosz-platek', 'Milosz Rafal Platek'], ['chloe-xiao', 'Chloe Xiao'], ['felicia-ye', 'Felicia Ye'],
    ];
    const fn = n => n.split(' ')[0];
    const dup = f => P.filter(([, m]) => fn(m) === f).length > 1;
    faces.innerHTML = P.map(([s, n]) => {
      const f = fn(n), first = dup(f) ? `${f} ${n.split(' ').at(-1)[0]}.` : f;
      return `<li><a class="face" href="https://bobalabx.github.io/bobalab-web/people/#${s}"><img src="photos/${s}.jpg" alt="Headshot of ${n}" width="64" height="64"><span aria-hidden="true">${first}</span><span class="vh">${n}</span></a></li>`;
    }).join('');
  }

  // Study figure: a three-step walk-through; rest (0) shows the whole design.
  const kit = $('#kit'), btn = $('#kit-btn'), note = $('#kit-note');
  if (kit && btn) {
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const rest = note.innerHTML;
    const S = [
      '<b>1 of 3.</b> Orders arrive: four burger orders per round.',
      '<b>2 of 3.</b> Each order splits into chop, then cook, then plate. The player assigns every subtask to a worker.',
      '<b>3 of 3.</b> After a first phase without tips, the algorithm learns a tip, and play is randomised into four groups.',
    ];
    let at = 0;
    btn.addEventListener('click', () => {
      at = (at + 1) % 4;
      kit.dataset.at = at;
      note.innerHTML = at ? S[at - 1] : rest;
      btn.textContent = at === 0 ? 'Step through' : at === 3 ? 'Start over' : 'Next step';
    });
  }
})();
