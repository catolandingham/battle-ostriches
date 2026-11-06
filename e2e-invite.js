// WebKit iPhone: invite panel hidden in-game for every theme (incl. opponent offline + refresh), chip popover, and vs-computer games.
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
process.env.PORT = 3998; const server = require('./server.js'); const U = 'http://localhost:3998/', OUT = 'shots/invite/'; fs.mkdirSync(OUT, { recursive: true });
const THEMES = ['classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'];
const vis = p => p.evaluate(() => { const w = document.getElementById('wait'), r = w.getBoundingClientRect(); return getComputedStyle(w).display !== 'none' && r.height > 0 ? r.height : 0; });
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return [p, c]; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  for (const th of (process.env.THEMES ? process.env.THEMES.split(',') : THEMES)) {
    const [A, cA] = await mk(), [V, cV] = await mk();
    await A.goto(U + '?theme=' + th); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
    assert.ok(await A.locator('#lobbyCode').isVisible(), th + ': code shown while waiting'); assert.ok(await A.locator('#inviteBtn').isHidden());
    const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3998');
    await V.goto(link + '&theme=' + th); await V.waitForSelector('#roomLobby');
    await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
    for (const [x, y] of [[3, 4], [6, 2], [2, 5], [7, 2]]) { await cell(A, x, y).click(); await A.waitForTimeout(60); }
    await V.waitForSelector('#actions.mine');
    await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
    assert.equal(await vis(A), 0, th + ': hidden after join'); assert.equal(await vis(V), 0);
    await cell(V, 4, 2).click(); await A.waitForSelector('#actions.mine');
    await cV.close(); await A.waitForTimeout(400); // opponent phone goes away mid-game (the original bug)
    assert.equal(await vis(A), 0, th + ': hidden while opponent offline'); assert.ok(/offline/i.test(await A.textContent('#log')));
    await A.reload(); await A.waitForSelector('#board .cell'); await A.waitForTimeout(300);
    assert.equal(await vis(A), 0, th + ': hidden after refresh');
    const [V2, cV2] = await mk(); await V2.goto(link + '&theme=' + th); await V2.waitForFunction(() => /two players/.test(document.getElementById('lobbyErr').textContent)); // seat stays reserved for the offline opponent
    await A.screenshot({ path: OUT + th + '-ingame.png' });
    await A.click('#inviteBtn'); await A.waitForTimeout(150); const h = await vis(A);
    assert.ok(h > 50 && h < 300, th + ': popover ' + h); assert.ok(/^[A-Z]{4}$/.test(await A.textContent('#shareCode')), 'popover shows the code'); assert.equal((await A.textContent('#inviteBtn')).trim(), '🔗', 'no room code in the in-game header');
    await A.screenshot({ path: OUT + th + '-popover.png' });
    await A.touchscreen.tap(200, 600); await A.waitForTimeout(150); assert.equal(await vis(A), 0, th + ': closes on outside tap');
    console.log('ok', th); await cA.close(); await cV2.close();
  }
  // vs computer, both roles, full games
  for (const role of ['blue', 'red']) {
    const [P, c] = await mk(); await P.goto(U + '?theme=volcano'); await P.click('#playSolo'); await P.click('[data-bots="1"]'); await P.click('#soloGo'); await P.click(role === 'blue' ? '[data-role="blue"]' : '[data-role="red"]'); await P.click('#startGame');
    await P.waitForSelector('#board .cell'); assert.equal(await vis(P), 0, 'no share panel vs AI'); assert.ok(await P.locator('#inviteBtn').isHidden());
    if (role === 'blue') for (const [x, y] of [[2, 2], [6, 2], [2, 5], [2, 2]]) { await cell(P, x, y).click(); await P.waitForTimeout(80); }
    let n = 0, t0 = Date.now(), shot = false;
    while (!(await P.locator('#over:not(.hidden)').count()) && n < 200) {
      await P.waitForSelector('#actions.mine, #over:not(.hidden)', { timeout: 10000 }); if (await P.locator('#over:not(.hidden)').count()) break;
      if (!shot && n === 3) { await P.screenshot({ path: OUT + 'vsai-' + role + '.png' }); shot = true; }
      if (role === 'blue') { const s = await P.locator('#actions button:has-text("Sit")'); if (await s.count() && await s.isEnabled() && n % 3) await s.click(); else await P.locator('.cell.legal').first().click(); }
      else { const tb = P.locator('#actions button:has-text("Throw")'); if (n % 4 === 3 && await tb.isEnabled()) { await tb.click(); if (await P.locator('.cell.legal').count()) await P.locator('.cell.legal').first().click(); else { await P.click('#actions button:has-text("Fly")'); await P.locator('.cell.legal').first().click(); } } else await P.locator('.cell.legal').nth(n % 5).click(); }
      await P.waitForFunction(() => !document.querySelector('#actions.mine') || document.querySelector('#over:not(.hidden)'), null, { timeout: 5000 }); n++; }
    const per = (Date.now() - t0) / n; console.log('vs AI', role, 'turns', n, 'ms/turn', per | 0, await P.textContent('#over h1'));
    assert.ok(await P.locator('#over:not(.hidden)').count(), 'game finished'); assert.ok(per > 800, 'AI delay');
    await P.screenshot({ path: OUT + 'vsai-' + role + '-over.png' }); await c.close();
  }
  console.log('errors', errs); assert.equal(errs.length, 0); await b.close(); server.close(); console.log('PASS e2e-invite'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
