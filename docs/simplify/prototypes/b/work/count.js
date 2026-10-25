const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const [u,w,h] of [['http://localhost:3100/',1440,900],['http://127.0.0.1:3472/',1440,900],['http://localhost:3100/',390,844],['http://127.0.0.1:3472/',390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}});await p.goto(u,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{let words=0;const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const el=n.parentElement;if(!el||el.closest('[aria-hidden=true]')&&!el.closest('svg'))continue;const cs=getComputedStyle(el);if(cs.visibility!=='visible'||cs.opacity==='0'||el.closest('.vh,.sr-only'))continue;const rg=document.createRange();rg.selectNodeContents(n);const rc=rg.getBoundingClientRect();if(rc.width===0||rc.bottom<0||rc.top>innerHeight)continue;if(el.closest('[data-nextjs-toast],nextjs-portal'))continue;words+=n.textContent.trim().split(/\s+/).filter(Boolean).length}
const marks=[...document.querySelectorAll('.f1-dot,.f1-ring,.f1-pearl,.f1-seg,.pearl,.strip i')].filter(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.top<innerHeight&&r.bottom>0&&cs.visibility==='visible'}).length;
return {words,marks}});
console.log(u,w,JSON.stringify(r));await p.close();}
await b.close();})();
