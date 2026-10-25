const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1880,height:900}});
await p.goto('http://127.0.0.1:3472/work/compare.html');await p.waitForTimeout(800);
await p.screenshot({path:'C:/Users/jiami/AppData/Local/Temp/claude/C--Users-jiami-OneDrive-Desktop-Claude/25396689-b301-43ec-ba70-d96c5414cf98/scratchpad/simplify/proto/b/shots/compare-current-vs-b.png',fullPage:true});await b.close();})();
