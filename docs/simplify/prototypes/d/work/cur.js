const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const [w,h,n] of [[1440,900,'cur-1440'],[390,844,'cur-390']]){const p=await b.newPage({viewport:{width:w,height:h}});await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});await p.waitForTimeout(1500);await p.screenshot({path:'work/'+n+'.png'});await p.screenshot({path:'work/'+n+'-full.png',fullPage:true});await p.close();}
await b.close();})();
