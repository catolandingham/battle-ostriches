// Rejoin after leaving the site: token auto-returns you; lost storage offers only offline seats after the grace.
process.env.PORT = 4021; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '600000';
process.env.BO_REJOIN_GRACE_MS = '1500';
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs'), path = require('path');
const server = require('./server.js');
const U = 'http://localhost:4021/';
const OUT = 'shots/rejoin/';
fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
const init = () => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); window.AudioContext = undefined; window.webkitAudioContext = undefined; };

async function clearSeatMemory(page) {
  await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const k of keys) if (k === 'bo_me' || (k && k.startsWith('bo_seat_'))) localStorage.removeItem(k);
    for (const c of document.cookie.split(';')) {
      const n = c.split('=')[0].trim();
      if (n === 'bo_me' || n.startsWith('bo_seat_')) document.cookie = n + '=; Path=/; Max-Age=0';
    }
  });
}

(async () => {
  const b = await webkit.launch();
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'] });
    const p = await c.newPage();
    await p.addInitScript(init);
    return { p, c };
  };
  // The lost-storage visit has to happen after the old socket is actually gone.
  // A reload in the same page can join while that socket is still open, and the
  // server then says the game is full instead of offering the seat. The rejoin
  // line is what we wait for; the grace (1.5s in this file) is what reveals it.
  const seatDropped = async (code, seat) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const room = server.rooms.get(code);
      const p = room && room.players && room.players[seat];
      if (p && !(p.ws && p.ws.readyState === 1)) return;
      await new Promise(r => setTimeout(r, 20));
    }
    throw new Error('seat ' + seat + ' was still connected');
  };
  const returnWithoutStorage = async (holder, code, seat) => {
    await clearSeatMemory(holder.p);
    await holder.c.close();
    await seatDropped(code, seat);
    const next = await mk();
    await next.p.goto('http://localhost:4021/?room=' + code);
    await next.p.waitForSelector('#roomLobby');
    return next;
  };
  // The reclaim line is the bench note once the grace has ended and the seat is
  // actually offline. A page that connected during the grace is still on the
  // "next game" note until that push; if the push was missed, reload then.
  const waitRejoin = async (page, code, pattern) => {
    const LB = require('./lobby');
    const offered = () => {
      const room = server.rooms.get(code);
      return !!(room && LB.offlineSeats(room).length);
    };
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && !offered()) await new Promise(r => setTimeout(r, 40));
    if (!offered()) throw new Error('no offline seat to reclaim in ' + code);
    const showing = () => page.evaluate(src => new RegExp(src).test((document.getElementById('roomLobby') || {}).textContent || ''), pattern);
    if (!(await showing())) {
      await page.reload();
      await page.waitForSelector('#roomLobby');
    }
    await page.waitForFunction(src => new RegExp(src).test((document.getElementById('roomLobby') || {}).textContent || ''), pattern);
  };

  // ---- 2 players ----
  let A = await mk(), V = await mk();
  await A.p.goto(U); await A.p.click('#playFriend'); await A.p.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.p.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4021');
  const code = await A.p.textContent('#lobbyCode');
  await V.p.goto(link); await V.p.waitForSelector('#roomLobby');
  await A.p.click('#startGame');
  await A.p.waitForSelector('#board .cell'); await V.p.waitForSelector('#board .cell');
  const roleA = await A.p.evaluate(() => UI._S().role);

  // navigate away to another origin and back, storage kept: auto-rejoin
  await A.p.goto('https://example.com');
  await A.p.waitForSelector('body');
  await A.p.goto('http://localhost:4021/?room=' + code);
  await A.p.waitForFunction(() => UI._S() && UI._S().phase && document.querySelectorAll('#board .cell').length > 0);
  assert.equal(await A.p.evaluate(() => UI._S().role), roleA, '2p token survived a trip to another site');
  const href = await A.p.evaluate(() => location.href);
  assert.ok(!/#m=/.test(href) && !/[?&]m=/.test(href), 'token is not in the URL: ' + href);
  const stored = await A.p.evaluate(() => localStorage.getItem('bo_me'));
  assert.ok(stored && JSON.parse(stored).token, 'token stays in localStorage');
  const share = await A.p.evaluate(() => document.getElementById('shareLink') && document.getElementById('shareLink').value);
  if (share) assert.ok(!/#m=/.test(share) && !/[?&]m=/.test(share), 'share link has no token');
  console.log('ok 2p navigate away and back with storage, token kept out of the URL');

  // lost storage: show reclaim, confirm, sit back down
  A = await returnWithoutStorage(A, code, roleA);
  const early2 = await A.p.textContent('#roomLobby');
  if (/You'll play in the next one/.test(early2) && !/Rejoin as/.test(early2)) await shot(A.p, '2p-grace');
  await waitRejoin(A.p, code, 'Back in the game\\? Tap your animal\\.');
  const body2 = await A.p.textContent('#roomLobby');
  assert.ok(!/You're in[\s\S]*You're in/.test(body2), 'title is not repeated in the body');
  assert.ok(/Rejoin as the ostrich/.test(body2), body2);
  assert.ok(!/Rejoin as the vulture/.test(body2), 'the connected vulture is not offered');
  await shot(A.p, '2p-rejoin');
  await A.p.click('button[data-claim="blue"]');
  await A.p.waitForSelector('#claimYes');
  assert.ok(/Rejoin as the ostrich\?/.test(await A.p.textContent('#roomLobby')));
  assert.ok(/Only pick this if this was you/.test(await A.p.textContent('#roomLobby')));
  await shot(A.p, '2p-confirm');
  await A.p.click('#claimYes');
  await A.p.waitForFunction(() => /let you in/.test((document.getElementById('roomLobby') || {}).textContent || ''));
  await V.p.waitForSelector('#rejoinAsk:not(.hidden)');
  await shot(V.p, '2p-approve');
  await V.p.click('#rejoinAskYes');
  await A.p.waitForFunction(() => UI._S() && UI._S().role === 'blue' && document.querySelectorAll('#board .cell').length > 0);
  assert.equal(await A.p.evaluate(() => UI._S().role), 'blue');
  console.log('ok 2p lost-storage fallback');

  // a third phone, everyone still in, is the waiting bench with no reclaim buttons
  const late = await mk();
  await late.p.goto(link);
  await late.p.waitForFunction(() => /You'll play in the next one/.test((document.getElementById('roomLobby') || {}).textContent || ''));
  const lateTxt = await late.p.textContent('#roomLobby');
  assert.ok(!/Rejoin as/.test(lateTxt), 'a new arrival cannot take a live seat');
  assert.ok(!/You're in[\s\S]*You're in/.test(lateTxt));
  await shot(late.p, '2p-late-no-steal');
  await late.c.close();
  await A.c.close(); await V.c.close();
  console.log('ok 2p live seats cannot be stolen');

  // ---- 3 players ----
  let A3 = await mk(), V3 = await mk(), H3 = await mk();
  await A3.p.goto(U); await A3.p.click('#playFriend'); await A3.p.waitForSelector('#lobbyCode:not(:empty)');
  const link3 = (await A3.p.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4021');
  const code3 = await A3.p.textContent('#lobbyCode');
  await V3.p.goto(link3); await H3.p.goto(link3);
  await A3.p.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
  await A3.p.click('[data-role="blue"]'); await V3.p.click('[data-role="red"]'); await H3.p.click('[data-role="hyena"]');
  await A3.p.waitForFunction(() => LobbyUI.get() && LobbyUI.get().canStart);
  await A3.p.click('#startGame');
  await A3.p.waitForSelector('#board .cell'); await V3.p.waitForSelector('#board .cell'); await H3.p.waitForSelector('#board .cell');

  await H3.p.goto('https://example.com'); await H3.p.waitForSelector('body');
  await H3.p.goto('http://localhost:4021/?room=' + code3);
  await H3.p.waitForFunction(() => UI._S() && UI._S().role === 'hunter' && document.querySelectorAll('#board .cell').length > 0);
  console.log('ok 3p navigate away and back with storage');

  H3 = await returnWithoutStorage(H3, code3, 'hunter');
  await waitRejoin(H3.p, code3, 'Rejoin as the hyena');
  const hTxt = await H3.p.textContent('#roomLobby');
  assert.ok(/Back in the game\? Tap your animal\./.test(hTxt), hTxt);
  assert.ok(!/Rejoin as the ostrich/.test(hTxt) && !/Rejoin as the vulture/.test(hTxt), 'only the offline hyena');
  await shot(H3.p, '3p-rejoin');
  await H3.p.click('button[data-claim="hunter"]');
  await H3.p.waitForSelector('#claimYes');
  await shot(H3.p, '3p-confirm');
  await H3.p.click('#claimYes');
  await A3.p.waitForSelector('#rejoinAsk:not(.hidden)');
  await A3.p.click('#rejoinAskYes');
  await H3.p.waitForFunction(() => UI._S() && UI._S().role === 'hunter' && document.querySelectorAll('#board .cell').length > 0);
  console.log('ok 3p lost-storage fallback');
  await A3.c.close(); await V3.c.close(); await H3.c.close();

  // ---- team (2 vs 2): two people + two computers ----
  let A4 = await mk(), V4 = await mk();
  await A4.p.goto(U); await A4.p.click('#playFriend'); await A4.p.waitForSelector('#lobbyCode:not(:empty)');
  const link4 = (await A4.p.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4021');
  const code4 = await A4.p.textContent('#lobbyCode');
  await V4.p.goto(link4); await V4.p.waitForSelector('#roomLobby');
  await A4.p.click('#botPlus'); await A4.p.click('#botPlus');
  await A4.p.waitForSelector('[data-role="ostrich"]');
  await A4.p.click('[data-role="ostrich"]'); await V4.p.click('[data-role="vulture"]');
  await A4.p.waitForFunction(() => LobbyUI.get() && LobbyUI.get().canStart);
  await A4.p.click('#startGame');
  await A4.p.waitForSelector('#board .cell'); await V4.p.waitForSelector('#board .cell');
  const role4 = await A4.p.evaluate(() => UI._S().role);

  await A4.p.goto('https://example.com'); await A4.p.waitForSelector('body');
  await A4.p.goto('http://localhost:4021/?room=' + code4);
  await A4.p.waitForFunction(r => UI._S() && UI._S().role === r && document.querySelectorAll('#board .cell').length > 0, role4);
  console.log('ok team navigate away and back with storage');

  const seat4 = await A4.p.evaluate(() => UI._S().h3.mySeat);
  A4 = await returnWithoutStorage(A4, code4, seat4);
  await waitRejoin(A4.p, code4, 'Rejoin as');
  const tTxt = await A4.p.textContent('#roomLobby');
  assert.ok(/Back in the game\? Tap your animal\./.test(tTxt), tTxt);
  assert.ok(/Rejoin as Ostrich 1|Rejoin as the ostrich/.test(tTxt), tTxt);
  assert.ok(!/Rejoin as Vulture/.test(tTxt) && !/Rejoin as the vulture/.test(tTxt), 'connected vulture not offered');
  await shot(A4.p, 'team-rejoin');
  const claimSeat = await A4.p.getAttribute('button[data-claim]', 'data-claim');
  await A4.p.click('button[data-claim]');
  await A4.p.waitForSelector('#claimYes');
  assert.ok(/Only pick this if this was you/.test(await A4.p.textContent('#roomLobby')));
  await shot(A4.p, 'team-confirm');
  await A4.p.click('#claimYes');
  await V4.p.waitForSelector('#rejoinAsk:not(.hidden)');
  await shot(V4.p, 'team-approve');
  await V4.p.click('#rejoinAskYes');
  await A4.p.waitForFunction(r => UI._S() && UI._S().role === r && document.querySelectorAll('#board .cell').length > 0, role4);
  assert.equal(await A4.p.evaluate(() => UI._S().role), role4);
  assert.ok(claimSeat === 'o1' || claimSeat === 'o2' || claimSeat === 'v1' || claimSeat === 'v2', 'claimed a team seat: ' + claimSeat);
  console.log('ok team lost-storage fallback');
  await A4.c.close(); await V4.c.close();

  await b.close(); server.close();
  console.log('PASS e2e-rejoin');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
