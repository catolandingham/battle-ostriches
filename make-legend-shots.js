// Every theme: vulture + ostrich boards with marks, map key sheet, walkthrough step, mark-tap label. -> shots/legend/
const { webkit, devices } = require('playwright-core'); const fs = require('fs');
const OUT = 'shots/legend/'; fs.mkdirSync(OUT, { recursive: true });
process.env.PORT = 3990; const server = require('./server.js');
const T = ['classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'];
(async () => { const b = await webkit.launch(), errs = [];
  for (const t of T) { const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage(); P.on('pageerror', e => errs.push(e.message));
    await P.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue', '1'); localStorage.setItem('bo_walk_red', '1'); localStorage.setItem('bo_tips_off', '1'); ['blue','red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    await P.goto('http://localhost:3990/?theme=' + t); await P.click('#playFriend'); await P.click('#playPass'); await P.click('#hGo');
    const cell = (x, y) => P.locator('.cell').nth(y * 9 + x);
    const V = async () => { await P.waitForSelector('#handoff.red'); await P.click('#hGo'); await P.waitForSelector('#actions.mine'); };
    const O = async () => { await P.waitForSelector('#handoff.blue'); await P.click('#hGo'); await P.waitForSelector('#actions.mine'); };
    for (const [x, y] of [[3, 4], [8, 6], [0, 6], [5, 3]]) { await cell(x, y).click(); await P.waitForTimeout(60); }
    await V(); await P.click('#actions button:has-text("Throw")'); await cell(3, 4).click();           // hit
    await O(); await cell(5, 4).click();
    await V(); await cell(6, 5).click();                                                                 // scent yes
    await O(); await cell(5, 5).click();
    await V(); await cell(4, 3).click();                                                                 // scent no
    await O(); await cell(6, 5).click();
    await V(); await P.click('#actions button:has-text("Throw")'); await cell(4, 3).click();           // miss
    await O(); await P.waitForTimeout(200); await P.screenshot({ path: `${OUT}${t}-ostrich.jpg`, type: 'jpeg', quality: 80 });
    await cell(7, 6).click();
    await V(); await P.waitForTimeout(200); await P.screenshot({ path: `${OUT}${t}-vulture.jpg`, type: 'jpeg', quality: 80 });
    if (!(await cell(6, 5).evaluate(e => e.classList.contains('legal')))) await cell(6, 5).click({ force: true }).catch(()=>{}); // label only; never make a move here
    await P.click('#keyBtn'); await P.waitForTimeout(150); await P.screenshot({ path: `${OUT}${t}-key.jpg`, type: 'jpeg', quality: 80 });
    await P.click('#legendClose'); await P.evaluate(() => UI.walk()); await P.click('#wNext');
    await P.screenshot({ path: `${OUT}${t}-walkthrough.jpg`, type: 'jpeg', quality: 80 });
    await c.close(); console.log('ok', t); }
  console.log('errors', errs); await b.close(); server.close(); process.exit(errs.length ? 1 : 0); })().catch(e => { console.error(e); process.exit(1); });
