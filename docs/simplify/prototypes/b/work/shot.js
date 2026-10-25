// usage: node shot.js url out.png width height [dark] [full]
const { chromium } = require('playwright');
(async()=>{
 const [url,out,w,h,scheme,full]=process.argv.slice(2);
 const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:+w,height:+h},colorScheme:scheme||'light',deviceScaleFactor:1});
 const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url,{waitUntil:'networkidle'});await p.waitForTimeout(1800);
 await p.screenshot({path:out,fullPage:full==='full'});
 if(errs.length)console.log('ERRORS',errs.join('\n'));
 await b.close();})();
