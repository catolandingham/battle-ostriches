// T6 (D36, never show a result without its cause): the stone pickup, the carried egg, the burrow and the cold egg each get a short
// mark (at most 0.8 s) on the right square or chip of the right phone, and nothing on a phone that could not already see it.
// Two humans in a friends game (ostrich A, vulture V): stone pickup on V only, carry on A only, cold egg on A only, a smashed egg is not "cold".
// A 4-player Hunters game (badger A, hyena Y, two computers): burrow on A only. A vs-computer game with reduced motion: the mark is shorter, no flight.
// Reads the server's game (server.rooms) only to set up squares; every move is a real tap or a UI call.
process.env.PORT = 3966; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '400'; process.env.BO_CLOCKMS = '60000'; process.env.BO_TOUGH = '0'; process.env.BO_H4START = '4,3,5,3';
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
const server = require('./server.js');
const U = 'http://localhost:3966/', OUT = 'shots/cause/'; fs.mkdirSync(OUT, { recursive: true });
const at = { state: 'attached' };
const COLS = 9;
(async () => {
  const b = await webkit.launch(), errs = [];
  // every phone logs, ten times a second or better, which cause marks are on screen and on which square
  const mk = async (extra) => {
    const c = await b.newContext({ ...devices['iPhone 13'], ...(extra || {}) }), p = await c.newPage();
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off', 'bo_muted']) localStorage.setItem(k, '1');
      window.__ct = {};
      const KIND = { pick: '.cell.fxpick', fill: '#stats .hs.fxfill', carry: '.cell.fxcarry', cold: '.cell.fxcold', burrow: '.cell.fxburrow', stone: '#causefx .fxc-stone', egg: '#causefx .fxc-egg', ost: '#causefx .fxc-ost', ghost: '.fxghost', sink: '.fxsink', held: '.fxheld' };
      setInterval(() => {
        const t = performance.now();
        for (const k in KIND) {
          const el = document.querySelector(KIND[k]); if (!el) continue;
          const r = window.__ct[k] || (window.__ct[k] = { first: t, last: t, n: 0, idx: -1, old: null });
          r.last = t; r.n++;
          const cell = el.closest('.cell'); if (cell) r.idx = [...cell.parentElement.children].indexOf(cell);
          if (k === 'held') r.old = el.dataset.old;
        }
      }, 10);
    });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  const reset = (...ps) => Promise.all(ps.map(p => p.evaluate(() => { window.__ct = {}; })));
  const ct = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__ct)));
  const life = r => r.last - r.first;
  const S_ = p => p.evaluate(() => UI._S());
  const myTurn = async (p, ms) => { await p.waitForFunction(() => { const S = UI._S(); return S && S.myTurn && S.phase === 'play' && !UI._locked(); }, null, { timeout: ms || 20000 }); await p.waitForTimeout(120); return S_(p); };
  const cell = (p, x, y) => p.locator('#board .cell').nth(y * COLS + x);
  const room2 = () => [...server.rooms.values()].find(r => r.g && !r.three && !r.hunt && !r.team && !r.ai);
  const KINDS = ['pick', 'fill', 'carry', 'cold', 'burrow', 'stone', 'egg', 'ost', 'ghost', 'sink', 'held'];
  const only = async (p, want, label) => { // this phone showed these kinds and no other
    const c = await ct(p), got = Object.keys(c).filter(k => KINDS.includes(k)).sort();
    assert.deepEqual(got, want.slice().sort(), label + ': marks seen ' + JSON.stringify(got) + ' wanted ' + JSON.stringify(want));
    return c;
  };
  const none = (p, label) => only(p, [], label);
  const gone = async (p, label) => {
    await p.waitForFunction(() => !document.querySelector('.fxpick,.fxcarry,.fxcold,.fxburrow,.fxfill,.fxheld,.fxghost,.fxsink,.fxc-box'), null, { timeout: 2500 });
    assert.equal(await p.locator('.fxheld').count(), 0, label + ': count back to normal');
  };

  // ---------------------------------------------------------------- 1) two humans: stone pickup (V), carry (A), cold egg (A), smash is not cold
  const A = await mk(), V = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  await V.goto((await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3966')); await V.waitForSelector('#roomLobby');
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [3, 4]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); } // three eggs, ostrich on the first
  const room = room2(), g = room.g;
  assert.ok(room && g);
  // V's first turn: put the vulture next to the north rock pile with no stone, so that landing on the pile is a refill
  await myTurn(V);
  g.vulture = [4, 1]; g.stones = 0; server.broadcast(room);
  await V.waitForFunction(() => UI._S().stones === 0 && UI._S().vulture[1] === 1);
  assert.equal(await V.textContent('#stonesLeft'), '0/1');
  await reset(A, V);
  await cell(V, 4, 0).click(); // fly onto the rock pile at (4,0)

  // (1) STONE PICKUP: V only. A stone leaves the pile and drops into the chip; the chip shows the old count until it lands.
  await V.waitForFunction(() => window.__ct.pick && window.__ct.stone && document.querySelector('#stonesLeft.fxheld'), null, { timeout: 3000 });
  const held = await V.evaluate(() => { const n = document.getElementById('stonesLeft'); return { text: n.textContent, old: n.dataset.old, chip: document.querySelector('#stats .hs').classList.contains('fxfill') }; });
  assert.deepEqual(held, { text: '1/1', old: '0/1', chip: true }, 'chip: new count in the text, old count shown until the stone lands');
  await V.screenshot({ path: OUT + '1-stone-flying.jpg', type: 'jpeg', quality: 80 });
  await V.waitForTimeout(1300);
  let c = await only(V, ['pick', 'fill', 'stone', 'held'], 'V after pickup');
  assert.equal(c.pick.idx, 4, 'the mark is on the rock pile square (4,0)');
  assert.ok(life(c.pick) <= 820 && life(c.fill) <= 820 && life(c.stone) <= 820, 'stone marks last at most 0.8 s: ' + [life(c.pick), life(c.fill), life(c.stone)]);
  await none(A, 'A during V\'s pickup');
  await gone(V, 'V pickup');
  assert.equal(await V.textContent('#stonesLeft'), '1/1');

  // (2) CARRY: A only. A (on its egg at (3,4)) carries it one square.
  await myTurn(A);
  const SA = await S_(A); assert.ok(SA.can.carry, 'ostrich can carry');
  await A.evaluate(() => UI.setMode('carry'));
  const to = (await A.evaluate(() => UI._legal()))[0];
  await reset(A, V);
  await cell(A, to[0], to[1]).click();
  await A.waitForFunction(() => window.__ct.carry && window.__ct.egg, null, { timeout: 3000 });
  await A.screenshot({ path: OUT + '2-egg-sliding.jpg', type: 'jpeg', quality: 80 });
  await A.waitForTimeout(1300);
  c = await ct(A);
  assert.equal(c.carry.idx, to[1] * COLS + to[0], 'carry mark is on the new square');
  assert.ok(c.ost, 'classic theme: the ostrich slides too');
  assert.ok(life(c.carry) <= 820 && life(c.egg) <= 820 && life(c.ost) <= 820, 'carry marks last at most 0.8 s: ' + [life(c.carry), life(c.egg), life(c.ost)]);
  assert.deepEqual(Object.keys(c).filter(k => KINDS.includes(k)).sort(), ['carry', 'egg', 'ost'], 'A saw only carry marks');
  await none(V, 'V during A\'s carry (V must learn nothing about the egg)');
  await gone(A, 'A carry');

  // (3) COLD EGG: A only. The egg at (6,2) is one turn from cold; A sits. The egg dims on its square, then the count drops.
  await myTurn(V); // V waits more than a second, so the marks of A's carry are long gone by its prompt
  const sv = await S_(V); const fly = sv.fly.find(p => !g.eggs.some(e => e.alive && e.pos && e.pos[0] === p[0] && e.pos[1] === p[1]));
  await cell(V, fly[0], fly[1]).click();
  await myTurn(A);
  g.eggs[1].lastWarm = g.round - g.cfg.warmth; // goes cold when this round ends
  assert.deepEqual(g.eggs[1].pos, [6, 2]);
  const before = await S_(A); assert.equal(before.eggsLeft, 3);
  await reset(A, V);
  await A.evaluate(() => UI.act('sit'));
  await A.waitForFunction(() => window.__ct.cold && window.__ct.ghost && document.querySelector('#eggsLeft.fxheld'), null, { timeout: 3000 });
  const eh = await A.evaluate(() => { const n = document.getElementById('eggsLeft'); return { text: n.textContent, old: n.dataset.old }; });
  assert.deepEqual(eh, { text: '2', old: '3' }, 'egg count: new number in the text, old number shown until the egg has dimmed');
  await A.screenshot({ path: OUT + '3-egg-dimming.jpg', type: 'jpeg', quality: 80 });
  await A.waitForTimeout(1300);
  c = await ct(A);
  assert.equal(c.cold.idx, 2 * COLS + 6, 'the dim is on the square (6,2) where the egg was');
  assert.ok(life(c.cold) <= 820 && life(c.ghost) <= 820 && life(c.held) <= 820, 'cold marks last at most 0.8 s: ' + [life(c.cold), life(c.ghost), life(c.held)]);
  assert.deepEqual(Object.keys(c).filter(k => KINDS.includes(k)).sort(), ['cold', 'ghost', 'held'], 'A saw only cold marks');
  assert.equal(await A.textContent('#eggsLeft'), '2');
  await gone(A, 'A cold');
  // V never knew where that egg was, so V gets nothing (V also has no egg list at all)
  await none(V, 'V when an egg went cold');
  assert.equal(await V.evaluate(() => UI._S().eggs === undefined), true, 'the vulture view carries no egg list');
  assert.equal(await V.textContent('#eggsLeft'), '2', 'the public count still drops for V, with no animation');

  // (4) A smash is not a cold egg: V (moved next to the egg at (2,1)) throws its stone at it; A's board must show no cold dim.
  await myTurn(V);
  g.vulture = [3, 2]; server.broadcast(room);
  await V.waitForFunction(() => UI._S().vulture[0] === 3 && UI._S().vulture[1] === 2);
  await V.evaluate(() => UI.setMode('throw'));
  await reset(A, V);
  await cell(V, 2, 1).click(); if (await V.evaluate(() => !!document.querySelector('#board .cell.confirm'))) await cell(V, 2, 1).click(); // the only stone at an unfound egg asks once more
  await A.waitForFunction(() => document.querySelectorAll('.cell.hit').length === 1, null, { timeout: 5000 });
  await A.waitForTimeout(1300);
  await none(A, 'A when V smashed an egg (a smash is not a cold egg)');
  assert.equal(await A.textContent('#eggsLeft'), '1');
  const smashGo = A.locator('#surprise-go button');
  if (await smashGo.count()) await smashGo.click();
  if (await A.evaluate(() => !!(window.CUTAWAYS && CUTAWAYS.busy()))) await A.waitForFunction(() => !CUTAWAYS.busy(), null, { timeout: 15000 });

  // (5) the same carry in a sprite theme: the sprite layer already moves the ostrich, so only the egg slides
  await myTurn(A);
  await A.evaluate(() => document.documentElement.setAttribute('data-theme', 'nature'));
  await A.evaluate(() => UI._rr());
  await A.waitForFunction(() => document.querySelector('#fx .spr-o'), null, { timeout: 3000 });
  const s5 = await S_(A); assert.ok(s5.can.carry, 'ostrich on its egg again, can carry');
  await A.evaluate(() => UI.setMode('carry'));
  const to5 = (await A.evaluate(() => UI._legal()))[0];
  await reset(A, V);
  await cell(A, to5[0], to5[1]).click();
  await A.waitForFunction(() => window.__ct.carry && window.__ct.egg, null, { timeout: 3000 });
  await A.waitForTimeout(1300);
  c = await ct(A);
  assert.equal(c.carry.idx, to5[1] * COLS + to5[0]); assert.ok(!c.ost, 'sprite theme: no second ostrich is drawn');
  await none(V, 'V during A\'s second carry');
  await gone(A, 'A second carry');
  await A.evaluate(() => document.documentElement.setAttribute('data-theme', 'classic'));

  // ---------------------------------------------------------------- 2) Hunters: the badger's own burrow, badger A, hyena Y
  const A4 = await mk(), Y = await mk();
  await A4.goto(U); await A4.click('#playFriend'); await A4.waitForSelector('#lobbyCode:not(:empty)');
  await Y.goto((await A4.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3966')); await Y.waitForSelector('#roomLobby');
  await A4.click('#botPlus'); await A4.click('#botPlus');
  await A4.waitForSelector('[data-role="badger"]'); await A4.click('[data-role="badger"]'); await Y.click('[data-role="hyena"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'hyena' && r.mine); });
  await A4.click('#startGame'); await Y.waitForSelector('#board .cell');
  await Y.waitForSelector('#actions.mine', { ...at, timeout: 20000 });
  await Y.locator('#actions button').first().click({ force: true }); // the hyena stays put
  await A4.waitForSelector('#actions.mine', { ...at, timeout: 20000 });
  assert.equal((await A4.textContent('#actions')).trim(), 'Burrow');
  const hs = await S_(A4); assert.equal(hs.burrowed, false);
  await reset(A4, Y);
  await A4.locator('#actions button').first().click({ force: true }); // stay still: BO_TOUGH=0, so the badger burrows at once
  await A4.waitForFunction(() => window.__ct.burrow && window.__ct.sink, null, { timeout: 3000 });
  await A4.screenshot({ path: OUT + '4-badger-sinking.jpg', type: 'jpeg', quality: 80 });
  await A4.waitForTimeout(1300);
  c = await ct(A4);
  const hr = [...server.rooms.values()].find(r => r.hunt).g.hunt.hs.badger;
  assert.equal(hr.burrowed, true);
  assert.equal(c.burrow.idx, hr.p[1] * COLS + hr.p[0], 'the burrow mark is on the badger\'s square');
  assert.ok(life(c.burrow) <= 820 && life(c.sink) <= 820, 'burrow marks last at most 0.8 s: ' + [life(c.burrow), life(c.sink)]);
  assert.deepEqual(Object.keys(c).filter(k => KINDS.includes(k)).sort(), ['burrow', 'sink'], 'the badger saw only burrow marks');
  await Y.waitForTimeout(100); await none(Y, 'the hyena during the badger\'s burrow');
  await gone(A4, 'badger burrow');
  const bur = await A4.evaluate(() => { const e = document.querySelector('.pc.ph.bur.mine'); return !!e && parseFloat(getComputedStyle(e).opacity) >= 0.9 && e.getAnimations().length === 0; });
  assert.ok(bur, 'mound is whole and still afterwards');

  // ---------------------------------------------------------------- 3) reduced motion: still marked, but short and with no flight
  const RV = await mk({ reducedMotion: 'reduce' });
  await RV.goto(U); await RV.click('#playSolo'); await RV.click('[data-bots="1"]'); await RV.click('#soloGo');
  await RV.click('[data-role="red"]'); await RV.click('#startGame'); await RV.waitForSelector('#board .cell');
  await myTurn(RV);
  const rr = [...server.rooms.values()].find(r => r.g && r.ai && !r.three && !r.hunt && !r.team), rg = rr.g;
  rg.vulture = [4, 1]; rg.stones = 0; server.broadcast(rr);
  await RV.waitForFunction(() => UI._S().stones === 0 && UI._S().vulture[1] === 1);
  await reset(RV);
  await cell(RV, 4, 0).click();
  await RV.waitForFunction(() => window.__ct.pick, null, { timeout: 3000 });
  assert.equal(await RV.evaluate(() => getComputedStyle(document.querySelector('#stats .hs')).animationName), 'fxfade', 'reduced motion: a fade, not a pop');
  await RV.waitForTimeout(900);
  c = await ct(RV);
  assert.ok(life(c.pick) < 400, 'reduced motion: shortened to ' + life(c.pick) + ' ms');
  assert.ok(!c.stone, 'reduced motion: no flying stone');

  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-cause'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
