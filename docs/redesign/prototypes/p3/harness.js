// Prototype-only: variants and the growth harness (?links=rings, ?order=chain, ?n=2x|4x, ?intro). Never ships.
(() => {
  const F = document.getElementById('fig1'); if (!F) return;
  const q = new URLSearchParams(location.search), O = F.dataset;
  if (q.get('links') === 'rings') O.links = 1;
  if (q.get('order') === 'chain') O.order = 'chain';
  if (q.has('intro')) O.intro = 1;
  const m = parseInt(q.get('n'));
  if (m > 1) {
    const el = document.getElementById('lab-data'), D = JSON.parse(el.textContent); let x = [];
    for (let i = 0; i < m; i++) x = x.concat(D.papers.map(p => i ? [p[0] + '-s' + i, p[1], p[2], 'SYNTHETIC – ' + p[3], p[4], p[5]] : p));
    D.papers = x.sort((a, b) => a[1] - b[1]); el.textContent = JSON.stringify(D);
    F.querySelectorAll('.lane').forEach(li => { const d = li.dataset.d; li.querySelector('.cnt').textContent = `${x.filter(p => p[2].includes(d)).length} papers, ${D.wip.filter(w => w[1].includes(d)).length} in progress`; });
  }
})();
