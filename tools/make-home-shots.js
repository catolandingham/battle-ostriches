// WebKit iPhone 13: home + role picker screenshots for every theme; asserts no scrolling.
const { webkit, devices } = require('playwright-core'); const fs = require('fs');
process.env.PORT = 3997; const server = require('../server.js'); const U = 'http://localhost:3997/', OUT = 'shots/home/'; fs.mkdirSync(OUT, { recursive: true });
const THEMES = ['classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'];
(async () => { const b = await webkit.launch(); let bad = [];
  for (const th of THEMES) { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
    await p.goto(U + '?theme=' + th); await p.waitForTimeout(300);
    const ov = () => p.evaluate(() => { const l = document.getElementById('lobby'); return l.scrollHeight - l.clientHeight; });
    if (await ov() > 0) bad.push(th + ' home');
    await p.screenshot({ path: OUT + th + '-home.jpg', type: 'jpeg', quality: 85 });
    await p.click('#haveCode'); await p.screenshot({ path: OUT + th + '-code.jpg', type: 'jpeg', quality: 85 }); if (await ov() > 0) bad.push(th + ' code');
    await p.click('#haveCode'); await p.click('#playAI'); if (await ov() > 0) bad.push(th + ' role');
    await p.screenshot({ path: OUT + th + '-role-ai.jpg', type: 'jpeg', quality: 85 });
    await p.click('#roleBack'); await p.click('#playFriend'); await p.click('#twoPhones'); await p.screenshot({ path: OUT + th + '-role-friend.jpg', type: 'jpeg', quality: 85 });
    await c.close(); }
  console.log(bad.length ? 'OVERFLOW ' + bad : 'no scroll in any theme'); await b.close(); process.exit(bad.length ? 1 : 0); })();
