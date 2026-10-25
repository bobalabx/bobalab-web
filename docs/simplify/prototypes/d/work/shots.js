const { chromium } = require('playwright');
const path = require('path');
const http=require('http'),fs=require('fs');const ROOT=path.resolve(__dirname,'..');const MT={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png'};
const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0].split('#')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MT[path.extname(f)]||'application/octet-stream'});r.end(d);});});
let base;
const out = process.argv[2] || 'work';
(async () => {
  await new Promise(r=>srv.listen(0,'127.0.0.1',r)); base='http://127.0.0.1:'+srv.address().port+'/';
  const b = await chromium.launch();
  const errs = [];
  const shot = async (page, file, w, h, scheme, fn, full) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, hasTouch: w < 500 });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(file + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(file + ': ' + m.text()); });
    await p.goto(base + page); await p.waitForTimeout(400);
    if (fn) await fn(p);
    await p.screenshot({ path: `${out}/${file}.png`, fullPage: !!full });
    await ctx.close();
  };
  for (const s of ['light', 'dark']) {
    await shot('index.html', `home-1440-${s}`, 1440, 900, s);
    await shot('index.html', `home-390-${s}`, 390, 844, s);
  }
  await shot('index.html', 'home-1440-full', 1440, 900, 'light', null, true);
  await shot('index.html', 'home-390-full', 390, 844, 'light', null, true);
  const openLoj = async p => { await p.click('[data-dir="learning-on-the-job"] .dir-b'); await p.mouse.move(5, 5); await p.waitForTimeout(500); };
  await shot('index.html', 'home-1440-open', 1440, 900, 'light', openLoj);
  await shot('index.html', 'home-1440-open-dark', 1440, 900, 'dark', openLoj);
  await shot('index.html', 'home-1440-hover-person', 1440, 900, 'light', async p => { const el = await p.$('.p:nth-child(9) button'); await el.hover(); await p.waitForTimeout(400); });
  await shot('index.html', 'home-390-open', 390, 844, 'light', async p => { await p.tap('[data-dir="algorithmic-advice"] .dir-b'); await p.waitForTimeout(500); });
  await shot('research.html', 'research-1440', 1440, 900, 'light', null, true);
  await shot('research.html', 'research-1440-explore', 1440, 900, 'light', async p => { await p.click('.ex-toggle'); await p.waitForTimeout(300); const d = await p.$('.dot.hit[data-s="blaettchen-2026-precise-or-broad"]'); if (d) { await d.hover({force:true}); } await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('explore').scrollIntoView()); }, false);
  await shot('research.html', 'research-1440-explore-dark', 1440, 900, 'dark', async p => { await p.click('.ex-toggle'); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('explore').scrollIntoView()); });
  await shot('index.html', 'home-1440-keyboard', 1440, 900, 'light', async p => { for (let i=0;i<8;i++) await p.keyboard.press('Tab'); await p.waitForTimeout(300); });
  await shot('index.html', 'home-1440-keyboard-person', 1440, 900, 'dark', async p => { await p.focus('.p button[tabindex="0"]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); });
  await shot('index.html', 'home-390-pile-tap', 390, 844, 'light', async p => { await p.evaluate(() => document.querySelector('.lab').scrollIntoView({block:'center'})); await p.tap('.p:nth-child(8) button'); await p.waitForTimeout(400); });
  await shot('research.html', 'research-1440-hover', 1440, 900, 'light', async p => { await p.click('.ex-toggle'); await p.evaluate(() => document.getElementById('fig1').scrollIntoView({block:'center'})); await p.waitForTimeout(200); const d = await p.$('.dot.hit[data-s="blaettchen-2026-precise-or-broad"]'); const bb = await d.boundingBox(); await p.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2); await p.waitForTimeout(400); });
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    for (const pg of ['index.html','research.html']) { await p.goto(base+pg); await p.waitForTimeout(300); console.log(pg, '390 scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth)); }
    await p.goto(base+'index.html'); for (const d of ['algorithmic-advice','ai-at-work','learning-on-the-job','platform-work']) { await p.click(`[data-dir="${d}"] .dir-b`); console.log(d, 'open sw', await p.evaluate(() => document.documentElement.scrollWidth)); }
    console.log('tap targets <44:', await p.evaluate(() => [...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height<24}).map(e=>e.textContent.trim().slice(0,30)+':'+Math.round(e.getBoundingClientRect().height)).slice(0,12)));
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.goto(base+'index.html'); await p.waitForTimeout(330); await p.screenshot({ path: `${out}/home-1440-settle-mid.png` }); await ctx.close(); }
  await shot('index.html', 'home-390-dark-full', 390, 844, 'dark', null, true);
  console.log(errs.join('\n') || 'no errors');
  await b.close(); srv.close();
})();
