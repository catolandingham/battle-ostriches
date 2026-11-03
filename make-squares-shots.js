// Pass & play, every theme: screenshot ostrich move step and vulture fly/throw step. Usage: node make-squares-shots.js <outdir>
const { webkit, devices } = require('playwright-core'); const fs = require('fs');
const OUT = process.argv[2] || 'shots/squares/'; fs.mkdirSync(OUT, { recursive: true });
process.env.PORT = 3995; const server = require('./server.js');
const T = ['classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'];
(async () => { const b = await webkit.launch();
  for (const t of T) { const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
    await P.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue','red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    await P.goto('http://localhost:3995/?theme=' + t); await P.click('#playFriend'); await P.click('#playPass'); await P.click('#hGo');
    await P.waitForTimeout(300); await P.screenshot({ path: `${OUT}${t}-setup-eggs.jpg`, type: 'jpeg', quality: 80 });
    const tiles = await P.evaluate(() => [...document.querySelectorAll('#board .cell')].filter(c => { const r = c.getBoundingClientRect(); return r.width > 20 && getComputedStyle(c).visibility !== 'hidden'; }).length); if (tiles !== 63) throw new Error(t + ' tiles ' + tiles);
    const cell = (x, y) => P.locator('.cell').nth(y * 9 + x);
    for (const [x, y] of [[3, 4], [8, 6], [0, 6], [6, 5]]) { await cell(x, y).click(); await P.waitForTimeout(60); }
    await P.waitForSelector('#handoff.red'); await P.click('#hGo'); await P.waitForSelector('#actions.mine'); await P.waitForTimeout(300);
    await P.screenshot({ path: `${OUT}${t}-vulture-fly.jpg`, type: 'jpeg', quality: 80 });
    await P.click('#actions button:has-text("Throw")'); await P.waitForTimeout(300);
    await P.screenshot({ path: `${OUT}${t}-vulture-throw.jpg`, type: 'jpeg', quality: 80 });
    await P.click('#actions button:has-text("Fly")'); await cell(5, 4).click();
    await P.waitForSelector('#handoff.blue'); await P.click('#hGo'); await P.waitForSelector('#actions.mine'); await P.waitForTimeout(300);
    await P.screenshot({ path: `${OUT}${t}-ostrich-move.jpg`, type: 'jpeg', quality: 80 });
    await c.close(); }
  await b.close(); server.close(); console.log('done'); process.exit(0); })();
