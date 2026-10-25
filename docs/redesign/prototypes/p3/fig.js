(() => {
  const F = document.getElementById('fig1'); if (!F) return;
  const D = JSON.parse(document.getElementById('lab-data').textContent), O = F.dataset, $ = (s, e = document) => e.querySelectorAll(s);
  const svg = F.querySelector('svg'), ol = F.querySelector('.lines'), bd = F.querySelector('.f1-body'), lv = F.querySelector('.f1-live');
  const nm = d => D.dirs[d][0], col = d => `var(--${D.dirs[d][2]})`, has = (p, d) => p.d.includes(d);
  const P = D.papers.map(a => ({ s: a[0], y: a[1], d: a[2], t: a[3], k: a[4], b: a[5] })), W = D.wip.map(a => ({ s: a[0], d: a[1], t: a[2] })).sort((a, b) => a.t < b.t ? -1 : 1);
  (O.order ? D[O.order] : D.order).forEach(s => ol.append(ol.querySelector(`[data-d="${s}"]`)));
  const L = [...ol.children];
  L.forEach(li => {
    const d = li.dataset.d; let h = '', y = 0;
    P.filter(p => has(p, d)).forEach(p => { if (p.y !== y) h += `<span class="y">${y = p.y}</span>`; h += '<i></i>'; });
    li.querySelector('.strip').innerHTML = h + '<span class="p"></span>' + W.filter(w => has(w, d)).map(() => '<i class="r"></i>').join('');
    li.querySelector('.pearl').onclick = () => li.querySelector('a').click();
  });
  const draw = () => {
    if (innerWidth < 768) return;
    const B = bd.getBoundingClientRect(), Wd = B.width, x0 = L[0].firstElementChild.offsetWidth + 16, top = ol.getBoundingClientRect().top - B.top, H = ol.offsetHeight, yc = {};
    L.forEach(li => { const r = li.getBoundingClientRect(); yc[li.dataset.d] = r.top - B.top + r.height / 2; });
    const yrs = [...new Set(P.map(p => p.y))], nb = yrs.length, n = P.length, g = (nb - 1) * 16;
    let cw = (Wd - x0 - 230 - g) / n; const pk = cw < 28, rg = O.links || pk, r = pk ? 5 : 7;
    cw = pk ? Math.max(12, Math.min(16, (Wd - x0 - 140 - g) / n)) : Math.min(64, cw);
    if (pk) O.packed = 1;
    let s = '', i = 0, ln = '', lk = '', dt = '', ht = '';
    const X = {}, T = {};
    yrs.forEach((y, k) => {
      const a = x0 + k * 16 + i * cw;
      P.filter(p => p.y === y).forEach(p => { X[p.s] = x0 + k * 16 + i * cw + cw / 2; T[p.s] = 120 + i * 30 + k * 60; i++; });
      const b = x0 + k * 16 + i * cw;
      s += `<path class="hl" d="M${a + 3} 24H${b - 3}"/><text class="yr" x="${(a + b) / 2}" y="16" text-anchor="middle">${y}</text>`;
    });
    const nx = X[P[n - 1].s] + cw / 2 + 20, end = 120 + n * 30 + nb * 60;
    L.forEach((li, k) => {
      const d = li.dataset.d, f = P.find(p => has(p, d)), y = yc[d];
      if (f) ln += `<path class="ln" data-d="${d}" style="stroke:${col(d)};--t:${T[f.s]}ms;--dur:${end - T[f.s]}ms" d="M${X[f.s]} ${y}H${nx}"/>`;
      li.querySelector('.pearl').style.cssText = `left:${nx - 17}px;--t:${700 + k * 60}ms`;
      W.filter(w => has(w, d)).forEach((w, j) => { const c = `cx="${nx + 40 + j * 22}" cy="${y}"`; dt += `<circle class="ring" data-w="${w.s}" data-d="${w.d.join(' ')}" ${c} r="7" style="stroke:${col(d)}"/>`; ht += `<circle class="hit" data-hw="${w.s}" ${c} r="11"/>`; });
    });
    P.forEach(p => {
      const x = X[p.s], dd = p.d.join(' '), ys = p.d.map(d => yc[d]), at = `data-s="${p.s}" data-d="${dd}"`, tt = `--t:${T[p.s]}ms`;
      if (ys.length > 1 && !rg) {
        const a = Math.min(...ys), b = Math.max(...ys);
        L.forEach(li => { const v = yc[li.dataset.d]; if (v > a && v < b) lk += `<path class="gap" d="M${x - 4} ${v}h8"/>`; });
        lk += `<path class="lk" ${at} style="--t:${T[p.s] + 200}ms" d="M${x} ${a + r}V${b - r}"/>`;
      }
      p.d.forEach(d => {
        const c = `cx="${x}" cy="${yc[d]}"`;
        ht += `<circle class="hit" data-h="${p.s}" ${c} r="12"/>`;
        dt += `<circle class="dot" ${at} ${c} r="${r}" style="fill:${col(d)};${tt}"/>` + (ys.length > 1 && rg ? `<circle class="tw" ${at} ${c} r="${r + 3.5}" style="${tt}"/>` : '');
      });
    });
    svg.innerHTML = `<rect class="zone" x="${nx}" y="${top + 2}" width="${Wd - nx}" height="${H - 4}"/><text x="${nx}" y="16" text-anchor="middle">now</text><text class="wl" x="${nx + 33}" y="16">in progress</text>${s}${ln}${lk}<path class="now" d="M${nx} ${top - 4}V${top + H}"/>${dt}${ht}`;
  };
  const say = h => { lv.classList.add('out'); clearTimeout(say.t); say.t = setTimeout(() => { lv.innerHTML = h; lv.classList.remove('out'); }, 100); };
  const dim = f => $('[data-d]', svg).forEach(e => e.classList.toggle('dim', f(e.dataset)));
  const reset = () => { $('.dim,.big', svg).forEach(e => e.classList.remove('dim', 'big')); $('.on,.row.hl').forEach(e => e.classList.remove('on', 'hl')); say(lv.dataset.def); };
  const lane = d => { reset(); dim(e => !e.d.split(' ').includes(d)); $(`[data-d="${d}"],[data-dir="${d}"]`).forEach(e => e.classList.add('on')); say(`<b>${nm(d)}.</b> ${D.dirs[d][1]}`); };
  const paper = s => {
    const p = P.find(x => x.s === s); if (!p) return;
    reset(); dim(e => e.s ? e.s !== s : !has(p, e.d));
    $(`.dot[data-s="${s}"]`, svg).forEach(e => e.classList.add('big')); $(`.row[data-s="${s}"]`).forEach(e => e.classList.add('hl'));
    say(`<b>${p.t}.</b> ${p.k}, ${p.y}. ${p.d[1] ? `In ${p.d.map(nm).join(' and ')}. ` : ''}${p.b}`);
  };
  svg.addEventListener('pointerover', ({ target: { dataset: t } }) => {
    if (t.h) paper(t.h);
    else if (t.hw) { const w = W.find(x => x.s === t.hw); reset(); dim(e => e.w !== w.s); say(`<b>${w.t}.</b> In progress, ${w.d.map(nm).join(' and ')}.`); }
  });
  svg.addEventListener('pointerout', reset);
  const bind = (el, on) => ['pointerenter', 'focusin', 'pointerleave', 'focusout'].forEach((e, k) => el.addEventListener(e, k > 1 ? reset : on));
  L.forEach(li => { bind(li.firstElementChild, () => lane(li.dataset.d)); bind(li.querySelector('.pearl'), () => lane(li.dataset.d)); });
  $('[data-dir]').forEach(a => bind(a, () => lane(a.dataset.dir)));
  $('.row[data-s]').forEach(r => bind(r, () => paper(r.dataset.s)));
  let sn; try { sn = sessionStorage.p3i; sessionStorage.p3i = 1; } catch (e) {}
  if (!sn || O.intro) { F.classList.add('intro'); setTimeout(() => F.classList.remove('intro'), 1600); }
  draw();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 80); });
})();
