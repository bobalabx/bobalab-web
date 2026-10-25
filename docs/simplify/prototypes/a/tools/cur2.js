const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:1440,height:900} });
  for (const u of ['research/','research/algorithmic-advice/','publications/bastani-2026-rl-tips/']) {
    await p.goto('http://localhost:3100/'+u, {waitUntil:'networkidle'});
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `tools/cur-${u.replace(/\W+/g,'_')}.png`, fullPage:true });
  }
  await b.close();
})();
