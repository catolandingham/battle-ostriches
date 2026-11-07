// T4: a vulture with no stone is told, every turn, where to get one. WebKit iPhone 13, vs computer, human vulture.
// Throws the stone, flies with no stone (both rock piles glow, exact hint, "Throw stone (none)" disabled), lands on a found egg
// with no stone, then lands on a rock pile ("Picked up a stone.", glow gone). Guides are left ON to prove the one-time guide is gone.
// Reads the server's game (server.rooms) only to choose squares; every move is a real tap.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 3970; process.env.BO_BOTMS = '500'; process.env.BO_NOSTORE = '1';
const server = require('./server.js'), B = require('./game.js');
const OUT = 'shots/stone/'; fs.mkdirSync(OUT, { recursive: true });
const U = 'http://localhost:3970/';
const NO_STONE = 'No stone. Land on a glowing rock pile to pick one up.';
const FOUND = 'You found an egg, but you have no stone. Get one, then come back.';
const THEMES = ['classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];
(async () => {
  const b = await webkit.launch(), errs = [];
  const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
  await P.addInitScript(() => { localStorage.setItem('bo_card_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue', '1'); localStorage.setItem('bo_walk_red', '1'); localStorage.setItem('bo_tips_off', '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
  P.on('pageerror', e => errs.push(e.message));
  await P.goto(U);
  await P.click('#playSolo'); await P.click('[data-bots="1"]'); await P.click('#soloGo');
  await P.click('[data-role="red"]'); await P.click('#startGame'); // the Vulture card, then Start
  await P.waitForSelector('#board .cell');
  const game = () => [...server.rooms.values()].find(r => r.g && !r.three && !r.hunt && !r.team).g;
  const key = p => p[0] + ',' + p[1];
  const myTurn = async () => { await P.waitForFunction(() => { const S = UI._S(); return S && (S.phase === 'over' || (S.myTurn && S.phase === 'play' && !UI._locked())); }, null, { timeout: 20000 }); await P.waitForTimeout(150); const S = await P.evaluate(() => UI._S()); assert.notEqual(S.phase, 'over', 'game ended early'); return S; };
  const cellAt = (S, p) => P.locator('#board .cell').nth(p[1] * S.cfg.cols + p[0]);
  const hint = () => P.evaluate(() => document.getElementById('hint').textContent.trim());
  // every own-turn hint carries the app's 'YOUR TURN · ' lead; the line under test is what follows it
  const turnHint = async () => (await hint()).replace(/^YOUR TURN · /, '');
  const dist = (a, q) => Math.max(Math.abs(a[0] - q[0]), Math.abs(a[1] - q[1]));
  // what the phone shows for the rock piles and the Throw button right now
  // the action buttons are redrawn on each state; wait until the Throw button is on screen before reading it
  const look = async S => { await P.waitForFunction(() => [...document.querySelectorAll('#actions button')].some(x => /Throw/.test(x.textContent)), null, { timeout: 5000 }); return P.evaluate(rocks => {
    const cs = [...document.querySelectorAll('#board .cell')], cols = rocks.cols;
    const glow = cs.map((e, i) => e.classList.contains('rockcall') ? i : -1).filter(i => i >= 0);
    const th = [...document.querySelectorAll('#actions button')].find(x => /Throw/.test(x.textContent));
    const after = e => { const a = getComputedStyle(e, '::after'); return { content: a.content, bw: a.borderTopWidth, pos: a.position }; };
    return { glow, want: rocks.list.map(p => p[1] * cols + p[0]), th: th.textContent.trim(), thDis: th.disabled, thOpacity: getComputedStyle(th).opacity,
      ring: glow.length ? after(cs[glow[0]]) : null, legalOnRock: rocks.list.map(p => cs[p[1] * cols + p[0]].classList.contains('legal')),
      guide: document.querySelectorAll('#hint.guide,#skipGuide,.gtarget,.gpath').length };
  }, { list: S.cfg.rocks, cols: S.cfg.cols }); };
  const assertNoStoneTurn = async (S, label) => {
    assert.equal(S.stones, 0, label + ': no stone');
    const L = await look(S), h = await turnHint();
    assert.deepEqual(L.glow.sort((a, c) => a - c), L.want.sort((a, c) => a - c), label + ': both rock piles glow: ' + JSON.stringify(L));
    assert.equal(L.glow.length, 2, label + ': exactly two glowing piles');
    assert.equal(L.guide, 0, label + ': no one-time guide on screen');
    assert.equal(L.ring.content !== 'none' && L.ring.pos === 'absolute' && parseFloat(L.ring.bw) >= 3, true, label + ': the glow ring is drawn: ' + JSON.stringify(L.ring));
    assert.equal(L.th, 'Throw stone (none)', label + ': Throw button text'); assert.ok(L.thDis, label + ': Throw button disabled'); assert.ok(parseFloat(L.thOpacity) < 0.8, label + ': Throw looks disabled (opacity ' + L.thOpacity + ')');
    return { L, h };
  };
  const flyToward = async (S, target) => { // the legal square nearest the target that is not an egg
    const legal = await P.evaluate(() => UI._legal()), g = game();
    const eggs = new Set(B.aliveEggs(g).filter(e => e.pos).map(e => key(e.pos)));
    const pick = legal.filter(p => !eggs.has(key(p))).sort((a, c) => dist(a, target) - dist(c, target))[0];
    await cellAt(S, pick).click(); return pick;
  };

  // 1) turn 1: the vulture has its stone. No glow, "Throw stone · 1/1".
  let S = await myTurn();
  assert.equal(S.stones, 1);
  let L = await look(S); assert.deepEqual(L.glow, [], 'stone in hand: no rock glow'); assert.equal(L.th, 'Throw stone · 1/1'); assert.equal(L.thDis, false);
  assert.ok(!/No stone/.test(await hint()), 'stone in hand: hint does not say no stone');
  await P.click('#actions button:has-text("Throw")', { force: true });
  const tgt = (await P.evaluate(() => UI._legal()))[0]; await cellAt(S, tgt).click(); // throw the one stone (may smash or miss)

  // 2) two turns with no stone: fly toward the nearest rock pile without landing on it
  const rocks = S.cfg.rocks;
  for (const n of [1, 2]) {
    S = await myTurn(); const { h } = await assertNoStoneTurn(S, 'no-stone turn ' + n);
    if (S.marks[key(S.vulture)] !== 'spotted') assert.equal(h, NO_STONE, 'no-stone turn ' + n + ': the hint is exactly the line');
    if (n === 1) await P.screenshot({ path: OUT + '1-no-stone-glow.jpg', type: 'jpeg', quality: 85 });
    const near = rocks.slice().sort((a, c) => dist(a, S.vulture) - dist(c, S.vulture))[0];
    const legal = await P.evaluate(() => UI._legal()), eggs = new Set(B.aliveEggs(game()).filter(e => e.pos).map(e => key(e.pos))), isRock = p => rocks.some(r => key(r) === key(p));
    const pick = legal.filter(p => !eggs.has(key(p)) && !isRock(p)).sort((a, c) => dist(a, near) - dist(c, near))[0];
    await cellAt(S, pick).click();
  }

  // 3) glow readable in every theme: the ring is drawn the same way under all 13 themes (checked on this turn's board)
  S = await myTurn(); await assertNoStoneTurn(S, 'before the found egg');
  for (const t of THEMES) {
    await P.evaluate(t => document.documentElement.setAttribute('data-theme', t), t);
    const r = await P.evaluate(() => { const e = document.querySelector('#board .cell.rockcall'); const a = getComputedStyle(e, '::after'); return { content: a.content, w: a.borderTopWidth, color: a.borderTopColor, shadow: a.boxShadow !== 'none', op: a.opacity, vis: a.visibility, n: document.querySelectorAll('#board .cell.rockcall').length }; });
    assert.ok(r.content !== 'none' && parseFloat(r.w) >= 3 && r.n === 2 && r.op === '1' && r.vis === 'visible' && r.shadow, t + ' ring: ' + JSON.stringify(r));
  }
  await P.evaluate(() => document.documentElement.setAttribute('data-theme', 'classic'));

  // 4) land on a found egg with no stone. Put an egg one flight away (the computer ostrich hid it somewhere we cannot reach), then fly onto it.
  const g = game(), fly = B.flyTargets(g).filter(p => !B.isRock(g, p) && !B.isFood(g, p) && !g.marks[key(p)] && !B.eggAt(g, p) && key(p) !== key(g.ostrich));
  const egg = g.eggs.find(e => e.alive && g.carrying !== e.id); assert.ok(egg && fly.length, 'an egg to place and a free square');
  egg.pos = fly[0].slice();
  await cellAt(S, egg.pos).click();
  await P.waitForFunction(f => document.getElementById('hint').textContent.includes(f), FOUND, { timeout: 5000 });
  assert.ok((await hint()).startsWith(FOUND), 'landing on an egg with no stone: ' + await hint());
  await P.screenshot({ path: OUT + '2-found-egg-no-stone.jpg', type: 'jpeg', quality: 85 });
  assert.equal((await P.textContent('#banner')).trim(), 'Found egg!');

  // 5) keep flying with no stone until a rock pile is in reach, checking every turn; then land on it
  let landed = false, sawFoundAgain = false;
  for (let turn = 0; turn < 8 && !landed; turn++) {
    S = await myTurn(); const { h } = await assertNoStoneTurn(S, 'search turn ' + turn);
    if (S.marks[key(S.vulture)] === 'spotted') { assert.equal(h, FOUND, 'still on the found egg, own turn'); sawFoundAgain = true; }
    else assert.equal(h, NO_STONE, 'search turn ' + turn + ': the hint is exactly the line');
    const legal = await P.evaluate(() => UI._legal()), rock = legal.find(p => rocks.some(r => key(r) === key(p)));
    if (rock) { await cellAt(S, rock).click(); landed = true; }
    else await flyToward(S, rocks.slice().sort((a, c) => dist(a, S.vulture) - dist(c, S.vulture))[0]);
  }
  assert.ok(landed, 'reached a rock pile');
  await P.waitForFunction(() => document.getElementById('hint').textContent.includes('Picked up a stone.'), null, { timeout: 5000 });
  assert.ok((await hint()).startsWith('Picked up a stone.'), 'hint: ' + await hint());
  assert.equal(await P.textContent('#stonesLeft'), '1/1');
  assert.equal(await P.locator('#board .cell.rockcall').count(), 0, 'glow gone after pickup');
  await P.screenshot({ path: OUT + '3-picked-up.jpg', type: 'jpeg', quality: 85 });

  // 6) next vulture turn: stone in hand, no glow, Throw enabled again, the hint is the normal fly line
  S = await myTurn(); assert.equal(S.stones, 1);
  L = await look(S); assert.deepEqual(L.glow, []); assert.equal(L.th, 'Throw stone · 1/1'); assert.equal(L.thDis, false);
  assert.match(await turnHint(), /^Tap a glowing square to fly\. Tap yourself to Throw\./);
  assert.ok(!/Out of stones/.test(await P.textContent('body')), 'the old guide text is gone');
  console.log('found egg seen again on a later own turn:', sawFoundAgain, '| errors', errs);
  assert.equal(errs.length, 0);
  await b.close(); server.close();
  console.log('PASS e2e-stone'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
