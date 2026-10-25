const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
const r=await p.evaluate(()=>[...document.querySelectorAll('.f1-item')].map(li=>{let y=null;const dots=[];for(const e of li.querySelector('.f1-track').children){if(e.classList.contains('f1-y'))y=e.textContent; if(e.classList.contains('f1-dot'))dots.push([e.dataset.s,+y,e.dataset.ds])}
return {slug:li.dataset.slug,count:li.querySelector('.f1-name').textContent,shares:li.querySelector('.f1-shares')?.textContent,dots,rings:[...li.querySelectorAll('.f1-ring')].map(e=>[e.dataset.w,e.dataset.ds])}}));
console.log(JSON.stringify(r,null,1));
const pubs=await p.evaluate(()=>[...document.querySelectorAll('section')].map(s=>s.innerText.slice(0,200)));console.log(pubs);
await b.close();})();
