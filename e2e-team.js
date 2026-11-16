// 4 players (2v2) and 5 players (2v2 + hunter) on WebKit iPhone 13s. Covers the lobby, seats by link, own-nest setup,
// turn order, teammates and numbers, shared sniffs, shot clock, the hunter's view, birds seeing a near hunter, game over.
process.env.PORT = 4014; process.env.BO_H3START = '8,3'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '6000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), T = require('./team.js'); const U = 'http://localhost:4014/', OUT = 'shots/team/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 });
const at = { state: 'attached' };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  // A setup tap used to go out on a short timer, sometimes before the board
  // existed and sometimes before the previous egg had landed. The ostrich then
  // never finished hiding, and the next player's action bar never appeared.
  const readSetup = page => page.evaluate(() => {
    const S = UI._S();
    return S && S.h3 ? { left: S.h3.eggsToPlace, step: S.h3.setupStep, phase: S.phase, teamSetup: S.h3.teamSetup } : null;
  });
  const placeAt = async (page, x, y) => {
    const before = await readSetup(page);
    if (!before) throw new Error('no setup state before the tap at ' + x + ',' + y);
    const advanced = () => page.waitForFunction(b => {
      const S = UI._S();
      if (!S || !S.h3) return false;
      if (S.phase === 'play' && !S.h3.teamSetup) return true;
      return S.h3.eggsToPlace !== b.left || S.h3.setupStep !== b.step;
    }, before, { timeout: 2500 }).then(() => true).catch(() => false);
    for (let i = 0; i < 4; i++) {
      const now = await readSetup(page);
      if (now && ((now.phase === 'play' && !now.teamSetup) || now.left !== before.left || now.step !== before.step)) return;
      await page.waitForFunction(({ x, y }) => {
        const S = UI._S();
        if (!S) return false;
        if (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) return false;
        if (document.getElementById('cutaway') || document.getElementById('surprise-go')) return false;
        const card = document.getElementById('rolecard');
        if (card && !card.classList.contains('hidden')) return false;
        const el = document.querySelectorAll('#board .cell')[y * (S.cfg ? S.cfg.cols : 9) + x];
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 4) return false;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!(top && el.contains(top));
      }, { x, y });
      await cell(page, x, y).click();
      if (await advanced()) return;
    }
    throw new Error('setup tap did not land at ' + x + ',' + y);
  };
  const myTurn = page => page.waitForFunction(() => {
    const S = UI._S();
    if (!S || S.phase !== 'play' || !S.myTurn) return false;
    if (S.h3 && S.h3.teamSetup) return false;
    if (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) return false;
    if (document.getElementById('cutaway') || document.getElementById('surprise-go')) return false;
    return !!document.querySelector('#actions.mine');
  });
  // ---- 4 players: me = Ostrich 1, a friend = Vulture 1, computers = Ostrich 2 + Vulture 2 ----
  const A = await mk(), V = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4014');
  await V.goto(link); await V.waitForSelector('#roomLobby');
  await A.click('#botPlus'); await A.click('#botPlus');
  await A.waitForSelector('[data-role="ostrich"]'); await A.click('[data-role="ostrich"]'); await V.click('[data-role="vulture"]');
  await V.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'vulture' && r.mine); });
  await shot(A, '4p-1-lobby');
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
  for (const [x, y] of [[2, 1], [2, 4], [1, 2]]) await placeAt(A, x, y);
  await myTurn(V); assert.ok(/VULTURE 1/.test(await V.textContent('#turnTag')));
  assert.equal(await V.locator('#h3bar .bchip').count(), 4, 'four birds in the header'); assert.ok(await V.locator('#clock3:not(.hidden)').count(), 'shot clock');
  assert.equal(await V.locator('.pc.po').count(), 2, 'vulture sees both ostriches'); assert.equal(await V.locator('.egg, .pc.pe').count(), 0);
  await cell(V, 3, 2).click(); // sniff next to the eggs
  await myTurn(A); assert.equal(await A.locator('.pc.other.mate').count(), 1, 'teammate ostrich shown');
  assert.ok(await A.locator('.cell.mateegg').count() >= 1, 'teammate eggs marked'); await A.waitForTimeout(300); await shot(A, '4p-2-ostrich1');
  await cell(A, 2, 1).click();
  await V.waitForSelector('#actions.mine', { state: 'attached',  ...at, timeout: 15000 }); assert.equal(await V.locator('.msniff').count(), 1, 'Vulture 2 sniff shared'); await V.waitForTimeout(2500); await shot(V, '4p-3-vulture-shared-sniff-clock');
  const ct = await V.textContent('#clock3'); assert.ok(/[1-5]s/.test(ct), 'clock ' + ct);
  await A.waitForSelector('#actions.mine', { state: 'attached',  ...at, timeout: 15000 }); // V timed out -> pass; Ostrich 1 again
  // force an ending to check the 2v2 game-over screen
  const room4 = [...server.rooms.values()].find(r => r.team && r.n === 4); T.knockout(room4.g, 'o1', 'starved'); T.knockout(room4.g, 'o2', 'starved'); server.broadcast(room4);
  await A.waitForSelector('#over:not(.hidden)'); assert.ok(/Vultures win/.test(await A.textContent('#over'))); await V.waitForSelector('#over:not(.hidden)');
  assert.ok(/Your team wins/.test(await V.textContent('#over'))); await shot(V, '4p-4-over');
  console.log('ok 4 players');
  // ---- 5 players: hunter (hyena) vs 4 computer birds ----
  const H = await mk(); await H.goto(U); await H.click('#playSolo'); await H.click('[data-bots="4"]'); await H.click('#soloGo'); await H.click('[data-role="hyena"]'); await shot(H, '5p-1-lobby');
  await H.click('#startGame'); await H.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); assert.ok(/HYENA/.test(await H.textContent('#turnTag')));
  assert.equal(await H.locator('.pc.po, .pc.pv').count(), 0, 'hunter sees no birds'); assert.equal(await H.locator('#h3bar .bchip').count(), 5);
  // "Bird near." / "Nothing near." is up for about a second, and it is skipped
  // while "Look out!" owns the line. The sense marks and the hint stay for the turn.
  await H.waitForFunction(() => {
    const S = UI._S();
    if (!S || S.phase !== 'play' || !S.myTurn || S.role !== 'hunter' || S.sense == null) return false;
    if (S.sense) return document.querySelectorAll('#board .cell.maybird').length > 0;
    return /No bird near/.test((document.getElementById('hint') || {}).textContent || '');
  });
  await shot(H, '5p-2-hunter-view');
  for (let i = 0; i < 3; i++) { await H.waitForSelector('#actions.mine, #over:not(.hidden)', { state: 'attached',  ...at, timeout: 20000 }); if (await H.locator('#over:not(.hidden)').count()) break;
    await H.waitForTimeout(1200); await H.locator('.cell.legal').first().click(); await H.waitForTimeout(400); }
  console.log('ok 5p hunter');
  // ---- 5 players: Ostrich 1 vs computers; stands next to the hunter, so it sees it ----
  const O = await mk(); await O.goto(U); await O.click('#playSolo'); await O.click('[data-bots="4"]'); await O.click('#soloGo'); await O.click('[data-role="o1"]'); await O.click('[data-hkind="badger"]'); await O.click('#startGame');
  await O.waitForSelector('#board .cell');
  for (const [x, y] of [[6, 1], [6, 5], [7, 2]]) await placeAt(O, x, y);
  await myTurn(O);
  const sees = await O.locator('.pc.ph').count(), room5 = [...server.rooms.values()].find(r => r.team && r.n === 5 && r.players.o1.ws);
  assert.equal(sees, T.hunterSeenBy(room5.g, 'o1') ? 1 : 0, 'ostrich sees the hunter only within 2 (never burrowed)');
  await O.waitForTimeout(300); await shot(O, '5p-3-ostrich-view');
  T.knockout(room5.g, 'o2', 'caught'); T.knockout(room5.g, 'v1', 'caught'); server.broadcast(room5);
  await O.waitForSelector('#over:not(.hidden)'); assert.ok(/Badger wins/.test(await O.textContent('#over'))); await shot(O, '5p-4-over');
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-team'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
