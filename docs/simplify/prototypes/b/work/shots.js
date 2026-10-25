// node shots.js <prefix> [which]
const { chromium } = require('playwright');
const B='http://127.0.0.1:3472/';
const OUT='C:/Users/jiami/AppData/Local/Temp/claude/C--Users-jiami-OneDrive-Desktop-Claude/25396689-b301-43ec-ba70-d96c5414cf98/scratchpad/simplify/proto/b/'+(process.argv[2]||'work/')+'';
const jobs=[
 ['index.html','home-1440-light',1440,900,'light'],
 ['index.html','home-1440-dark',1440,900,'dark'],
 ['index.html','home-390-light',390,844,'light'],
 ['index.html','home-390-dark',390,844,'dark'],
 ['research.html','research-1440-light',1440,900,'light'],
];
(async()=>{const b=await chromium.launch();
for(const [f,n,w,h,c] of jobs){ if(process.argv[3]&&!n.includes(process.argv[3]))continue;
 const p=await b.newPage({viewport:{width:w,height:h},colorScheme:c});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(B+f);await p.waitForTimeout(1600);
 await p.screenshot({path:OUT+n+'.png'});
 await p.screenshot({path:OUT+n+'-full.png',fullPage:true});
 const sw=await p.evaluate(()=>document.documentElement.scrollWidth);
 if(sw>w)console.log(n,'HSCROLL',sw);
 if(f==='index.html'){ if(w>1000){ await p.hover('.q[data-d="learning-on-the-job"] .q-btn'); await p.waitForTimeout(700); await p.screenshot({path:OUT+n+'-hover.png'});}
   else { await p.click('.q[data-d="algorithmic-advice"] .q-btn'); await p.waitForTimeout(600); await p.screenshot({path:OUT+n+'-tap.png',fullPage:false, clip:{x:0,y:0,width:w,height:h}}); await p.evaluate(()=>document.querySelector('#qs-h').scrollIntoView()); await p.waitForTimeout(300); await p.screenshot({path:OUT+n+'-tap.png'});} }
 if(errs.length)console.log(n,'ERR',errs);
 await p.close();}
await b.close();})();
