// usage: node shot.js <page> <w> <h> <scheme> <out> [full] [action]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [page, w, h, scheme, out, full, action] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, deviceScaleFactor: 1, hasTouch: +w < 600, isMobile: +w < 600 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const base = process.env.BASE || (require('url').pathToFileURL(path.resolve(__dirname, '..')).href + '/');
  await p.goto(base + page + (page.includes('#') ? '' : '#nosettle'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  if (action) {
    for (const a of action.split(';')) {
      const [k, sel] = a.split('=');
      if (k === 'hover') await p.hover(sel);
      if (k === 'mouse') { const [x, y] = sel.split(',').map(Number); await p.mouse.move(x, y, { steps: 4 }); }
      if (k === 'jsfocus') await p.focus(sel);
      if (k === 'tap') await p.tap(sel);
      if (k === 'click') await p.click(sel);
      if (k === 'focus') { await p.keyboard.press('Tab'); }
      if (k === 'tab') { for (let i = 0; i < +sel; i++) await p.keyboard.press('Tab'); }
      if (k === 'scroll') await p.evaluate(y => scrollTo(0, +y), sel);
      await p.waitForTimeout(700);
    }
  }
  await p.screenshot({ path: out, fullPage: full === 'full' });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(out, 'scrollWidth', sw, errs.length ? 'ERR ' + errs.join(' | ') : '');
  await b.close();
})();
