// 3 players: three WebKit iPhone 13s (ostrich host, vulture + hunter join by link), then a hunter vs 2 computer birds.
// Covers lobby, hunter pick, turn order, sense, pounce catch + knockback, shot clock timeout, visibility. JPEGs -> shots/three/.
process.env.PORT = 3997; process.env.BO_H3START = '8,3';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'); const U = 'http://localhost:3997/', OUT = 'shots/three/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 });
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const A = await mk(), V = await mk(), H = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)'); await shot(A, '1-lobby');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3997');
  await V.goto(link); await H.goto(link);
  await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
  await A.click('[data-role="blue"]'); await V.click('[data-role="red"]');
  await H.click('[data-role="hyena"]'); await H.waitForFunction(() => /YOU ARE Hyena/.test(document.body.innerText)); await shot(H, '2-hunter-pick');
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell'); await H.waitForSelector('#board .cell');
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); }
  // round 1: vulture first, clock running
  await V.waitForSelector('#actions.mine', { state: 'attached' }); assert.ok(await V.locator('#clock3:not(.hidden)').count(), 'shot clock shown');
  assert.equal(await V.locator('.pc.ph').count(), 0, 'vulture cannot see the far hunter'); assert.equal(await A.locator('.pc.ph').count(), 0);
  assert.equal(await H.locator('.pc.po, .pc.pv').count(), 0, 'hunter sees no birds');
  await cell(V, 4, 1).click(); await A.waitForSelector('#actions.mine', { state: 'attached' }); await cell(A, 7, 5).click();
  await A.waitForSelector('.pc.ph'); // hunter now within 2 of the ostrich
  await H.waitForSelector('#actions.mine', { state: 'attached' }); await H.waitForSelector('.cell.maybird', { state: 'attached' }); await H.waitForSelector('.h3pop.yes', { state: 'attached' }); await H.waitForTimeout(400); await shot(H, '3-sense');
  console.log('maybird', await H.locator('.cell.maybird').count()); assert.ok(await H.locator('.cell.maybird').count() >= 9, 'sense zone: rose "Bird may be here" dots'); assert.ok(/A bird is near: you can move up to 2 squares\. The rose dots show where it may be\./.test(await H.textContent('#hint')));
  await H.waitForTimeout(800); await shot(H, '4-hunter-view');
  await H.waitForTimeout(1200); await cell(H, 7, 5).click(); // hyena pounce: one move of 2 squares lands on the ostrich
  await A.waitForSelector('.h3pop.catch'); await H.waitForSelector('.h3pop.catch'); await A.waitForTimeout(250); await shot(A, '5-catch-ostrich'); await shot(H, '5-catch-hunter');
  assert.equal(await A.locator('#h3bar .bchip.blue .pip.on').count(), 1, 'header shows catch');
  assert.equal(await A.locator('.cell').nth(6 * 9 + 6).locator('.pc.po').count(), 1, 'ostrich knocked back to (6,6)');
  // round 2: vulture lets the clock run out -> pass; ostrich lost its turn -> hunter
  await V.waitForSelector('#actions.mine', { state: 'attached' }); await V.waitForTimeout(5500); await shot(V, '6-shot-clock');
  const t = await V.textContent('#clock3'); assert.ok(/[1-5]s/.test(t), 'countdown ' + t);
  await H.waitForSelector('#actions.mine', { state: 'attached', timeout: 9000 }); assert.ok(/lost this turn|Hyena/.test(await A.textContent('#hint')));
  await H.locator('#actions button').click({ force: true }); await V.waitForSelector('#actions.mine', { state: 'attached' });
  console.log('ok 3 phones');
  // 1 human hunter (honey badger) vs 2 computer birds
  const P = await mk(); await P.goto(U); await P.click('#playSolo'); await P.click('[data-bots="2"]'); await P.click('#soloGo'); await P.click('[data-role="badger"]'); await P.click('#startGame');
  await P.waitForSelector('#actions.mine', { state: 'attached', timeout: 15000 }); assert.ok(/BADGER/.test(await P.textContent('#turnTag')));
  await P.locator('#actions button').click({ force: true }); await P.waitForSelector('.burtag'); await shot(P, '7-badger-burrowed');
  for (let i = 0; i < 4; i++) { await P.waitForSelector('#actions.mine, #over:not(.hidden)', { state: 'attached', timeout: 15000 }); if (await P.locator('#over:not(.hidden)').count()) break;
    await P.waitForTimeout(1200); await P.locator('.cell.legal').first().click(); await P.waitForTimeout(300); }
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-three'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
