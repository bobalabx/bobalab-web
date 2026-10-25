const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1730, height: 900 } });
await p.goto('http://127.0.0.1:3217/tools/compare.html'); await p.waitForTimeout(600);
await p.screenshot({ path: 'shots/compare-current-vs-A.png', fullPage: true }); await b.close(); })();
