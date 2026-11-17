// Phone: a double tap on Burrow does not spend the bonus turn, and How to play holds the shot clock.
process.env.PORT = '3947'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000'; process.env.BO_CLOCKMS = '60000';
const assert = require('assert'), { webkit } = require('playwright-core');
const B = require('./game.js'), T = require('./three.js'), S = require('./server.js');

(async () => {
  const made = S.create3({ role: 'hunter', bots: ['blue', 'red'], kind: 'badger' }, null);
  const room = made.room, g = room.g = T.newGame3('badger', undefined, [5, 2]);
  for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p));
  assert.ok(T.placeOstrich3(g, [0, 6]));
  g.turn = 'hunter'; g.round = 1; g.three.h = [5, 2];
  g.three.pounce = false; g.three.extra = false; g.three.burrowed = false; g.three.sense = false;
  g.three.birds.red.out = true; g.three.birds.red.why = 'caught'; g.three.birds.red.catches = 2;
  g.vulture = [-99, -99];
  clearTimeout(room.aiT); room.aiT = null;
  S.broadcast(room);
  assert.ok(room.deadline > Date.now(), 'the shot clock is running before How to play');

  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 664 } });
  await page.addInitScript(() => {
    const orig = WebSocket.prototype.send;
    window.__acts = []; window.__hold = [];
    WebSocket.prototype.send = function (data) {
      try {
        const m = JSON.parse(data);
        if (m && m.t === 'act') window.__acts.push(m);
        if (m && (m.t === 'card-hold' || m.t === 'card-done')) window.__hold.push(m.t);
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    for (const k of ['bo_card_off', 'bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off']) localStorage.setItem(k, '1');
  });
  await page.goto('http://localhost:3947/');
  await page.evaluate(x => UI.open({ t: 'join', code: x.code, token: x.token }), { code: room.code, token: room.players.hunter.token });
  await page.waitForFunction(() => {
    const s = UI._S();
    return s && s.myTurn && s.phase === 'play' && /Burrow/.test(document.getElementById('actions').textContent);
  });

  await page.click('#moreBtn');
  await page.click('#menuHelp');
  await page.waitForFunction(() => !document.getElementById('rules').classList.contains('hidden') && window.__hold.includes('card-hold'));
  for (let i = 0; i < 50 && !(room.cardHold && room.cardHold.hunter && !room.deadline); i++) await page.waitForTimeout(20);
  assert.equal(room.cardHold && room.cardHold.hunter, true, 'How to play holds this seat');
  assert.equal(room.deadline, null, 'the shot clock is not counting');
  const held = S.clockDelayFor(room, () => ({ phase: 'play', role: 'hunter' }), 'hunter');
  assert.ok(held >= 60000, 'the hold is the card hold, saw ' + held);
  await page.waitForTimeout(500);
  assert.equal(g.turn, 'hunter');
  assert.equal(room.deadline, null, 'the clock stayed held');
  await page.locator('#rules button.big').first().click();
  await page.waitForFunction(() => document.getElementById('rules').classList.contains('hidden') && window.__hold.includes('card-done'));
  for (let i = 0; i < 50 && !(!room.cardHold.hunter && room.deadline > Date.now()); i++) await page.waitForTimeout(20);
  assert.ok(!room.cardHold.hunter, 'closing How to play releases the hold');
  assert.ok(room.deadline > Date.now(), 'the shot clock runs again');

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#actions button')].find(x => x.textContent === 'Burrow');
    if (!b) throw new Error('no Burrow button');
    b.click(); b.click();
    const cell = document.querySelector('#board .cell.legal');
    if (cell) { cell.click(); cell.click(); }
  });
  const acts = await page.evaluate(() => window.__acts.map(a => ({ a: a.a, round: a.stamp && a.stamp.round, turn: a.stamp && a.stamp.turn, bonus: a.stamp && a.stamp.bonus, sense: a.stamp && a.stamp.sense, seq: a.stamp && a.stamp.seq })));
  assert.equal(acts.length, 1, 'the second Burrow tap and the board taps were ignored until the update: ' + JSON.stringify(acts));
  assert.equal(acts[0].a, 'hstay');
  assert.equal(acts[0].bonus, false);
  assert.equal(acts[0].round, 1);
  assert.equal(acts[0].turn, 'hunter');
  assert.equal(typeof acts[0].sense, 'number');
  assert.equal(typeof acts[0].seq, 'number');
  await page.waitForFunction(() => UI._S() && UI._S().h3 && UI._S().h3.extra && UI._S().turn === 'hunter');
  assert.equal(g.three.extra, true);
  assert.equal(g.turn, 'hunter', 'the bonus turn was not spent');
  assert.equal(g.three.burrowed, true);

  await page.waitForFunction(() => {
    const s = UI._S();
    return s && s.h3 && s.h3.extra && s.turn === 'hunter' && document.querySelector('#board .cell.legal');
  });
  await page.evaluate(() => {
    const c = document.querySelector('#board .cell.legal');
    c.click(); c.click();
  });
  const queued = await page.evaluate(() => window.__acts.map(a => a.a));
  assert.deepEqual(queued, ['hstay'], 'a square double tap during the sense pause is not sent yet: ' + JSON.stringify(queued));
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.__acts.map(a => a.a));
  assert.deepEqual(after, ['hstay', 'hmove'], 'the queued double tap sends one move: ' + JSON.stringify(after));
  await page.waitForFunction(() => UI._S() && UI._S().turn !== 'hunter');
  assert.notEqual(g.turn, 'hunter');
  assert.equal(g.three.extra, false);

  await browser.close();
  S.close();
  console.log('PASS e2e-turnstamp');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
