const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:3217/index.html#nosettle'); await p.waitForTimeout(500);
  await p.mouse.move(1265, 600); await p.waitForTimeout(300);
  await p.mouse.down(); await p.mouse.up();
  for (const t of [120, 260]) { await p.waitForTimeout(t === 120 ? 120 : 140); await p.screenshot({ path: `tools/morph-${t}.png` }).catch(e => console.log('shot fail', e.message)); }
  await p.waitForTimeout(900);
  await p.screenshot({ path: 'tools/morph-end.png' });
  console.log(p.url(), errs);
  await b.close();
})();
