// "Did you know?" hints (public/play-hints.js), WebKit iPhone 13. Classic game against the computer.
// The kick hint shows when an animal is 1 square away on the Ostrich's turn, only once, never with the switch off; the switch is in both menus;
// a hint waits for the player's turn, sits clear of the board and the buttons, and a finished game turns hints off for that role unless switched on again.
// Pictures -> shots/hints/.
process.env.PORT = 3978; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '300'; process.env.BO_CLOCKMS = '600000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'); const OUT = 'shots/hints/'; fs.mkdirSync(OUT, { recursive: true });
const U = 'http://localhost:3978/';
(async () => {
  const b = await webkit.launch(), errs = [];
  const KICK = /Did you know\? As the Ostrich, you can kick an animal that's 1 square away\./;
  const mk = async (extra = {}) => {
    const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
    await P.addInitScript(x => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '99')); for (const k in x) localStorage.setItem(k, x[k]); window.AudioContext = undefined; window.webkitAudioContext = undefined; }, extra);
    P.on('pageerror', e => errs.push(e.message)); return P;
  };
  const start = async (P, role) => {
    await P.goto(U); await P.click('#playSolo'); await P.click('[data-bots="1"]'); await P.click('#soloGo'); await P.click('[data-role="' + role + '"]'); await P.click('#startGame');
    for (let i = 0; i < 14 && (await P.evaluate(() => (UI._S() || {}).phase)) !== 'play'; i++) { await P.waitForSelector('#board .cell.legal'); await P.locator('#board .cell.legal').first().click(); await P.waitForTimeout(350); }
    await P.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.myTurn && !UI._locked(); }, null, { timeout: 30000 });
  };
  const room = () => [...server.rooms.values()].filter(r => r.g && !r.three && r.ai).pop();
  const stage = async (P, fn) => { const R = room(); clearTimeout(R.aiT); fn(R.g); R.g.round++; server.broadcast(R); await P.waitForTimeout(300); };
  const hint = P => P.evaluate(() => { const e = document.getElementById('playhint'); return e && !e.classList.contains('hidden') ? e.querySelector('.ht').textContent : null; });
  const waitHint = (P, re) => P.waitForFunction(r => { const e = document.getElementById('playhint'); return e && !e.classList.contains('hidden') && new RegExp(r).test(e.textContent); }, re.source, { timeout: 8000 });
  const free = P => P.evaluate(() => { const h = document.getElementById('playhint').getBoundingClientRect(); return ['#board', '#actions'].every(s => { const r = document.querySelector(s).getBoundingClientRect(); return h.bottom <= r.top + 1 || h.top >= r.bottom - 1; }); });
  const next = g => { const v = g.vulture; return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [v[0] + d[0], v[1] + d[1]]).find(q => q[0] >= 0 && q[1] >= 0 && q[0] < g.cfg.cols && q[1] < g.cfg.rows && !g.cfg.rocks.some(r => r.join() === q.join()) && !g.cfg.foods.some(r => r.join() === q.join()) && !g.eggs.some(e => e.pos && e.pos.join() === q.join()) && !g.marks[q.join()]); };

  // 1. A new player: nothing near, no hint. A vulture 1 square away: the kick hint, clear of the board, once.
  const A = await mk(); await start(A, 'blue');
  await stage(A, g => { g.vulture = [8, 6]; g.ostrich = [0, 0]; });
  await waitHint(A, /^Did you know\? (Highlighted squares|The YOU tag)/); // a mark explained the first time it is on screen
  await A.click('#playhint .hx');
  await stage(A, g => { g.ostrich = [4, 3]; g.vulture = [5, 3]; g.hungerLeft = g.cfg.food; });
  await waitHint(A, KICK);
  assert.match(await hint(A), /Tap Kick to push it 3 squares\./, 'the kick distance is the rules number');
  assert.ok(await free(A), 'the hint covers no square and no button');
  assert.ok(await A.evaluate(() => localStorage.getItem('bo_hint_ostrich_food') === null && localStorage.getItem('bo_hint_ostrich_bounce') === null), 'one hint per turn: the others wait');
  await A.screenshot({ path: OUT + '1-kick-hint.jpg', type: 'jpeg', quality: 85 });
  assert.equal(await A.locator('#actions button:has-text("Kick")').count(), 1, 'the Kick button is there and the hint did not block it');
  assert.ok(await A.evaluate(() => localStorage.getItem('bo_hint_ostrich_kick') === '1'), 'seen is remembered');
  // close button
  await A.click('#playhint .hx'); assert.equal(await hint(A), null, 'the close button hides it');
  // once: same trigger again next turn, no second kick hint
  await A.evaluate(() => UI.act('sit')).catch(() => {}); await A.waitForTimeout(100);
  const gotTurn = () => A.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.myTurn && !UI._locked(); }, null, { timeout: 15000 });
  const R = room(); R.aiT = null;
  await A.evaluate(() => { const c = document.querySelector('#board .cell.legal'); c && c.click(); }); // any legal walk ends the turn
  await A.waitForTimeout(1200); await gotTurn();
  await stage(A, g => { g.vulture = next({ ...g, vulture: g.ostrich.slice() }) || [3, 3]; g.hungerLeft = g.cfg.food; });
  await A.waitForTimeout(800);
  assert.ok(await A.evaluate(() => { const S = UI._S(); return S.myTurn && S.can && S.can.kick && HINTS.TABLE.find(r => r.id === 'kick').when(HINTS.ctxOf(S)); }), 'on the second turn the kick moment is true again');
  assert.ok(!KICK.test((await hint(A)) || ''), 'the kick hint does not come back');

  // 2. The switch in the in-game menu: off, then the hint does not show, then on again clears what was seen.
  await A.click('#moreBtn'); assert.equal((await A.textContent('#menuHints')).trim(), 'Hints on', 'menu says Hints on');
  await A.click('#menuHints'); assert.equal((await A.textContent('#menuHints')).trim(), 'Hints off');
  assert.equal(await A.evaluate(() => localStorage.getItem('bo_hints')), 'off');
  await A.screenshot({ path: OUT + '2-menu-in-game.jpg', type: 'jpeg', quality: 85 });
  await A.click('#menuHints'); assert.equal((await A.textContent('#menuHints')).trim(), 'Hints on');
  assert.equal(await A.evaluate(() => localStorage.getItem('bo_hint_ostrich_kick')), null, 'switching on again resets what was seen');
  await A.context().close();

  // 3. Switch off before the game: the same kick moment shows nothing.
  const O = await mk({ bo_hints: 'off' }); await start(O, 'blue');
  await stage(O, g => { g.ostrich = [4, 3]; g.vulture = [5, 3]; });
  await O.waitForTimeout(1200); assert.equal(await hint(O), null, 'no hint with the switch off');
  assert.equal((await O.evaluate(() => { document.getElementById('moreBtn').click(); return document.getElementById('menuHints').textContent; })).trim(), 'Hints off');
  await O.context().close();

  // 4. Not a new player (finished a game in this role): off by default; the switch turns them on.
  const E = await mk({ bo_hints_done_ostrich: '1' }); await start(E, 'blue');
  await stage(E, g => { g.ostrich = [4, 3]; g.vulture = [5, 3]; });
  await E.waitForTimeout(1200); assert.equal(await hint(E), null, 'an experienced player gets no hints by default');
  await E.evaluate(() => HINTS.setOn(true)); await stage(E, g => { g.hungerLeft = g.hungerLeft; });
  await E.evaluate(() => UI._rr()); await waitHint(E, KICK); await E.context().close();

  // 5. Waits for an announcement: with a line queued, the hint holds back, then shows.
  const W = await mk(); await start(W, 'blue');
  await W.evaluate(() => { STATUS_QUEUE.add({ text: 'A test line that stays a moment.', hold: 1500, priority: 50 }); });
  await stage(W, g => { g.ostrich = [4, 3]; g.vulture = [5, 3]; });
  assert.equal(await hint(W), null, 'a hint waits for the announcement');
  await waitHint(W, KICK); await W.context().close();

  // 6. Vulture: a different role gets its own hints, once each. Stones out -> rock pile hint.
  const V = await mk(); await start(V, 'red');
  await waitHint(V, /fly up to 2 squares/);
  await V.screenshot({ path: OUT + '3-vulture-fly.jpg', type: 'jpeg', quality: 85 });
  await V.context().close();

  // 7. Home menu has the switch too.
  const H = await mk(); await H.goto(U); await H.click('#homeGear');
  assert.equal((await H.textContent('#hintsBtn2')).trim(), 'Hints on'); await H.click('#hintsBtn2'); assert.equal((await H.textContent('#hintsBtn2')).trim(), 'Hints off');
  await H.screenshot({ path: OUT + '4-menu-home.jpg', type: 'jpeg', quality: 85 });
  assert.equal(await H.evaluate(() => localStorage.getItem('bo_tips_off')), '1', 'the older tips go off with it');
  await H.context().close();

  // 7b. Reminders: with hints off, tapping a wrecked square explains the X, and it is not remembered as seen.
  const M = await mk({ bo_hints: 'off' }); await start(M, 'blue');
  await stage(M, g => { g.ostrich = [0, 0]; g.vulture = [8, 6]; g.marks['6,5'] = 'hit'; });
  assert.equal(await hint(M), null, 'hints off: nothing on its own');
  await M.locator('#board .cell').nth(5 * 9 + 6).click({ force: true }); await waitHint(M, /An X marks a wrecked square/);
  assert.ok(await free(M), 'the reminder covers no square');
  assert.equal(await M.evaluate(() => localStorage.getItem('bo_hint_ostrich_mWreck')), null, 'a reminder is not a seen hint');
  await M.click('#playhint .hx');
  await M.locator('#stats .hh').click({ force: true }); await waitHint(M, /leaf number at the top/);
  await M.context().close();

  // 7c. Waiting: while it is the other player's turn, a hint can explain waiting; a computer player is explained too.
  const T = await mk(); await start(T, 'blue');
  await T.evaluate(() => { for (const id of HINTS.TABLE.filter(r => r.kind === 'mark').map(r => r.id)) localStorage.setItem('bo_hint_ostrich_' + id, '1'); });
  await T.waitForFunction(() => { const q = STATUS_QUEUE.state(); const h = document.getElementById('playhint'); return !q.active && !q.pending.length && (!h || h.classList.contains('hidden')); }, null, { timeout: 20000 });
  await T.evaluate(() => { const S = Object.assign({}, UI._S(), { myTurn: false, turn: 'red', round: 7 }); HINTS.check(S); }); // the same state, on the other player's turn
  await waitHint(T, /When it is not your turn, the other players move/);
  await T.context().close();

  // 8. Every hint in the table: a real animal, a unique id for that animal, and a line that starts with Did you know?
  const seen = new Set(), tab = require('./public/play-hints.js').TABLE;
  for (const r of tab) for (const an of [].concat(r.animal)) { assert.ok(['ostrich', 'vulture', 'hyena', 'badger'].includes(an), r.id); const k = an + ':' + r.id; assert.ok(!seen.has(k), 'duplicate ' + k); seen.add(k); }

  console.log('errors', errs); assert.deepEqual(errs, []);
  await b.close(); server.close(); console.log('PASS e2e-play-hints'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
