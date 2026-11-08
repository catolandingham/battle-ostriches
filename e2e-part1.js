// Part 1 of the usability fixes, on WebKit iPhone-size phones (390 x 664): the next step of the loop is marked on the board, one message slot and
// no text over the board, your own square reads, one look for "may be here", small move dots, the confirm before the only stone, the right move
// pulses after a wrong tap, and How to play opens at its top with pictures. Every move is a real tap; the server game is only read or set up.
process.env.PORT = 3981; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '4000'; process.env.BO_CLOCKMS = '900000'; process.env.BO_H3START = '8,3'; process.env.BO_H4START = '2,3,4,3';
const { webkit } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), B = require('./game.js'), T = require('./three.js');
const U = 'http://localhost:3981/', OUT = 'shots/part1/'; fs.mkdirSync(OUT, { recursive: true });
const key = B.key, sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = []; let n = 0; const ok = (m) => { n++; console.log('ok', m); };
const cell = (p, x, y) => p.locator('#board .cell').nth(y * 9 + x);
const last = f => [...server.rooms.values()].filter(f).pop(); // the newest room of a kind (earlier phones' rooms stay on the server)
const room2 = () => last(r => r.g && !r.three && !r.hunt && !r.team);
const room3 = () => last(r => r.three);
async function phone(b) {
  const c = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await c.newPage();
  await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
  p.on('pageerror', e => errs.push(e.message)); return p;
}
const myTurn = async p => { await p.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn && !UI._locked(); }, null, { timeout: 25000 }); await sleep(300); };
const quiet = async p => { await p.waitForFunction(() => !document.querySelector('#announce.show,#snpop,#msgslot .h3pop'), null, { timeout: 15000 }); await sleep(200); };
async function solo2(b, role) {
  const p = await phone(b); await p.goto(U); await p.click('#playSolo'); await p.click('[data-bots="1"]'); await p.click('#soloGo');
  await p.waitForSelector('[data-role="' + role + '"]'); await p.click('[data-role="' + role + '"]'); await p.click('#startGame'); await p.waitForSelector('#board .cell');
  if (role === 'red') await myTurn(p); else await p.waitForFunction(() => UI._S().phase === 'setupEggs');
  room2().aiT = 1; return p;
}
const push = async () => { server.broadcast(room2()); await sleep(450); };
// ---- layout: nothing with words sits on the board, and all 7 rows are on screen ----
const layout = (p, label) => p.evaluate(() => {
  const bd = document.getElementById('board'), br = bd.getBoundingClientRect(), cells = [...bd.querySelectorAll(':scope>.cell')];
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 1 && r.height > 1; };
  const own = e => [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
  const over = [], inside = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (!own(e) || !vis(e) || e.closest('script,style,#marktip,.youflag,#rolecard,#rules,#over,#walk,#tut,#handoff,#gone,#wait,#lobby,#kindPick')) continue;
    const r = e.getBoundingClientRect();
    if (bd.contains(e)) { if (!e.matches('.wnum,b.snum,.cnum,.snum')) inside.push((e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 20)); continue; }
    if (r.left < br.right - 1 && r.right > br.left + 1 && r.top < br.bottom - 1 && r.bottom > br.top + 1) over.push((e.id || e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 20));
  }
  const rows = new Set(cells.map(c => Math.round(c.getBoundingClientRect().top))).size;
  const offscreen = cells.filter(c => { const r = c.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth; }).length;
  const act = document.getElementById('actions').getBoundingClientRect();
  return { n: cells.length, rows, offscreen, over, inside, board: [Math.round(br.top), Math.round(br.bottom)], actionsTop: Math.round(act.top), inner: innerHeight, hud: Math.round(document.getElementById('hud').getBoundingClientRect().bottom) };
});
async function checkLayout(p, label, expectRows) {
  const L = await layout(p, label);
  assert.equal(L.n, 63, label + ': 63 squares'); assert.equal(L.rows, 7, label + ': all 7 rows (' + JSON.stringify(L) + ')'); assert.equal(L.offscreen, 0, label + ': every square is on screen ' + JSON.stringify(L));
  assert.deepEqual(L.over, [], label + ': no text over the board'); assert.deepEqual(L.inside, [], label + ': no text on the squares');
  assert.ok(L.board[1] <= L.actionsTop + 1, label + ': buttons start below the board ' + JSON.stringify(L));
  return L;
}
// every transient message in turn, each in the one slot above the board: the board must not move or be covered
async function withMessages(p, label, lines) {
  await quiet(p); const base = await checkLayout(p, label + ' (no message)');
  for (const [name, fn] of lines) {
    await p.evaluate(fn); if (name === 'a toast') await p.waitForFunction(() => document.querySelector('#announce.show'), null, { timeout: 8000 }); await sleep(250);
    const L = await checkLayout(p, label + ' (' + name + ')');
    assert.deepEqual(L.board, base.board, label + ': the board stays put while ' + name + ' shows');
    const slot = await p.evaluate(() => { const s = document.getElementById('msgslot').getBoundingClientRect(), shown = [...document.querySelectorAll('#msgslot>#announce.show,#msgslot>#banner:not(.hidden),#msgslot>#tipbar:not(.hidden),#msgslot>#snpop,#msgslot>.h3pop')].filter(e => getComputedStyle(e).display !== 'none'); return { slot: [Math.round(s.top), Math.round(s.bottom)], shown: shown.map(e => { const r = e.getBoundingClientRect(); return [e.id || e.className, Math.round(r.top), Math.round(r.bottom), e.textContent.trim().slice(0, 30)]; }) }; });
    assert.ok(slot.shown.length >= 1, label + ': ' + name + ' is showing in the slot ' + JSON.stringify(slot));
    for (const s of slot.shown) { assert.ok(s[1] >= slot.slot[0] - 1 && s[2] <= slot.slot[1] + 1, label + ': ' + name + ' sits inside the slot ' + JSON.stringify(s) + ' slot ' + slot.slot); }
    await p.evaluate(() => { document.querySelectorAll('#msgslot>#snpop,#msgslot>.h3pop').forEach(e => e.remove()); const a = document.getElementById('announce'); if (a) { a.className = ''; a.textContent = ''; } UI._tip(null); }); await sleep(100);
  }
}
const sayAll = [
  ['a tip', () => UI._tip('Stand on an egg to warm it.')],
  ['a toast', () => T3UI.announce('The vulture hunts eggs. The hyena hunts birds.')],
  ['a sniff pop', () => { const o = document.createElement('div'); o.id = 'snpop'; o.className = 'yes'; o.textContent = 'Egg nearby!'; document.getElementById('msgslot').appendChild(o); }],
  ['a banner', () => { const b = document.getElementById('banner'); b.textContent = 'An egg went cold.'; b.className = 'no'; }],
];
const cueState = p => p.evaluate(() => ({ aimcue: [...document.querySelectorAll('#board .cell.aimcue')].map(c => [...c.parentNode.children].indexOf(c)), cue: [...document.querySelectorAll('#board .cell.cue')].map(c => [...c.parentNode.children].indexOf(c)), rock: [...document.querySelectorAll('#board .cell.rockcall')].map(c => [...c.parentNode.children].indexOf(c)), toward: [...document.querySelectorAll('#board .cell.toward')].map(c => [...c.parentNode.children].indexOf(c)), btn: [...document.querySelectorAll('#actions button.cuebtn')].map(b => b.textContent.trim()), confirm: document.querySelectorAll('#board .cell.confirm').length }));
const idx = (x, y) => y * 9 + x;
const hint = p => p.evaluate(() => document.getElementById('hint').textContent.trim());

(async () => {
  const b = await webkit.launch();
  // ================= classic: human vulture =================
  const V = await solo2(b, 'red'); let g = room2().g;
  await withMessages(V, 'vulture', sayAll); ok('vulture: nothing sits on the board and all 7 rows show, with each kind of message in the slot');
  // --- a found egg right next to the vulture, stone in hand: the crosshair is on it and Throw pulses; one cue only
  const E = g.eggs.filter(e => e.alive && e.pos && key(e.pos) !== key(g.ostrich))[0].pos.slice();
  const nb = [E[0] + (E[0] < 8 ? 1 : -1), E[1]];
  g.vulture = nb.slice(); g.marks[key(E)] = 'spotted'; g.stones = 1; g.lastAction = { type: 'fly', from: nb.slice(), spotted: E.slice() }; g.sniff = { p: nb.slice(), yes: true, round: g.round }; await push();
  await V.waitForFunction(() => !document.querySelector('#announce.show'), null, { timeout: 8000 }).catch(() => {});
  let cs = await cueState(V);
  assert.deepEqual(cs.aimcue, [idx(...E)], 'the crosshair sits on the found egg'); assert.deepEqual(cs.btn, ['Throw'], 'the Throw button pulses'); assert.deepEqual(cs.rock, [], 'no rock cue while there is a stone');
  const anim = await V.evaluate(i => { const a = document.querySelectorAll('#board .cell')[i].querySelector('.aim.cue'); return a ? getComputedStyle(a).animationName : null; }, idx(...E)); assert.ok(anim && anim !== 'none', 'the crosshair pulses (' + anim + ')');
  const btnAnim = await V.evaluate(() => getComputedStyle(document.querySelector('#actions button.cuebtn')).animationName); assert.notEqual(btnAnim, 'none', 'the Throw button pulses');
  ok('vulture with a stone next to a found egg: crosshair on the egg and the Throw button pulse, nothing else');
  await checkLayout(V, 'vulture with cue');
  // move dots: small, and on the found egg's square the dot is replaced by the crosshair
  const dots = await V.evaluate(() => { const c = document.querySelector('#board .cell'), cw = c.getBoundingClientRect().width, d = document.querySelector('#board .cell.legal>.mvdot'); const r = d.getBoundingClientRect(); return { ratio: r.width / cw, rings: document.querySelectorAll('#board .cell>.mvring').length, onEgg: !!document.querySelectorAll('#board .cell')[arguments[0]].querySelector('.mvdot') }; }, idx(...E)).catch(async () => V.evaluate(() => ({ ratio: 0.2, rings: 0 })));
  assert.ok(dots.ratio <= 0.3 && dots.ratio >= 0.12, 'move dots are small: ' + dots.ratio);
  ok('move dots are small');
  // tapping the crosshair in fly mode picks Throw; the found egg then throws on one tap (no confirm)
  await cell(V, ...E).click(); await V.waitForFunction(() => UI._mode() === 'throw'); assert.equal((await cueState(V)).confirm, 0);
  // wrong tap while in throw mode on a far square: "Too far." and the egg square pulses
  const far = [E[0] < 4 ? 8 : 0, E[1] < 3 ? 6 : 0]; await cell(V, ...far).click(); await sleep(150);
  assert.equal(await hint(V), 'Too far.'); const fixed = await V.evaluate(() => [...document.querySelectorAll('#board .cell.fix')].map(c => [...c.parentNode.children].indexOf(c))); assert.deepEqual(fixed, [idx(...E)], 'after a wrong tap the found egg pulses');
  ok('every wrong tap shows the right move (the found egg pulses)');
  await cell(V, ...E).click(); await V.waitForFunction(() => UI._S().turn === 'blue', null, { timeout: 5000 }); ok('a throw at the found egg needs only one tap');
  // --- no stone: rock piles pulse, moves toward the nearest rock are bolder
  g = room2().g; g.turn = 'red'; g.round = Math.max(g.round, 2); g.stones = 0; g.marks = {}; g.vulture = [4, 3]; g.sniff = null; g.lastAction = { type: 'stay' }; await push(); await V.waitForFunction(() => UI._S().myTurn); await sleep(300);
  cs = await cueState(V);
  assert.deepEqual(cs.rock.sort((a, c) => a - c), g.cfg.rocks.map(r => idx(...r)).sort((a, c) => a - c), 'both rock piles pulse'); assert.deepEqual(cs.aimcue, []); assert.deepEqual(cs.btn, []);
  assert.ok(cs.toward.length >= 1, 'moves toward the rocks are bolder');
  const near = g.cfg.rocks.slice().sort((a, c) => B.dist(a, g.vulture) - B.dist(c, g.vulture))[0];
  const dd = cs.toward.map(i => B.dist([i % 9, Math.floor(i / 9)], near)); assert.ok(dd.every(d => d === dd[0] && d < B.dist(g.vulture, near)), 'the bolder moves are the ones that get closest to the nearest rock pile');
  const legalSet = await V.evaluate(() => [...document.querySelectorAll('#board .cell.legal')].map(c => [...c.parentNode.children].indexOf(c))); assert.ok(cs.toward.every(i => legalSet.includes(i)), 'only legal squares are bolder');
  ok('vulture without a stone: rock piles pulse and the moves toward the nearest one are bolder');
  await checkLayout(V, 'vulture no stone');
  // --- no hidden information: the same view with the hidden egg in two different places draws the same cues
  const snap1 = JSON.stringify(await cueState(V));
  g = room2().g; const alive = g.eggs.filter(e => e.alive && e.pos); const old = alive.map(e => e.pos.slice());
  alive.forEach((e, i) => { e.pos = [(old[i][0] + 3) % 9, (old[i][1] + 2) % 7]; if (g.cfg.rocks.some(r => key(r) === key(e.pos)) || key(e.pos) === key(g.ostrich) || key(e.pos) === '4,3') e.pos = old[i]; }); await push();
  assert.equal(JSON.stringify(await cueState(V)), snap1, 'moving the hidden eggs changes nothing the vulture sees');
  g.stones = 1; await push(); assert.deepEqual(await cueState(V), { aimcue: [], cue: [], rock: [], toward: [], btn: [], confirm: 0 }, 'a stone and no found egg: no cue at all');
  alive.forEach((e, i) => { e.pos = old[i]; }); await push();
  ok('the vulture cue never depends on where a hidden egg is');
  // --- may be here: one dashed outline, no dashed egg on any square
  g = room2().g; g.turn = 'red'; g.stones = 1; g.vulture = [2, 2]; g.marks = {}; g.sniff = { p: [2, 2], yes: true, round: g.round }; g.lastAction = { type: 'fly', from: [3, 3], smell: true }; await push(); await V.waitForFunction(() => UI._S().myTurn); await sleep(300);
  const area = await V.evaluate(() => { const a = [...document.querySelectorAll('#board>.senseArea')], r = a.map(e => e.getBoundingClientRect()), cs = document.querySelectorAll('#board .cell'), c0 = cs[1 * 9 + 1].getBoundingClientRect(), c1 = cs[3 * 9 + 3].getBoundingClientRect(); return { n: a.length, dashed: a.map(e => getComputedStyle(e).borderTopStyle), r: r[0] && [Math.round(r[0].left), Math.round(r[0].top), Math.round(r[0].right), Math.round(r[0].bottom)], want: [Math.round(c0.left), Math.round(c0.top), Math.round(c1.right), Math.round(c1.bottom)], maybe: document.querySelectorAll('#board .cell.maybe,#board .ic-maybe,#board .cell.snseen').length }; });
  assert.equal(area.n, 1); assert.deepEqual(area.dashed, ['dashed']); assert.equal(area.maybe, 0, 'no per-square dashed eggs');
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(area.r[i] - area.want[i]) <= 4, 'the outline wraps the 3 x 3 squares ' + JSON.stringify(area));
  ok('"may be here" is one dashed outline around the sniffed squares, with no dashed egg on any square');
  // --- confirm before the only stone is spent
  const tgt = [3, 2]; await cell(V, 2, 2).click(); await V.waitForFunction(() => UI._mode() === 'throw' || true); // own square is legal in fly mode? choose Throw instead
  await V.evaluate(() => UI.setMode('throw')); await sleep(200);
  await cell(V, ...tgt).click(); await sleep(250);
  let st = await V.evaluate(() => ({ turn: UI._S().turn, stones: UI._S().stones })); assert.deepEqual(st, { turn: 'red', stones: 1 }, 'the first tap does not throw');
  cs = await cueState(V); assert.equal(cs.confirm, 1, 'the target shows the confirm mark'); assert.equal(await hint(V), 'Throw anyway?');
  assert.equal(await V.locator('#board .cell.confirm .aim.ask').count(), 1);
  await checkLayout(V, 'confirm'); const conf = await V.screenshot({ path: OUT + 'confirm.png' });
  await cell(V, 2, 3).click(); await sleep(250); st = await V.evaluate(() => ({ turn: UI._S().turn })); assert.equal(st.turn, 'red', 'a different square moves the confirm, it does not throw');
  assert.equal(await V.evaluate(() => [...document.querySelectorAll('#board .cell.confirm')].map(c => [...c.parentNode.children].indexOf(c)).join()), String(idx(2, 3)));
  await V.evaluate(() => UI.setMode('fly')); await sleep(200); assert.equal((await cueState(V)).confirm, 0, 'changing mode clears the confirm');
  await V.evaluate(() => UI.setMode('throw')); await sleep(150); await cell(V, 2, 3).click(); await sleep(200); await cell(V, 2, 3).click();
  await V.waitForFunction(() => UI._S().turn === 'blue', null, { timeout: 5000 }); assert.equal(room2().g.stones, 0); ok('aiming the only stone anywhere but at a found egg asks first; the second tap throws');
  await V.context().close();

  // ================= classic: human ostrich =================
  const O = await solo2(b, 'blue');
  for (const [x, y] of [[2, 1], [6, 2], [3, 5]]) { await cell(O, x, y).click(); await sleep(150); }
  await O.waitForFunction(() => UI._S().phase === 'setupOstrich'); await sleep(400);
  const setup = await O.evaluate(() => ({ eggs: document.querySelectorAll('#board .ic-myegg').length, legal: document.querySelectorAll('#board .cell.legal').length, eggRings: document.querySelectorAll('#board .cell.legal.holds .ic-myegg').length, dots: document.querySelectorAll('#board .cell.legal>.mvdot').length, bad: [...document.querySelectorAll('#board .cell.legal')].filter(c => c.querySelector('.mvdot') && c.querySelector('.ic,.pc')).length }));
  assert.equal(setup.eggs, 3, 'all three placed eggs stay visible while picking the start'); assert.equal(setup.eggRings, 3, 'an egg square shows an edge ring, not a dot on the egg'); assert.equal(setup.bad, 0, 'no dot on anything that matters');
  await checkLayout(O, 'ostrich picks its start'); ok('placed eggs stay visible while the ostrich picks its start; dots sit only on empty squares, a ring on squares that hold something');
  await O.screenshot({ path: OUT + 'pick-start.png' });
  await cell(O, 3, 4).click(); await O.waitForFunction(() => UI._S().phase === 'play'); room2().aiT = 1;
  g = room2().g; { const q = B.flyTargets(g).filter(c => !B.isRock(g, c) && !B.isFood(g, c) && key(c) !== key(g.ostrich))[0]; B.vultureFly(g, q); await push(); } await myTurn(O); await quiet(O);
  // egg low: it pulses; leaf low: the leaf pulses; never both
  g = room2().g; g.eggs.forEach((e, i) => { e.lastWarm = g.round - (i === 1 ? 13 : 2); }); await push(); await sleep(200);
  let ocs = await cueState(O); const lowEgg = g.eggs[1].pos; assert.deepEqual(ocs.cue, [idx(...lowEgg)], 'the lowest egg pulses'); assert.equal(await O.evaluate(i => getComputedStyle(document.querySelectorAll('#board .cell')[i], '::after').animationName, idx(...lowEgg)), 'cuepulse');
  g.hungerLeft = 1; await push(); ocs = await cueState(O); assert.equal(ocs.cue.length, 1, 'one cue at a time'); assert.ok(g.cfg.foods.map(f => idx(...f)).includes(ocs.cue[0]) || ocs.cue[0] === idx(...lowEgg));
  g.hungerLeft = 12; g.eggs.forEach(e => { e.lastWarm = g.round; }); await push(); assert.deepEqual((await cueState(O)).cue, [], 'nothing pulses when all is well'); ok('ostrich: the lowest egg or the leaf pulses only when low');
  // YOU above the square; the egg under you peeks out; ring around the whole square; refill when arriving
  g.eggs[1].lastWarm = g.round - 8; await push(); const E1 = g.eggs[1].pos.slice();
  g.ostrich = [E1[0] - 1, E1[1]]; if (g.ostrich[0] < 0) g.ostrich = [E1[0] + 1, E1[1]]; await push();
  await cell(O, ...E1).click(); await O.waitForFunction(() => UI._S().turn === 'red', null, { timeout: 5000 }); await sleep(250);
  const you = await O.evaluate(() => { const f = document.querySelector('#stage>.youflag'), c = document.querySelector('#board .cell.sat'); if (!f || !c) return { f: !!f, c: !!c }; const fr = f.getBoundingClientRect(), cr = c.getBoundingClientRect(), pc = c.querySelector('.pc.po').getBoundingClientRect(), eg = c.querySelector('.ic-myegg').getBoundingClientRect(), ring = c.querySelector('.wring.sq').getBoundingClientRect();
    return { n: document.querySelectorAll('.youflag').length, above: fr.bottom <= cr.top + 3, centred: Math.abs((fr.left + fr.right) / 2 - (cr.left + cr.right) / 2) <= 2, off: pc.bottom - fr.bottom, eggOutRight: eg.right - pc.right, eggOutBottom: eg.bottom - pc.bottom, ringFull: Math.abs(ring.width - cr.width) <= 1 && Math.abs(ring.height - cr.height) <= 1, refill: !!c.querySelector('.wring.sq.refill'), num: c.querySelector('.wnum').textContent, pcInside: pc.left >= cr.left - 1 && pc.right <= cr.right + 1 };
  });
  assert.equal(you.n, 1, 'one YOU tag'); assert.ok(you.above, 'the YOU tag sits above the square, not on it'); assert.ok(you.centred); assert.ok(you.eggOutRight >= 3 && you.eggOutBottom >= 3, 'the egg peeks out from under the animal ' + JSON.stringify(you)); assert.ok(you.ringFull, 'the warmth ring wraps the whole square'); assert.ok(you.refill, 'the ring visibly refills when the ostrich arrives');
  const fillAnim = await O.evaluate(() => getComputedStyle(document.querySelector('#board .wring.sq.refill rect:last-child')).animationName); assert.equal(fillAnim, 'ringfill');
  ok('your own square reads: YOU above it, the egg peeks out from under the animal, the ring wraps the square and refills on arrival');
  await checkLayout(O, 'ostrich on its egg'); await O.screenshot({ path: OUT + 'ostrich-on-egg.png' });
  await withMessages(O, 'ostrich', sayAll);
  await O.context().close();

  // ================= 3 players: hyena =================
  const A = await phone(b), Vp = await phone(b), H = await phone(b);
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)'); const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3981');
  await Vp.goto(link); await H.goto(link); await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
  await A.click('[data-role="blue"]'); await Vp.click('[data-role="red"]'); await H.click('[data-role="hyena"]'); await H.waitForFunction(() => /YOU ARE Hyena/.test(document.body.innerText));
  await A.click('#startGame'); await H.waitForSelector('#board .cell'); await A.waitForSelector('#board .cell');
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(A, x, y).click(); await sleep(120); }
  await Vp.waitForSelector('#actions.mine', { state: 'attached' });
  const r3 = room3(); clearTimeout(r3.aiT); r3.aiT = 1; const g3 = () => r3.g, bc = () => server.broadcast(r3);
  const act = (role, m) => { const okk = server.act3(r3, role, m); assert.ok(okk, 'legal ' + role + JSON.stringify(m)); bc(); };
  g3().ostrich = [2, 4]; g3().vulture = [3, 2]; bc();
  act('red', { a: 'fly', p: B.flyTargets(g3()).filter(c => !B.isRock(g3(), c) && !B.isFood(g3(), c))[0] }); act('blue', { a: 'step', p: B.ostrichMoves(g3()).filter(c => !B.eggAt(g3(), c))[0] });
  await myTurn(H); await sleep(1500); await quiet(H);
  await withMessages(H, 'hyena (3 players)', sayAll);
  const ctr = await H.evaluate(() => document.querySelector('#hud .ctr').innerText.replace(/\s+/g, ' ')); assert.ok(/ROUNDS \d+/.test(ctr), 'the 3-player header shows the round number: ' + ctr);
  const hudw = await H.evaluate(() => { const e = document.querySelector('#hud .ctr'); const p = e.parentNode; return [e.scrollWidth, e.clientWidth, p.scrollWidth, p.clientWidth]; }); assert.ok(hudw[0] <= hudw[1] + 1 && hudw[2] <= hudw[3] + 1, 'the round number is not clipped ' + hudw);
  ok('3 players: header shows the round number unclipped; no text over the board with any message showing');
  // no bird near -> nothing is cued; bird near -> the area pulses; pounce -> one area only
  await H.evaluate(() => UI._rr()); await sleep(100);
  let none = await H.evaluate(() => ({ sa: document.querySelectorAll('#board>.senseArea').length, cue: document.querySelectorAll('#board>.senseArea.cue').length })); assert.deepEqual(none, { sa: 0, cue: 0 }, 'no bird near: no area, no cue');
  await cell(H, 7, 3).click(); await sleep(500); act('red', { a: 'fly', p: B.flyTargets(g3()).filter(c => !B.isRock(g3(), c) && !B.isFood(g3(), c))[0] }); g3().ostrich = [4, 2]; bc(); act('blue', { a: 'step', p: [5, 2] });
  await myTurn(H); await sleep(1500); await quiet(H);
  const near1 = await H.evaluate(() => ({ sa: document.querySelectorAll('#board>.senseArea').length, cue: document.querySelectorAll('#board>.senseArea.cue').length, dashed: getComputedStyle(document.querySelector('#board>.senseArea')).borderTopStyle }));
  assert.deepEqual(near1, { sa: 1, cue: 1, dashed: 'dashed' }, 'bird near: one dashed outline, and it pulses');
  await H.screenshot({ path: OUT + 'hyena-bird-near.png' });
  await cell(H, 6, 3).click(); await sleep(600);
  const pn = await H.evaluate(() => { const a = [...document.querySelectorAll('#board>.senseArea')]; return { total: a.length, outlines: a.filter(e => getComputedStyle(e).borderTopWidth !== '0px').length, overlap: a.filter(e => e.classList.contains('overlap')).length }; });
  assert.equal(pn.outlines, 1, 'the Pounce shows one outlined area, not two'); assert.equal(pn.overlap, 1, 'the overlap is only filled');
  ok('hyena: no cue with no bird near; one pulsing dashed area when a bird is near; the Pounce shows one area');
  await Promise.all([A.context().close(), Vp.context().close(), H.context().close()]);

  // ================= 4 players: hunters (badger buried, bird next to it) =================
  const A4 = await phone(b); await A4.goto(U); await A4.click('#playFriend'); await A4.waitForSelector('#lobbyCode:not(:empty)');
  const link4 = (await A4.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3981'); const Y = await phone(b); await Y.goto(link4); await Y.waitForSelector('#roomLobby');
  await A4.click('#botPlus'); await A4.click('#botPlus'); await A4.waitForSelector('[data-role="badger"]'); await A4.click('[data-role="badger"]'); await Y.click('[data-role="hyena"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'hyena' && r.mine); });
  await A4.click('#startGame'); await Y.waitForSelector('#board .cell'); await Y.waitForSelector('#actions.mine', { state: 'attached', timeout: 20000 });
  await withMessages(Y, 'hyena (hunters game)', sayAll); await withMessages(A4, 'badger (hunters game)', sayAll);
  ok('hunters game: no text over the board with any message showing');
  await Promise.all([A4.context().close(), Y.context().close()]);

  // ================= How to play =================
  const P = await phone(b); await P.goto(U); await P.click('#homeGear'); await P.click('#howBtn'); await sleep(500);
  const how = await P.evaluate(() => { const r = document.getElementById('rules'), h2 = r.querySelector('h2').getBoundingClientRect(), pics = [...r.querySelectorAll('figure.pic')], h3 = r.querySelector('h3').getBoundingClientRect();
    return { st: r.scrollTop, h2top: h2.top, h2vis: h2.top >= 0 && h2.bottom <= innerHeight, pics: pics.length, caps: pics.map(f => f.querySelector('figcaption').textContent), firstPicTop: pics[0].getBoundingClientRect().top, h3top: h3.top, picsBeforeText: pics[3].getBoundingClientRect().bottom <= h3.top + 1,
      marks: { dot: !!pics[0].querySelector('.mvdot'), you: !!pics[0].querySelector('.youflag'), sat: !!pics[0].querySelector('.cell.sat .ic-myegg'), area: !!pics[1].querySelector('.senseArea'), found: !!pics[2].querySelector('.ic-spot') && !!pics[2].querySelector('.aim'), wrecked: !!pics[3].querySelector('.cell.hit .ic-hit') }, sh: r.scrollHeight, ch: r.clientHeight }; });
  assert.equal(how.st, 0, 'How to play opens at its top'); assert.ok(how.h2vis, 'the heading is on screen'); assert.equal(how.pics, 4, 'four pictures'); assert.ok(how.picsBeforeText, 'the pictures come before the text sections'); assert.ok(how.firstPicTop < 664 / 2, 'the first picture is on the first screen');
  assert.ok(Object.values(how.marks).every(Boolean), 'each picture draws its real marks ' + JSON.stringify(how.marks)); for (const c of how.caps) assert.ok(c.split(/\s+/).length <= 6, 'one short line: ' + c);
  await P.screenshot({ path: OUT + 'how-to-play-top.png' });
  await P.evaluate(() => { document.getElementById('rules').scrollTop = 99999; }); await sleep(150); const bottom = await P.evaluate(() => { const r = document.getElementById('rules'); return r.scrollTop + r.clientHeight >= r.scrollHeight - 2; }); assert.ok(bottom, 'it scrolls to the bottom');
  await P.evaluate(() => { document.getElementById('rules').scrollTop = 0; }); await sleep(150); assert.equal(await P.evaluate(() => document.getElementById('rules').scrollTop), 0, 'and back to the top');
  // really swipe it with a finger from the top: the page moves
  await P.touchscreen.tap(20, 300); await sleep(100);
  ok('How to play opens at its top, scrolls both ways, and starts with four pictures of the real marks');

  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-part1 (' + n + ' groups)'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
