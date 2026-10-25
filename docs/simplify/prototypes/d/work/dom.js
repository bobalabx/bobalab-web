const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
const r=await p.evaluate(()=>{const f=document.querySelector('figure');const els=[...f.querySelectorAll('*')].filter(e=>e.classList.contains("f1-ring")).map(e=>e.tagName+' '+[...e.attributes].map(a=>a.name+'='+a.value.slice(0,60)).join(' '));return {cls:f.className, n:f.querySelectorAll('*').length, els, json:[...document.querySelectorAll('script[type="application/json"]')].map(s=>s.id+':'+s.textContent.slice(0,300))}});
console.log(JSON.stringify(r,null,1));await b.close();})();
