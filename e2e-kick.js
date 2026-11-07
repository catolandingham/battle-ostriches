// Kick on WebKit iPhone 13s (Hunters mode: the host is the ostrich, a friend is the honey badger, two computer seats): the Kick button shows only with an
// animal next to the ostrich, is disabled while Carry is selected, pushes the badger 2 squares, says one line on both phones, shows the badger quote,
// and tells only the badger's phone which square it landed on. Pictures -> shots/kick/.
process.env.PORT = 3975; process.env.BO_H4START = '0,0,8,0'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '20000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), BL = require('./public/badgerlines.js'); const U = 'http://localhost:3975/', OUT = 'shots/kick/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 });
const at = { state: 'attached' };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const A = await mk(); await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3975');
  const Y = await mk(); await Y.goto(link); await Y.waitForSelector('#roomLobby');
  await A.click('#botPlus'); await A.click('#botPlus');
  await A.waitForSelector('[data-role="ostrich"]'); await A.click('[data-role="ostrich"]'); await Y.click('[data-role="badger"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'badger' && r.mine); });
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await Y.waitForSelector('#board .cell');
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [1, 4]]) { await cell(A, x, y).click(); await A.waitForTimeout(150); }
  // the start-of-game line reaches every phone, naming only the animals in this game
  const hunts = 'The vulture hunts eggs. The hyena and honey badger hunt birds.';
  for (const [P, name] of [[A, 'ostrich'], [Y, 'badger']]) await P.waitForFunction(t => [...document.querySelectorAll('.h3pop.event')].some(e => e.textContent === t), hunts, { timeout: 15000 }).catch(e => { throw new Error(name + ' phone never showed the start line: ' + e.message); });
  await A.waitForSelector('#actions.mine', { ...at, timeout: 25000 });
  const room = [...server.rooms.values()].find(r => r.hunt), g = room.g;
  g.vulture = [8, 6]; g.hunt.hs.hyena.p = [0, 0]; g.hunt.hs.badger.p = [8, 0]; server.broadcast(room); await A.waitForTimeout(400);
  assert.equal(await A.locator('#actions button:has-text("Kick")').count(), 0, 'no Kick button with nothing next to the ostrich');
  // the badger stands next to the ostrich, which sits on an egg at (2,5); the others are far away
  g.ostrich = [2, 5]; g.vulture = [8, 0]; g.hunt.hs.hyena.p = [0, 0]; g.hunt.hs.badger.p = [3, 5]; g.hunt.hs.badger.burrowed = false; g.sitRun = 0; server.broadcast(room);
  await A.waitForSelector('#actions button:has-text("Kick")');
  assert.equal(await A.locator('#actions button:has-text("Kick")').isDisabled(), false, 'Kick is on when a badger is next to the ostrich');
  assert.equal(await A.locator('#actions button:has-text("Walk")').count(), 1, 'the move button says Walk');
  await shot(A, '1-kick-button');
  // Carry selected: Kick is disabled and says why
  await A.locator('#actions button:has-text("Carry")').click({ force: true });
  await A.waitForFunction(() => /carrying an egg/.test(document.getElementById('hint').textContent));
  assert.equal(await A.locator('#actions button:has-text("Kick")').isDisabled(), true, 'Kick is off on a carry turn');
  assert.match(await A.textContent('#hint'), /You can't kick while carrying an egg\./); await shot(A, '2-kick-off-while-carrying');
  await A.locator('#actions button:has-text("Walk")').click({ force: true });
  assert.equal(await A.locator('#actions button:has-text("Kick")').isDisabled(), false);
  // a burrowed badger can't be seen, so the button goes away
  g.hunt.hs.badger.burrowed = true; server.broadcast(room); await A.waitForFunction(() => !/Kick/.test(document.getElementById('actions').textContent));
  g.hunt.hs.badger.burrowed = false; server.broadcast(room); await A.waitForSelector('#actions button:has-text("Kick")');
  // kick: the badger flies 2 squares east
  await A.locator('#actions button:has-text("Kick")').click({ force: true });
  await A.waitForFunction(() => /Tap the glowing animal to kick it\./.test(document.getElementById('hint').textContent));
  assert.equal(await A.locator('.cell.legal').count(), 1, 'only the badger glows'); await cell(A, 3, 5).click();
  await A.waitForFunction(() => document.querySelector('.h3pop.event'), null, { timeout: 5000 });
  assert.deepEqual(g.hunt.hs.badger.p, [5, 5], 'pushed 2 squares straight away'); assert.deepEqual(g.ostrich, [2, 5], 'the ostrich stays'); assert.equal(g.lastKick.who, 'badger');
  const line = 'The ostrich kicked the honey badger back 2 squares.';
  for (const [P, name] of [[A, 'ostrich'], [Y, 'badger']]) await P.waitForFunction(t => [...document.querySelectorAll('.h3pop.event')].some(e => e.textContent === t), line, { timeout: 6000 }).catch(e => { throw new Error(name + ' phone never showed the kick line: ' + e.message); });
  for (const P of [A, Y]) await P.waitForFunction(t => (document.getElementById('badgerline') || {}).textContent === t, BL.LINES.kicked, { timeout: 8000 });
  assert.equal(BL.LINES.kicked, "Ouch. I mean... honey badger don't care.");
  await shot(A, '3-kick-ostrich'); await shot(Y, '4-kick-badger');
  // everyone is told; only the badger's phone is told the square
  const ka = await A.evaluate(() => UI._S().kick), ky = await Y.evaluate(() => UI._S().kick);
  assert.equal(ka.who, 'badger'); assert.equal(ky.who, 'badger'); assert.equal(ka.to, null, 'the ostrich is 3 squares away: it cannot see where the badger landed'); assert.deepEqual(ky.to, [5, 5]);
  assert.equal(await A.locator('.pc.ph').count(), 0, 'no hunter drawn on the ostrich\'s board'); assert.equal(await Y.locator('.pc.ph.mine').count(), 1);
  // the turn passed to the next seat, and the Kick button is gone
  await A.waitForFunction(() => !document.querySelector('#actions.mine'));
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-kick'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
