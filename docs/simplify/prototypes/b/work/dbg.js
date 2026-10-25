const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:3472/'+(process.argv[2]||'index.html'));await p.waitForTimeout(1500);
console.log(await p.evaluate(process.argv[3]));await b.close();})();
