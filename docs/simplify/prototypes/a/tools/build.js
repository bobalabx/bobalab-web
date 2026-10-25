// Builds index.html and research.html from src/*.src.html by expanding
// {{WORDMARK}}, {{DEFS}}, {{PEARL:id}} and {{HEAD:Title}} / {{FOOT}} partials.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const P = fs.readFileSync(path.join(__dirname, 'wm-paths.txt'), 'utf8').trim().split(/\r?\n/);
// geometry order in wordmark-geometry.ts: boba[0]=B, boba[1]=second B, boba[2]=A ; lab = L, A, B
const WORDMARK = `<svg class="wordmark" viewBox="0 0 546.55 109.5" role="img" aria-label="BOBALAB" focusable="false"><g fill="currentColor"><path d="${P[0]}"/><circle class="wm-pearl" cx="127.29" cy="55.5" r="51.5"/><path d="${P[1]}"/><path d="${P[2]}"/><path d="${P[3]}"/><path d="${P[4]}"/><path d="${P[5]}"/></g></svg>`;

const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<radialGradient id="rim" gradientUnits="userSpaceOnUse" cx="-14" cy="-18" r="122"><stop offset=".74" stop-color="#fff" stop-opacity="0"/><stop offset=".97" stop-color="#fff" stop-opacity=".13"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.7 -0.62" result="a"/><feComposite in="a" in2="SourceGraphic" operator="in"/></filter>
</defs></svg>`;

const pearl = (id) => `<span class="pdisc"><svg class="disc" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false"><defs><radialGradient id="pf-${id}" gradientUnits="userSpaceOnUse" cx="-34" cy="-40" fx="-34" fy="-40" r="168"><stop offset=".05" style="stop-color:var(--pc)"/><stop offset=".85" style="stop-color:var(--pe)"/></radialGradient></defs><circle class="ring" r="112"/><circle class="body" r="100" fill="url(#pf-${id})"/><circle r="100" fill="url(#rim)"/><circle r="100" fill="#fff" filter="url(#grain)" opacity=".08"/></svg></span>`;

const NAV = (cur) => {
  const items = [['Research', 'research.html'], ['Publications', '#'], ['People', '#'], ['News', '#'], ['Join', '#']];
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-head"><div class="wrap">
  <a class="brand" href="index.html">${WORDMARK}</a>
  <nav class="nav" aria-label="Main"><ul>${items.map(([t, h]) => `<li><a href="${h}"${t === cur ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav>
</div></header>`;
};

const FOOT = `<footer class="site-foot"><div class="wrap">
  <div class="grid">
    <div><a class="brand" href="index.html" style="color:var(--ink)">${WORDMARK.replace('class="wordmark"', 'class="wordmark" style="height:20px"')}</a><p style="margin-top:8px">Berkeley Operations and Behavioral Analytics Lab</p></div>
    <div><h2>Visit</h2><p>Haas School of Business<br>University of California, Berkeley<br>2220 Piedmont Avenue, Berkeley, CA 94720</p><p><a href="mailto:bobalab@berkeley.edu" style="color:var(--ink)">bobalab@berkeley.edu</a></p></div>
    <div><h2>Site</h2><ul><li><a href="#">About &amp; contact</a></li><li><a href="#">Accessibility</a></li><li><a href="#">Privacy</a></li><li><a href="#">RSS feed</a></li></ul></div>
    <div><h2>Lab members</h2><ul><li><a href="#">Lab scheduler</a></li><li><a href="#">Reduce motion</a> <span class="meta">off</span></li></ul></div>
  </div>
  <div class="colophon"><span>Our four pearls are tinted <span class="flav" data-d="algorithmic-advice"><i></i>butterfly pea</span>, <span class="flav" data-d="ai-at-work"><i></i>lychee</span>, <span class="flav" data-d="learning-on-the-job"><i></i>matcha</span> and <span class="flav" data-d="platform-work"><i></i>oolong</span>.</span><span>Last updated October 24, 2026</span></div>
</div></footer>`;

for (const name of ['index', 'research']) {
  const src = path.join(root, 'src', name + '.src.html'); if (!fs.existsSync(src)) continue;
  let s = fs.readFileSync(src, 'utf8');
  s = s.replace(/\{\{NAV:([^}]*)\}\}/g, (_, c) => NAV(c))
    .replace('{{DEFS}}', DEFS)
    .replace('{{FOOT}}', FOOT)
    .replace(/\{\{PEARL:([^}]+)\}\}/g, (_, id) => pearl(id));
  fs.writeFileSync(path.join(root, name + '.html'), s);
}
console.log('built');
