// Browser pass over the new lobby: home, share-first friends room, role switch, gear timer,
// solo bot count, 4-player choice, start, rematch same/change, and a late joiner.
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
process.env.PORT = 3990; process.env.BO_NOSTORE = '1';
const server = require('./server.js');
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off']) localStorage.setItem(k, '1'); });
    p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const A = await mk();
  await A.goto('http://localhost:3990/');
  const home = await A.evaluate(() => {
    const big = [...document.querySelectorAll('#homeStep button.big')].map(b => b.textContent.trim());
    const pass = document.querySelector('#playPass');
    const pb = pass.getBoundingClientRect();
    return { big, pass: pass.className, passBottom: pb.bottom, w: innerWidth };
  });
  assert.deepEqual(home.big, ['Play with friends', 'Play solo']);
  assert.ok(!/\bbig\b/.test(home.pass), 'pass is a secondary link');
  assert.ok(home.passBottom < 844, 'pass link is on the phone screen');
  await A.click('#playFriend');
  await A.waitForSelector('#lobbyCode:not(:empty)');
  const fit = await A.evaluate(() => { const c = document.getElementById('lobbyCode').getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth + 1 && c.height > 20; });
  assert.ok(fit, 'room code fits the phone');
  assert.equal(await A.locator('#moreP').count(), 0);
  await A.click('#lobbyGear');
  await A.waitForSelector('#clockToggle');
  assert.equal(await A.getAttribute('#clockToggle', 'aria-pressed'), 'true', 'turn timer defaults on');
  await A.click('[data-role="red"]');
  await A.waitForFunction(() => LobbyUI.get().roles.some(r => r.id === 'red' && r.mine));
  await A.click('[data-role="blue"]');
  await A.waitForFunction(() => LobbyUI.get().roles.some(r => r.id === 'blue' && r.mine) && !LobbyUI.get().roles.some(r => r.id === 'red' && r.mine));
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3990');
  const V = await mk(); await V.goto(link); await V.waitForSelector('#roomLobby');
  await A.waitForFunction(() => LobbyUI.get().setup === '2' && LobbyUI.get().humanCount === 2);
  await A.click('#startGame');
  await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
  assert.equal(await A.evaluate(() => document.body.className), 'blue');
  const room = [...server.rooms.values()].find(r => r.flow && !r.lobby && r.setupId === '2');
  room.g.phase = 'over'; room.g.winner = 'blue'; server.broadcast(room);
  await A.waitForSelector('#rematchSame'); await A.waitForSelector('#rematchChange'); await A.waitForSelector('#newGame');
  const L = await mk(); await L.goto(link); await L.waitForSelector('#roomLobby');
  assert.match(await L.textContent('#roomLobby'), /next game/);
  await A.click('#rematchChange');
  await A.waitForSelector('#roomLobby');
  await A.waitForFunction(() => LobbyUI.get().lobby && LobbyUI.get().humanCount === 3 && !LobbyUI.get().roles.some(r => r.mine));
  assert.equal(await A.evaluate(() => LobbyUI.get().setup), '3', 'the late joiner is in the next lobby');
  console.log('ok friends, roles, timer, rematch change, late joiner');

  const S = await mk(); await S.goto('http://localhost:3990/');
  await S.click('#playSolo'); await S.click('[data-bots="3"]');
  assert.match(await S.textContent('#soloHint'), /2 vs 2 or Hunters/);
  await S.click('#soloGo');
  await S.waitForSelector('[data-setup="4h"]'); await S.waitForSelector('[data-setup="4"]');
  await S.click('[data-setup="4h"]'); await S.click('[data-role="hyena"]');
  await S.click('#startGame'); await S.waitForSelector('#board .cell');
  assert.ok(/HUNTERS|HYENA|hunter/i.test(await S.textContent('#turnTag') + await S.evaluate(() => document.body.className)));
  console.log('ok solo 3 bots asks for a 4-player setup');
  console.log('errors', errs); assert.deepEqual(errs, []);
  await b.close(); server.close(); console.log('PASS e2e-lobby'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
