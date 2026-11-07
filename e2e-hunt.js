// 4-player Hunters mode + the new lobby on WebKit iPhone 13s: Classic default lobby, "More players" picker, Hunters setup,
// a friend joining as the hyena by link, the badger's view with both hunters, tough-ground burrow text, rivalry, game over.
process.env.PORT = 3995; process.env.BO_TOUGH = '1'; process.env.BO_H4START = '2,3,4,3'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '8000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), H = require('./hunt.js'); const U = 'http://localhost:3995/', OUT = 'shots/hunt/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 });
const at = { state: 'attached' };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  // ---- home: two primary paths, no player-count picker ----
  const A = await mk(); await A.goto(U);
  assert.equal(await A.locator('#moreP').count(), 0, 'no player-count picker');
  assert.ok(await A.isVisible('#playFriend') && await A.isVisible('#playSolo'));
  assert.equal(await A.locator('.mrules:not(.hidden)').count(), 0, 'multi-player rules hidden on the home screen'); await shot(A, '1-default-lobby');
  await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)'); await shot(A, '2-more-players-picker');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3995');
  const Y = await mk(); await Y.goto(link); await Y.waitForSelector('#roomLobby');
  // ---- Hunters: 2 humans + 2 computers. Host is the badger, friend is the hyena. ----
  await A.click('#botPlus'); await A.click('#botPlus');
  await A.waitForSelector('[data-role="badger"]'); await A.click('[data-role="badger"]'); await Y.click('[data-role="hyena"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'hyena' && r.mine); });
  await shot(A, '3-hunters-setup');
  await A.click('#startGame'); await Y.waitForSelector('#board .cell');
  await Y.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); assert.ok(/HYENA/.test(await Y.textContent('#turnTag')));
  await Y.locator('#actions button').first().click({ force: true }); // hyena stays put
  await A.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); assert.ok(/HONEY BADGER/.test(await A.textContent('#turnTag')));
  assert.equal(await A.locator('#h3bar .bchip').count(), 4); assert.ok(await A.locator('#clock3:not(.hidden)').count(), 'shot clock');
  assert.equal(await A.locator('.pc.ph').count(), 2, 'badger sees itself and the hyena (2 squares away)'); assert.equal(await A.locator('.pc.po, .pc.pv').count(), 0);
  assert.equal((await A.textContent('#actions')).trim(), 'Burrow'); await A.waitForTimeout(2300); await shot(A, '4-hunter-view-both-hunters');
  await A.locator('#actions button').first().click({ force: true }); // stay: tough ground (BO_TOUGH=1), not yet burrowed
  const room = [...server.rooms.values()].find(r => r.hunt); assert.equal(room.g.hunt.hs.badger.dig, 1); assert.equal(room.g.hunt.hs.badger.burrowed, false);
  await Y.waitForSelector('#actions.mine', { state: 'attached',  ...at, timeout: 20000 }); await Y.locator('#actions button').first().click({ force: true });
  await A.waitForSelector('#actions.mine', { state: 'attached',  ...at, timeout: 20000 }); await A.waitForSelector('.burtag.dig', at); assert.ok(/Tough ground/.test(await A.textContent('#hint'))); assert.equal((await A.textContent('#actions')).trim(), 'Finish');
  await A.waitForTimeout(2300); await shot(A, '5-badger-digging-1of2');
  await A.locator('#actions button').first().click({ force: true });
  await A.waitForFunction(() => /burrowed/i.test(document.body.innerText), null, { timeout: 4000 });
  assert.equal(room.g.hunt.hs.badger.burrowed, true, 'burrowed after 2 still turns');
  // rivalry: hyena moves onto the badger and bounces back 2
  await Y.waitForSelector('#actions.mine', { state: 'attached',  ...at, timeout: 20000 }); const hy = room.g.hunt.hs.hyena.p, bd = room.g.hunt.hs.badger.p;
  if (Math.max(Math.abs(hy[0] - bd[0]), Math.abs(hy[1] - bd[1])) === 1) { await Y.locator('.cell').nth(bd[1] * 9 + bd[0]).click(); await Y.waitForTimeout(500);
    assert.equal(room.g.hunt.rival && room.g.hunt.rival.by, 'hyena'); await shot(Y, '6-hyena-bounced'); }
  // game over: both birds out, the badger has more KOs
  if (room.g.phase === 'play') { H.knockout(room.g, 'red', 'caught', 'badger'); H.knockout(room.g, 'blue', 'caught', 'badger'); server.broadcast(room); }
  await A.waitForSelector('#over:not(.hidden)'); assert.ok(/You win/.test(await A.textContent('#over'))); await Y.waitForSelector('#over:not(.hidden)');
  assert.ok(/Honey badger wins/.test(await Y.textContent('#over'))); await shot(A, '7-over');
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-hunt'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
