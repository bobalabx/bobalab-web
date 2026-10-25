const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:1440,height:900} });
  await p.goto('http://localhost:3100/', {waitUntil:'networkidle'});
  const r = await p.evaluate(()=>{
    const fig=document.querySelector('figure');
    const scripts=[...document.querySelectorAll('script')].map(s=>s.textContent).filter(t=>t.includes('lanes')&&t.length<200000).map(t=>t.slice(0,300));
    const attrs=[...fig.querySelectorAll("li.f1-item")].map(li=>li.dataset.slug+": "+[...li.querySelectorAll("[class*=ring],[class*=wip],[data-w]")].map(e=>e.className+" "+(e.dataset.s||e.dataset.w||e.getAttribute("title")||e.getAttribute("aria-label")||e.textContent)).join(" | "));
    return {html:fig.outerHTML.length, attrs, scripts:scripts.length};
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
