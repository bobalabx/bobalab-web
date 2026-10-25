const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  console.log('version', b.version());
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.on('console', m => console.log('console', m.text())); p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:3217/research.html');
  console.log(await p.evaluate(() => [typeof CSSViewTransitionRule, [...document.styleSheets[0].cssRules].filter(r => r.constructor.name.includes('View')).map(r => r.cssText), matchMedia('(prefers-reduced-motion: reduce)').matches]));
  await p.addInitScript(() => { addEventListener('pagereveal', e => { console.log('reveal', !!e.viewTransition, [...document.querySelectorAll('*')].filter(x=>getComputedStyle(x).viewTransitionName!=='none').map(x=>x.className+':'+getComputedStyle(x).viewTransitionName).join(',')); }); addEventListener('pageswap', e => console.log('swap', !!e.viewTransition)); });
  await p.goto('http://127.0.0.1:3217/index.html#nosettle'); await p.waitForTimeout(400);
  if (process.argv[2]==='noname') await p.addStyleTag({content: '.disc{view-transition-name:none !important}'});
  if (process.argv[2]==='div') await p.evaluate(()=>{const d=document.querySelector('.p--b3'); d.addEventListener('click',()=>{d.style.viewTransitionName='pearl'},true);});
  await p.click('.p--b3 .pearl');
  await p.waitForTimeout(1500);
  await b.close();
})();
