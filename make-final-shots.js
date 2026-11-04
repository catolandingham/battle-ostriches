// Pass & play scripted game on WebKit iPhone 13 -> vulture/ostrich/states shots. Usage: node make-final-shots.js [baseURL] [outDir] [themes,comma]
const { webkit, devices } = require('playwright-core'); const fs = require('fs');
const BASE = process.argv[2] || null, OUT = process.argv[3] || 'shots/final/', THEMES = (process.argv[4] || 'classic').split(',');
let server; if (!BASE) { process.env.PORT = 3995; server = require('./server.js'); }
const URL = BASE || 'http://localhost:3995/';
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await webkit.launch(), errs = [];
  for (const th of THEMES) {
    const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
    await P.addInitScript(t => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_theme', t); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue','red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }, th);
    P.on('pageerror', e => errs.push(th + ': ' + e.message)); P.on('console', m => m.type() === 'error' && errs.push(th + ': ' + m.text()));
    const cell = (x, y) => P.locator('.cell').nth(y * 9 + x);
    const go = async role => { await P.waitForSelector('#handoff.' + role); await P.click('#hGo'); await P.waitForSelector('#actions.mine'); await P.waitForTimeout(1500); };
    const tap = async (x, y) => { await cell(x, y).click(); await P.waitForTimeout(250); };
    const V = async (a, x, y) => { await go('red'); if (a === 'throw') await P.click('#actions button:has-text("Throw")'); await tap(x, y); };
    const O = async (x, y) => { await go('blue'); await tap(x, y); };
    await P.goto(URL); await P.click('#playFriend'); await P.click('#playPass'); await P.waitForSelector('#handoff.blue'); await P.click('#hGo');
    for (const [x, y] of [[3, 4], [6, 4], [2, 1], [7, 1]]) await tap(x, y);
    await V('throw', 4, 2); await O(7, 2);   // miss -> stone mark
    await V('fly', 4, 1); await O(7, 3);
    await V('fly', 4, 0); await O(6, 3);     // refill
    await V('fly', 2, 1); await O(5, 3);     // lands on egg -> found
    await V('throw', 2, 1); await O(5, 4);   // smash -> red X
    await V('fly', 4, 0); await O(5, 5);     // refill
    await V('fly', 4, 2); await O(6, 5);
    await go('red'); await tap(4, 3);         // fly next to egg (3,4) -> sniff yes
    await P.waitForTimeout(250); await P.screenshot({ path: OUT + th + '-sniffwave.jpg', type: 'jpeg', quality: 85 });
    await go('blue'); await P.screenshot({ path: OUT + (th === 'classic' ? 'ostrich-view.jpg' : th + '-ostrich.jpg'), type: 'jpeg', quality: 88 });
    await tap(7, 5); // ostrich moves away
    await go('red'); await P.waitForTimeout(300); // last sniff still lit: green squares + yellow fly glow
    await P.screenshot({ path: OUT + (th === 'classic' ? 'vulture-view.jpg' : th + '-vulture.jpg'), type: 'jpeg', quality: 88 });
    await P.click('#actions button:has-text("Throw")'); await P.waitForTimeout(300);
    await P.screenshot({ path: OUT + th + '-throw.jpg', type: 'jpeg', quality: 88 });
    const st = await P.evaluate(() => ({ legal: document.querySelectorAll('.cell.legal:not(.target)').length, target: document.querySelectorAll('.cell.legal.target').length, maybe: document.querySelectorAll('.cell.maybe').length, stone: document.querySelectorAll('.ic-stone').length, hit: document.querySelectorAll('.ic-hit').length }));
    console.log(th, JSON.stringify(st));
    await c.close();
  }
  console.log('errors', errs); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(async e => { console.error(e.message.slice(0,200)); process.exit(1); });
