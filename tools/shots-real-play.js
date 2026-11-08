// Real-play phone screenshots (390x664, default theme), in the order a player meets them.
// Usage: node tools/shots-real-play.js <outdir> [start,lobby,vulture,ostrich,hyena,badger,howto,howfound,over]
// It starts the game server on port 4172 and plays real turns; BO_* settings slow the computers and fix the hunters' start squares,
// and the localStorage keys below skip the tutorial, role card and tips so the board is clear. Run `npm run setup:e2e` once first.
process.env.PORT = 4172; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '4000'; process.env.BO_CLOCKMS = '900000'; process.env.BO_H3START = '8,3'; process.env.BO_H4START = '2,3,4,3';
const R = require('path').join(__dirname, '..') + '/';
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || R + 'node_modules/.pw-browsers';
const { webkit } = require(R + 'node_modules/playwright-core'); const fs = require('fs');
const server = require(R + 'server.js'), B = require(R + 'game.js');
const OUT = process.argv[2], ONLY = process.argv[3] || 'all'; fs.mkdirSync(OUT, { recursive: true });
const U = 'http://localhost:4172/', key = B.key, sleep = ms => new Promise(r => setTimeout(r, ms));
const want = n => ONLY === 'all' || ONLY.split(',').includes(n);
const last = f => [...server.rooms.values()].filter(f).pop(); const room2 = () => last(r => r.g && !r.three && !r.hunt && !r.team), room3 = () => last(r => r.three);
async function phone(b, theme) { const c = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await c.newPage();
  await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_muted']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); window.AudioContext = undefined; window.webkitAudioContext = undefined; }); p.on('pageerror', e => console.log('pageerror', e.message)); return p; }
const myTurn = async p => { await p.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn && !UI._locked(); }, null, { timeout: 25000 }); await sleep(300); };
const quiet = async p => { await p.waitForFunction(() => !document.querySelector('#announce.show,#snpop,#msgslot .h3pop'), null, { timeout: 15000 }); await sleep(400); };
const cell = (p, x, y) => p.locator('#board .cell').nth(y * 9 + x);
async function solo2(b, role) { const p = await phone(b); await p.goto(U); await p.click('#playSolo'); await p.click('[data-bots="1"]'); await p.click('#soloGo'); await p.waitForSelector('[data-role="' + role + '"]'); await p.click('[data-role="' + role + '"]'); await p.click('#startGame'); await p.waitForSelector('#board .cell');
  if (role === 'red') await myTurn(p); else await p.waitForFunction(() => UI._S().phase === 'setupEggs'); room2().aiT = 1; return p; }
const push = async () => { server.broadcast(room2()); await sleep(1500); };

// How to play pictures (bw theme): a 4 x 2 square cut of the real board around one square, written to public/tut/how/<i>.png when HOWCROPS=1
const howCrop = async (p, i, at) => { if (!process.env.HOWCROPS) return; const r = await p.evaluate(([x, y]) => { const bd = document.querySelector('#board').getBoundingClientRect(); const cs = [...document.querySelectorAll('#board .cell')]; const cols = 9; const c = cs[y * cols + x].getBoundingClientRect(); let L = c.x - c.width - 1, T = c.y - c.height - 1; L = Math.max(bd.x, Math.min(L, bd.right - 4 * c.width)); T = Math.max(bd.y, Math.min(T, bd.bottom - 2 * c.height)); return { x: L, y: T, width: 4 * c.width + 2, height: 2 * c.height + 2 }; }, at); fs.mkdirSync(R + 'public/tut/how', { recursive: true }); await p.screenshot({ path: R + 'public/tut/how/' + i + '.png', clip: r }); };
const shot = async (p, n) => { await p.screenshot({ path: OUT + '/' + n + '.png' }); const r = await p.evaluate(() => [...document.querySelectorAll('#board .cell')].map(c => { const b = c.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; })).catch(() => []); if (r.length) fs.writeFileSync(OUT + '/' + n + '.cells.json', JSON.stringify(r)); }; // also saves where each square is, for close-up crops
const near = (a, c) => Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]));
(async () => {
  const b = await webkit.launch();
  if (want('start')) { // home, the Play solo computer count, and home with a code typed in
    const P = await phone(b); await P.goto(U); await P.waitForSelector('#homeStep'); await sleep(700); await shot(P, 'start-a-home'); await P.click('#homeGear'); await shot(P,'start-d-settings'); await P.click('#homeGear');
    await P.click('#playSolo'); await P.waitForSelector('#soloStep:not(.hidden)'); await sleep(500); await shot(P, 'start-b-solo-count');
    await P.click('#soloBack'); await sleep(300); await P.fill('#codeIn', 'KQTR'); await sleep(400); await shot(P, 'start-c-join-code'); await P.context().close(); }
  if (want('lobby')) { // friends room: alone (code, Share, seats), then a friend joins; and a fresh room where the host taps + Computer
    const A = await phone(b); await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('.openseat'); await sleep(800); await shot(A, 'lobby-a-alone');
    const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4172'); const F = await phone(b); await F.goto(link);
    await A.waitForSelector('[data-role]'); await sleep(900); await shot(A, 'lobby-b-friend-joined'); await F.context().close(); await A.context().close();
    const C = await phone(b); await C.goto(U); await C.click('#playFriend'); await C.waitForSelector('#botPlus'); await C.click('#botPlus'); await C.waitForSelector('[data-role]'); await sleep(900); await shot(C, 'lobby-c-added-computer'); await C.context().close(); }
  if (want('over')) { // game over from real play: the ostrich walks, the computer vulture hunts eggs with legal flies and throws
    const O = await solo2(b, 'blue');
    for (const [x, y] of [[2, 1], [6, 2], [3, 5]]) { await cell(O, x, y).click(); await sleep(150); }
    await O.waitForFunction(() => UI._S().phase === 'setupOstrich'); await cell(O, 4, 3).click(); await O.waitForFunction(() => UI._S().phase === 'play'); room2().aiT = 1;
    const g = room2().g; let smashedShot = 0;
    const vt = () => { const eg = g.eggs.filter(e => e.alive).map(e => e.pos);
      const tt = g.stones > 0 ? B.throwTargets(g).filter(q => B.eggAt(g, q) && !(g.ostrich && B.key(q) === B.key(g.ostrich))) : [];
      if (tt.length) return B.vultureThrow(g, tt[0]);
      const goal = g.stones > 0 ? eg : g.cfg.rocks || []; const ft = B.flyTargets(g).filter(q => !B.eggAt(g, q));
      const d = q => Math.min(...(goal.length ? goal : eg).map(e => near(e, q))); ft.sort((a, c) => d(a) - d(c)); B.vultureFly(g, ft[0]); };
    for (let i = 0; i < 80 && g.phase === 'play'; i++) {
      if (g.turn === 'red') { const was = g.eggs.filter(e => e.alive).length; vt(); await push(); if (!smashedShot && g.phase === 'play' && g.eggs.filter(e => e.alive).length < was) { smashedShot = 1; await myTurn(O); await quiet(O); await shot(O, 'over-0-after-a-smash'); { const hx = await O.evaluate(() => { const cs = [...document.querySelectorAll('#board .cell')]; const i = cs.findIndex(c => c.classList.contains('hit')); const bd = document.querySelector('#board').getBoundingClientRect(); const cols = 9; return [i % cols, Math.floor(i / cols)]; }); await howCrop(O, 3, hx); } } continue; }
      await myTurn(O); const m = B.ostrichMoves(g).filter(q => !B.eggAt(g, q)).sort((a, c) => near(c, g.vulture) - near(a, g.vulture))[0]; await cell(O, ...m).click();
      await O.waitForFunction(() => UI._S().turn !== 'blue' || UI._S().phase !== 'play', null, { timeout: 5000 }).catch(() => {}); }
    console.log('over?', g.phase, g.winBy); await O.waitForSelector('#over:not(.hidden)', { timeout: 20000 }).catch(e => console.log('no over', e.message)); await sleep(2500);
    await shot(O, 'over-a-game-over'); await O.context().close(); }
  if (want('vulture')) {
    const V = await solo2(b, 'red'); const g = room2().g;
    // (a) fly to a square next to a hidden egg (not onto it), the way a player would
    const eggs = g.eggs.filter(e => e.alive).map(e => e.pos);
    let t = B.flyTargets(g).filter(q => !B.eggAt(g, q) && !B.isRock(g, q) && !B.isFood(g, q) && eggs.some(e => near(e, q) === 1))[0];
    console.log('eggs', JSON.stringify(eggs), 'vulture lands', t);
    await cell(V, ...t).click(); await V.waitForFunction(() => !UI._S().myTurn, null, { timeout: 5000 }); await sleep(1800); await quiet(V);
    await shot(V, 'vulture-a-landed-and-sniffed'); await howCrop(V, 1, t);
    // ostrich (computer) steps somewhere that is not the egg's square, then the vulture finds an egg
    const ost = () => { const m = B.ostrichMoves(g).filter(q => !B.eggAt(g, q)).sort((a, c) => near(c, g.vulture) - near(a, g.vulture)); B.ostrichStep(g, m[0]); };
    ost(); await push(); await myTurn(V); await quiet(V);
    const e2 = B.flyTargets(g).filter(q => B.eggAt(g, q) && !B.isFood(g, q) && q[0] >= 2 && q[0] <= 6 && near(q, g.ostrich) > 2)[0]; console.log('vulture lands on egg', e2); fs.writeFileSync(OUT + '/found.json', JSON.stringify(e2));
    if (!e2) { console.log('RETRY: no central egg in reach'); await b.close(); server.close(); process.exit(3); }
    await cell(V, ...e2).click(); await V.waitForFunction(() => !UI._S().myTurn, null, { timeout: 5000 }); await sleep(1800); await quiet(V);
    await sleep(1400); await shot(V, 'vulture-b0-just-found'); await howCrop(V, 2, e2); await V.evaluate(() => UI.rules()); await sleep(1800); await shot(V, 'howto-vulture-approved'); await V.evaluate(() => UI.closeRules());
    ost(); await push(); await myTurn(V); await quiet(V);
    await shot(V, 'vulture-b-later-turn-found-egg');
    await V.evaluate(() => UI.card()); await sleep(400); await shot(V,'rolecard-vulture'); await V.context().close();
  }
  if (want('howfound')) { // ostrich's view: never label the other player's vulture YOU in its found-egg picture
    const O = await solo2(b, 'blue');
    for (const [x,y] of [[2,1],[6,2],[3,5]]) { await cell(O,x,y).click(); await sleep(150); }
    await O.waitForFunction(() => UI._S().phase === 'setupOstrich'); await cell(O,4,3).click();
    await O.waitForFunction(() => UI._S().phase === 'play'); room2().aiT=1;
    const g=room2().g;
    if(g.turn==='blue'){ await myTurn(O); await cell(O,...B.ostrichMoves(g)[0]).click(); await O.waitForFunction(() => UI._S().turn==='red'); }
    const egg=B.flyTargets(g).find(q=>B.eggAt(g,q));
    if(!egg)throw new Error('RETRY: no reachable egg for ostrich crop');
    B.vultureFly(g,egg); await push(); await quiet(O); await sleep(1400);
    await howCrop(O,'2-blue',egg); await shot(O,'ostrich-c-vulture-found-egg');
    await O.evaluate(() => UI.rules()); await sleep(1800); await shot(O,'howto-ostrich-approved'); await O.context().close();
  }
  if (want('howto')) {
    const P = await phone(b); await P.goto(U); await P.waitForSelector('#playSolo');
    await P.evaluate(() => UI.rules ? UI.rules() : (document.getElementById('rules').classList.remove('hidden'), document.getElementById('lobby').classList.add('hidden'))); await sleep(600);
    await P.evaluate(() => { const r = document.getElementById('rules'); r.classList.remove('hidden'); r.scrollTop = 0; }); await sleep(400);
    await sleep(1800); await shot(P, 'howto-a-pictures');
    await P.evaluate(() => { const r = document.getElementById('rules'); const h = [...r.querySelectorAll('h3')].find(x => /Marks/.test(x.textContent)); h.scrollIntoView({ block: 'start' }); }); await sleep(400);
    await shot(P, 'howto-b-marks-legend'); await P.context().close();
  }
  if (want('ostrich')) {
    const O = await solo2(b, 'blue');
    for (const [x, y] of [[2, 1], [6, 2], [3, 5]]) { await cell(O, x, y).click(); await sleep(150); }
    await O.waitForFunction(() => UI._S().phase === 'setupOstrich'); await cell(O, 3, 4).click(); await O.waitForFunction(() => UI._S().phase === 'play'); room2().aiT = 1;
    const g = room2().g; const vf = () => { const q = B.flyTargets(g).filter(c => !B.eggAt(g, c) && !B.isRock(g, c) && !B.isFood(g, c) && near(c, g.ostrich) > 1)[0]; B.vultureFly(g, q); };
    if (g.turn === 'red') { vf(); await push(); } await myTurn(O); await quiet(O);
    await cell(O, 3, 5).click(); await O.waitForFunction(() => UI._S().turn === 'red', null, { timeout: 5000 }); vf(); await push(); await myTurn(O); await quiet(O);
    await shot(O, 'ostrich-a-standing-on-its-egg'); await howCrop(O, 0, [3, 5]); await O.evaluate(() => UI.rules()); await sleep(1800); await shot(O, 'howto-ostrich-approved'); await O.evaluate(() => UI.closeRules());
    // walk away from the egg for two turns
    await cell(O, 4, 4).click(); await O.waitForFunction(() => UI._S().turn === 'red', null, { timeout: 5000 }); vf(); await push(); await myTurn(O); await quiet(O);
    await cell(O, 5, 3).click(); await O.waitForFunction(() => UI._S().turn === 'red', null, { timeout: 5000 }); vf(); await push(); await myTurn(O); await quiet(O);
    await shot(O, 'ostrich-b-walked-away'); await O.evaluate(() => UI.card()); await sleep(400); await shot(O,'rolecard-ostrich');
    await O.context().close();
  }
  if (want('hyena') || want('badger')) {
    const lobby = async kind => {
      const A = await phone(b), Vp = await phone(b), H = await phone(b);
      await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)'); const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4172');
      await Vp.goto(link); await H.goto(link); await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
      await A.click('[data-role="blue"]'); await Vp.click('[data-role="red"]'); await H.click('[data-role="' + kind + '"]'); await H.waitForFunction(k => new RegExp('YOU ARE ' + (k === 'badger' ? 'Honey badger' : 'Hyena'), 'i').test(document.body.innerText), kind);
      await A.click('#startGame'); await H.waitForSelector('#board .cell'); await A.waitForSelector('#board .cell');
      for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(A, x, y).click(); await sleep(120); }
      await Vp.waitForSelector('#actions.mine', { state: 'attached' });
      const r3 = room3(); clearTimeout(r3.aiT); r3.aiT = 1; const g3 = () => r3.g, bc = () => server.broadcast(r3);
      const act = (role, m) => { if (!server.act3(r3, role, m)) throw new Error('illegal ' + role + JSON.stringify(m)); bc(); };
      return { A, Vp, H, r3, g3, bc, act };
    };
    if (want('hyena')) {
      const { A, Vp, H, g3, bc, act } = await lobby('hyena');
      g3().ostrich = [7, 1]; g3().vulture = [3, 2]; bc();
      act('red', { a: 'fly', p: B.flyTargets(g3()).filter(c => !B.isRock(g3(), c) && !B.isFood(g3(), c))[0] }); act('blue', { a: 'step', p: [6, 1] });
      await myTurn(H); await sleep(1500); await quiet(H);
      await shot(H, 'hyena-a-start-of-turn-bird-sensed');
      await cell(H, 6, 3).click(); await sleep(900); await quiet(H); await shot(H, 'hyena-b-after-2-squares-pounce');
      await H.evaluate(() => UI.card()); await sleep(400); await shot(H,'rolecard-hyena');
      for (const p of [H, Vp, A]) await p.context().close();
    }
    if (want('badger')) {
      const { A, Vp, H, g3, bc, act } = await lobby('badger');
      g3().ostrich = [6, 2]; g3().vulture = [3, 2]; bc();
      act('red', { a: 'fly', p: B.flyTargets(g3()).filter(c => !B.isRock(g3(), c) && !B.isFood(g3(), c))[0] }); act('blue', { a: 'step', p: [6, 3] });
      await myTurn(H); await sleep(800); await quiet(H);
      // badger stays still: digs in where the ostrich can see it
      await H.evaluate(() => 0); const stay = await H.locator('#actions button').first().textContent(); console.log('badger button:', stay); await H.locator('#actions button').first().click(); await sleep(800);
      await myTurn(Vp); await sleep(300); act('red', { a: 'fly', p: B.flyTargets(g3()).filter(c => !B.isRock(g3(), c) && !B.isFood(g3(), c))[0] });
      await A.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn && !UI._locked(); }, null, { timeout: 20000 }).catch(e => console.log('ostrich turn wait', e.message)); await sleep(400);
      await quiet(A); await shot(A, 'bird-after-badger-dug-in');
      await H.evaluate(() => UI.card()); await sleep(400); await shot(H,'rolecard-badger');
      for (const p of [H, Vp, A]) await p.context().close();
    }
  }
  await b.close(); server.close(); console.log('done'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
