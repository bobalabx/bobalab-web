const { chromium, devices } = require('playwright');
const B = 'http://127.0.0.1:3217/';
(async () => {
  const b = await chromium.launch();
  const out = {};
  // touch: first tap reveals, second tap navigates
  let c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  let p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'index.html#nosettle'); await p.waitForTimeout(300);
  await p.tap('.p--b2 .pearl'); await p.waitForTimeout(400);
  out.touch1 = { url: p.url(), on: await p.$eval('.p--b2', e => e.classList.contains('is-on')), q: await p.$eval('.reading__q', e => e.textContent.slice(0, 40)) };
  await p.tap('.p--b2 .pearl'); await p.waitForTimeout(800);
  out.touch2 = p.url();
  await p.goto(B + 'index.html#nosettle'); await p.waitForTimeout(300);
  await p.tap('.p--b1 .pearl'); await p.waitForTimeout(200); await p.tap('h1'); await p.waitForTimeout(300);
  out.tapOutsideCloses = !(await p.$eval('.p--b1', e => e.classList.contains('is-on')));
  // keyboard
  c = await b.newContext({ viewport: { width: 1440, height: 900 } }); p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'index.html#nosettle'); await p.waitForTimeout(300);
  const seq = [];
  for (let i = 0; i < 9; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; return (a.closest('.p')?.dataset.d || a.textContent.trim().slice(0, 18)) + (document.querySelector('.p.is-on') ? '*' : ''); })); }
  out.tabOrder = seq;
  await p.keyboard.press('Escape'); out.escCloses = !(await p.$('.p.is-on'));
  await p.keyboard.press('Enter'); await p.waitForTimeout(800); out.enterUrl = p.url();
  // reduced motion: no settle class, no errors
  c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'index.html'); await p.waitForTimeout(100);
  out.reducedSettle = await p.$eval('#pile', e => e.classList.contains('is-settling'));
  c = await b.newContext({ viewport: { width: 1440, height: 900 } }); p = await c.newPage();
  await p.goto(B + 'index.html'); await p.waitForTimeout(150);
  out.firstVisitSettle = await p.$eval('#pile', e => e.classList.contains('is-settling'));
  await p.screenshot({ path: 'tools/settle-150.png' });
  // no-JS
  c = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); p = await c.newPage();
  await p.goto(B + 'index.html'); await p.waitForTimeout(200);
  out.noJsLinks = await p.$$eval('.pearl', as => as.map(a => a.getAttribute('href')));
  await p.screenshot({ path: 'tools/nojs.png' });
  // timeline button
  c = await b.newContext({ viewport: { width: 1440, height: 900 } }); p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'research.html'); await p.click('.explore__btn'); await p.waitForTimeout(200);
  out.timeline = { expanded: await p.$eval('.explore__btn', e => e.getAttribute('aria-expanded')), dots: await p.$$eval('.tl__svg circle[data-s]', x => x.length) };
  const hit = await p.$('.tl__svg .hit[data-h="7"]'); await hit.hover(); await p.waitForTimeout(300);
  out.timelineHover = await p.$eval('.tl__live', e => e.textContent);
  await p.screenshot({ path: 'tools/tl-hover.png' });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
