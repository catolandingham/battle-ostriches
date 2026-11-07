// Four Hunters phones (WebKit iPhone 13): the first hunters meeting, on every phone.
// Every phone gets the one-line announcement and it stays up about 3 seconds even though the board is redrawn under it.
// Only the two hunters (who can see the hyena) get the square highlighted; the two far birds get the line and no location.
process.env.PORT = 3960; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '600000'; process.env.BO_BOTMS = '600000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), H = require('./hunt.js'), HA = require('./huntai.js');
const U = 'http://localhost:3960/', OUT = 'shots/announce/'; fs.mkdirSync(OUT, { recursive: true });
const MEET = 'The honey badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares.';
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async name => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(name + ' ' + e.message)); p.name = name; return p; };
  const [O, V, Y, K] = [await mk('ostrich'), await mk('vulture'), await mk('hyena'), await mk('badger')], ALL = [O, V, Y, K];
  await O.goto(U); await O.click('#playFriend'); await O.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await O.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3960');
  for (const p of [V, Y, K]) await p.goto(link);
  await O.waitForFunction(() => LobbyUI.get().humanCount === 4);
  for (const [p, r] of [[O, 'ostrich'], [V, 'vulture'], [Y, 'hyena'], [K, 'badger']]) { await p.waitForSelector(`[data-role="${r}"]`); await p.click(`[data-role="${r}"]`); }
  await O.waitForFunction(() => LobbyUI.get().canStart && LobbyUI.get().setup === '4h');
  await O.click('#startGame'); for (const p of ALL) await p.waitForSelector('#board .cell');
  // a recorder on every phone: when #announce shows which words, and for how long (it is outside #board, so a redraw must not cut it short)
  for (const p of ALL) await p.evaluate(() => { window.__ann = []; setInterval(() => { const e = document.getElementById('announce'), on = !!e && e.classList.contains('show'), L = window.__ann, last = L[L.length - 1];
    if (on && (!last || last.end || last.text !== e.textContent)) L.push({ text: e.textContent, start: performance.now(), inBoard: !!e.closest('#board') });
    else if (!on && last && !last.end) last.end = performance.now(); }, 40); });
  const room = [...server.rooms.values()].find(r => r.hunt); room.clock = false;
  // the game starts: hyena (4,3) and badger (5,3) side by side; the ostrich and the vulture are far from both
  const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.badger.p = [5, 3]; g.ostrich = [0, 0]; g.vulture = [0, 6]; g.turn = 'badger'; room.g = g; server.broadcast(room);
  await K.waitForSelector('#actions.mine', { state: 'attached', timeout: 10000 });
  // 2. the first hunters meeting this page has seen: the badger walks onto the hyena. The board is redrawn three times under the line.
  const kb = await K.evaluate(() => UI._S().h3.hunters.find(h => h.kind === 'hyena').p); assert.deepEqual(kb, [4, 3]);
  await K.locator('.cell').nth(3 * 9 + 4).click({ force: true });
  assert.equal(room.g.hunt.rival && room.g.hunt.rival.by, 'badger', 'the meeting happened'); const to = room.g.hunt.hs.hyena.p.slice(); assert.deepEqual(to, [2, 3]);
  for (const p of ALL) await p.waitForFunction(() => window.__ann.length >= 1, null, { timeout: 8000 });
  for (const p of ALL) await p.waitForTimeout(0);
  const kbNow = {}; for (const p of ALL) kbNow[p.name] = await p.evaluate(() => document.querySelectorAll('#board .cell.h3kb').length);
  await K.waitForTimeout(400); await K.screenshot({ path: OUT + 'badger-line.png' }); await O.screenshot({ path: OUT + 'ostrich-line.png' });
  for (let i = 0; i < 3; i++) { await K.waitForTimeout(600); server.broadcast(room); } // board redraws while the line is up
  for (const p of ALL) await p.waitForFunction(() => window.__ann[0] && window.__ann[0].end, null, { timeout: 8000 });
  for (const p of ALL) {
    const a = await p.evaluate(() => window.__ann.slice()), m = a[0];
    assert.equal(a.length, 1, p.name + ' exactly one meeting line: ' + JSON.stringify(a)); assert.equal(m.text, MEET, p.name + ' reads the same line'); assert.equal(m.inBoard, false, 'the line lives outside the board');
    const secs = (m.end - m.start) / 1000; assert.ok(secs >= 2.7 && secs <= 3.7, `${p.name}: the line stayed up ${secs.toFixed(2)} s`);
    console.log(p.name.padEnd(8), 'meeting line up', secs.toFixed(2), 's, highlight', kbNow[p.name]);
  }
  // the square: only the hunters (who can see the hyena) get it; the far birds get the line and no location
  assert.ok(kbNow.hyena >= 1 && kbNow.badger >= 1, 'both hunters see the hyena\'s square highlighted'); assert.equal(kbNow.ostrich, 0, 'the far ostrich has no highlight'); assert.equal(kbNow.vulture, 0, 'the far vulture has no highlight');
  for (const p of [O, V]) assert.equal(await p.evaluate(() => UI._S().h3.rival.to), null, p.name + ' was not told the square');
  for (const p of [O, V]) assert.equal(await p.locator('.pc.ph').count(), 0, p.name + ' sees no hunter');
  await K.screenshot({ path: OUT + 'badger.png' }); await O.screenshot({ path: OUT + 'ostrich.png' });
  console.log('errors', errs); assert.deepEqual(errs, []);
  await b.close(); server.close(); console.log('PASS e2e-announce'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
