const { chromium } = require('playwright');
// node crop.js page width scheme selector out
(async()=>{const [pg,w,sch,sel,out]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:900},colorScheme:sch});
await p.goto('http://127.0.0.1:3472/'+pg);await p.waitForTimeout(1500);const el=await p.$(sel);await el.scrollIntoViewIfNeeded();await el.screenshot({path:out});await b.close();})();
