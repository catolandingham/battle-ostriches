// The friends room waits for a second player: alone, the host sees only the code, Share and the seats
// (you, and an "Open seat" with "+ Computer"). The animal choice and Start appear once a friend joins or a computer is added.
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
process.env.PORT = 3986; process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const U = 'http://localhost:3986/';
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off']) localStorage.setItem(k, '1'); });
    p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const alone = async p => {
    await p.waitForSelector('#lobbyCode:not(:empty)'); await p.waitForSelector('.openseat');
    const v = await p.evaluate(() => ({ roles: document.querySelectorAll('#roomLobby [data-role]').length, start: !!document.getElementById('startGame'),
      share: !!document.getElementById('shareGo'), open: document.querySelector('.openseat .opentxt').textContent, add: (document.getElementById('botPlus') || {}).textContent,
      you: document.querySelector('#roomLobby .seats li').textContent }));
    assert.equal(v.roles, 0, 'no animal choice while alone'); assert.equal(v.start, false, 'no Start while alone'); assert.ok(v.share, 'Share shows');
    assert.equal(v.open, 'Open seat'); assert.equal(v.add, '+ Computer'); assert.ok(/You/.test(v.you) && /host/.test(v.you), 'host row');
  };
  // 1. alone, then a friend joins: both see the animal choice, and the game starts
  const A = await mk(); await A.goto(U); await A.click('#playFriend'); await alone(A);
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, U.slice(0, -1));
  const F = await mk(); await F.goto(link);
  await A.waitForSelector('[data-role="blue"]'); await F.waitForSelector('[data-role="red"]');
  assert.equal(await A.locator('.openseat').count(), 0, 'open seat row goes once a friend is in');
  await A.click('[data-role="blue"]'); await F.click('[data-role="red"]');
  await A.waitForFunction(() => LobbyUI.get().canStart); await A.click('#startGame'); await A.waitForSelector('#board .cell'); await F.waitForSelector('#board .cell');
  // 2. alone, then one tap on + Computer: the animal choice and Start appear, and the game starts against the computer
  const C = await mk(); await C.goto(U); await C.click('#playFriend'); await alone(C);
  await C.click('#botPlus'); await C.waitForSelector('[data-role="blue"]'); await C.waitForSelector('#startGame');
  assert.equal(await C.evaluate(() => LobbyUI.get().botsWanted), 1);
  await C.waitForFunction(() => LobbyUI.get().canStart); await C.click('#startGame'); await C.waitForSelector('#board .cell');
  // 3. three friends: the room still opens the 3-player choice
  const H = await mk(); await H.goto(U); await H.click('#playFriend'); await alone(H);
  const l3 = (await H.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, U.slice(0, -1));
  const P2 = await mk(), P3 = await mk(); await P2.goto(l3); await P3.goto(l3);
  await H.waitForFunction(() => LobbyUI.get().setup === '3'); await H.waitForSelector('[data-role="hyena"]');
  assert.deepEqual(errs, []); console.log('e2e-lobby-wait: all passed');
  await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
