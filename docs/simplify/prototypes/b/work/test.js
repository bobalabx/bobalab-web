const { chromium } = require('playwright');
const U='http://127.0.0.1:3472/';
(async()=>{const b=await chromium.launch();const out=[];const ok=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
// keyboard desktop
let p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto(U);await p.waitForTimeout(1300);
for(let i=0;i<20;i++){await p.keyboard.press('Tab');const t=await p.evaluate(()=>document.activeElement.className);if(t.includes('q-btn'))break;}
ok('tab reaches first question', await p.evaluate(()=>document.activeElement.closest('.q')?.dataset.d==='algorithmic-advice'));
ok('focus reveals more (visible)', await p.evaluate(()=>getComputedStyle(document.querySelector('#q1')).visibility==='visible'));
await p.keyboard.press('Enter');
ok('enter sets aria-expanded', await p.evaluate(()=>document.querySelector('.q-btn').getAttribute('aria-expanded')==='true'));
await p.keyboard.press('Tab');
ok('tab moves into revealed link', await p.evaluate(()=>document.activeElement.classList.contains('q-go')));
await p.keyboard.press('Escape');
ok('escape closes + returns focus', await p.evaluate(()=>document.querySelector('.q-btn').getAttribute('aria-expanded')==='false'&&document.activeElement.classList.contains('q-btn')));
// step-through
await p.click('#kit-btn');ok('step 1', await p.evaluate(()=>document.querySelector('#kit').dataset.at==='1'&&document.querySelector('#kit-note').textContent.startsWith('1 of 3')));
await p.click('#kit-btn');await p.click('#kit-btn');ok('step 3 label', (await p.textContent('#kit-btn'))==='Start over');
await p.click('#kit-btn');ok('back to rest', await p.evaluate(()=>document.querySelector('#kit').dataset.at==='0'));
// all images have alt, all links have names
ok('imgs alt', await p.evaluate(()=>[...document.images].every(i=>i.alt&&i.complete&&i.naturalWidth>0)));
ok('no hscroll 1440', await p.evaluate(()=>document.documentElement.scrollWidth<=1440));
await p.close();
// touch phone
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});p=await ctx.newPage();
await p.goto(U);await p.waitForTimeout(1300);
ok('mobile more hidden at rest', await p.evaluate(()=>getComputedStyle(document.querySelector('#q2')).display==='none'));
await p.tap('.q[data-d="ai-at-work"] .q-btn');await p.waitForTimeout(400);
ok('tap reveals', await p.evaluate(()=>getComputedStyle(document.querySelector('#q2')).display==='block'));
await p.tap('.q[data-d="platform-work"] .q-btn');await p.waitForTimeout(400);
ok('tap other closes first', await p.evaluate(()=>getComputedStyle(document.querySelector('#q2')).display==='none'&&getComputedStyle(document.querySelector('#q4')).display==='block'));
ok('no hscroll 390', await p.evaluate(()=>document.documentElement.scrollWidth<=390));
const small=await p.evaluate(()=>[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.height<24)}).map(e=>e.textContent.trim().slice(0,30)+':'+Math.round(e.getBoundingClientRect().height)));
out.push('targets <24px tall: '+JSON.stringify(small));
await ctx.close();
// research page
p=await b.newPage({viewport:{width:1440,height:900}});await p.goto(U+'research.html');await p.waitForTimeout(800);
await p.hover('.tl-hit[data-h="bastani-2026-rl-tips"]');ok('timeline hover names paper', (await p.textContent('#tl-live')).includes('Reinforcement'));
await p.focus('.tl-hit[data-hw="deng-2026-act-ask-defer"]');ok('timeline focus ring item', (await p.textContent('#tl-live')).includes('Act, Ask'));
await p.close();
// reduced motion
const c2=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});p=await c2.newPage();await p.goto(U);await p.waitForTimeout(300);
ok('reduced motion: no animation on pearls', await p.evaluate(()=>getComputedStyle(document.querySelector('.settle')).animationName==='none'));
console.log(out.join('\n'));await b.close();})();
