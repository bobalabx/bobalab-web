const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
const r=await p.evaluate(()=>{const f=document.querySelector('figure');return f?f.outerHTML.slice(0,6000):'none'});
console.log(r);await b.close();})();
