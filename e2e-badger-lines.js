// The badger's quotes on WebKit iPhone 13s (Hunters mode, host is the badger, a friend is the hyena, two computer birds):
// the burrow line shows only on the badger's phone; the shove line (badger moves onto the hyena) shows on both hunters' phones.
process.env.PORT = 3993; process.env.BO_H4START = '2,3,4,3'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '8000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), BL = require('./public/badgerlines.js'); const U = 'http://localhost:3993/', OUT = 'shots/badger-lines/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 });
const at = { state: 'attached' };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(); await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3993');
  const Y = await mk(); await Y.goto(link); await Y.waitForSelector('#roomLobby');
  await A.click('#botPlus'); await A.click('#botPlus');
  await A.waitForSelector('[data-role="badger"]'); await A.click('[data-role="badger"]'); await Y.click('[data-role="hyena"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'hyena' && r.mine); });
  await A.click('#startGame'); await Y.waitForSelector('#board .cell');
  await Y.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); await Y.locator('#actions button').first().click({ force: true }); // the hyena stays put
  await A.waitForSelector('#actions.mine', { ...at, timeout: 20000 });
  const room = [...server.rooms.values()].find(r => r.hunt);
  // the badger burrows: its own phone says the first-burrow line; the hyena's phone says nothing.
  // A tap during the previous cartoon is ignored, and the quote waits behind whatever line is already up, so wait until the board is free and give the line the same time as the later quotes.
  await A.waitForFunction(() => { const S = UI._S(); const busy = !!(window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()); const btn = document.querySelector('#actions.mine button'); return !!(S && S.myTurn && !UI._locked() && !busy && btn && /Burrow/.test(btn.textContent)); }, null, { timeout: 20000 });
  await A.locator('#actions button').first().click({ force: true });
  await A.waitForFunction(t => (document.getElementById('badgerline') || {}).textContent === t, BL.LINES.firstBurrow, { timeout: 15000 });
  await shot(A, '1-first-burrow-badger');
  assert.equal(await Y.locator('#badgerline').count(), 0, 'the hyena sees no burrow line'); assert.equal(room.g.hunt.hs.badger.burrowed, true);
  await A.waitForFunction(() => !document.getElementById('badgerline'), null, { timeout: 15000 }); // a quote stays up 1s plus 0.3s a word (the first-burrow quote is long)
  assert.equal(await Y.locator('#badgerline').count(), 0, 'still nothing on the hyena\'s phone');
  // the shove: the (burrowed) badger moves onto the hyena; both hunters see the line
  await Y.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); await Y.locator('#actions button').first().click({ force: true });
  await A.waitForSelector('#actions.mine', { ...at, timeout: 20000 });
  const bd = room.g.hunt.hs.badger.p, hy = [bd[0] - 1, bd[1]]; room.g.hunt.hs.hyena.p = hy.slice(); server.broadcast(room);
  await A.waitForFunction(p => document.querySelectorAll('#board .cell')[p[1] * 9 + p[0]].querySelector('.pc.ph'), hy, { timeout: 5000 });
  await A.locator('.cell').nth(hy[1] * 9 + hy[0]).click({ force: true });
  for (const [P, name] of [[A, 'badger'], [Y, 'hyena']]) {
    await P.waitForFunction(t => (document.getElementById('badgerline') || {}).textContent === t || !!document.getElementById('surprise-go'), BL.LINES.shove, { timeout: 15000 }).catch(e => { throw new Error(name + ' phone never reached the shove line: ' + e.message); });
    const go = P.locator('#surprise-go button');
    if (await go.count()) await go.click();
    await P.waitForFunction(t => (document.getElementById('badgerline') || {}).textContent === t, BL.LINES.shove, { timeout: 20000 }).catch(e => { throw new Error(name + ' phone never showed the shove line: ' + e.message); });
  }
  assert.equal(room.g.hunt.rival && room.g.hunt.rival.by, 'badger', 'the badger shoved the hyena');
  await shot(A, '2-shove-badger'); await shot(Y, '3-shove-hyena');
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-badger-lines'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
