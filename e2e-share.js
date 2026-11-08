// Share-first: "Two phones" shows the code + link first, then you pick your side under it; during play the header has no room code.
// Also checks iPhone sound: after a tap the WebAudio context is 'running' and the mute default is off. Screenshots in shots/share/.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 3994; const server = require('./server.js');
const OUT = 'shots/share/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await webkit.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); localStorage.setItem('bo_card_off', '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3994/';
  await A.goto(U); assert.equal(await A.evaluate(() => SFX.muted), false, 'sound on by default');
  await A.click('#playFriend');
  await A.waitForSelector('#lobbyCode:not(:empty)'); assert.equal(await A.locator('#moreP').count(), 0, 'no player-count screen before the code');
  await A.waitForSelector('[data-role="red"]'); await A.waitForTimeout(400);
  assert.equal(await A.evaluate(() => SFX.state), 'running', 'AudioContext running after a tap');
  await A.screenshot({ path: OUT + '1-share-first.jpg', type: 'jpeg', quality: 85 });
  await A.click('[data-role="red"]'); await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'red' && r.mine); });
  await A.screenshot({ path: OUT + '2-picked-vulture.jpg', type: 'jpeg', quality: 85 });
  const link = await A.inputValue('#lobbyLink'); const code = (await A.textContent('#lobbyCode')).trim();
  await V.goto(link); await V.waitForSelector('#roomLobby'); await A.click('#startGame');
  await A.waitForFunction(() => document.body.className.includes('red'));
  await V.waitForFunction(() => document.body.className.includes('blue'));
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'), null, { timeout: 8000 });
  await A.waitForTimeout(800);
  for (const P of [A, V]) { const hud = await P.textContent('#hud'); assert.ok(!hud.includes(code), 'room code in in-game header: ' + hud);
    assert.ok(!(await P.isVisible('#seatPick')), 'seat picker gone during play'); }
  await A.screenshot({ path: OUT + '3-ingame-no-code.jpg', type: 'jpeg', quality: 85 });
  // vulture on a found egg: egg + vulture both drawn INSIDE that one cell, in every theme (was offset onto the gridline crossing)
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 5]]) { await V.locator('.cell').nth(y * 9 + x).click(); await V.waitForTimeout(150); }
  await A.waitForSelector('#actions.mine', { state: 'attached' }); await V.waitForTimeout(300);
  for (const th of ['classic', 'arcade', 'comic', 'golden', 'nature', 'neon', 'notes', 'paper', 'pharaoh', 'storm', 'tactical', 'toybox', 'volcano']) {
    for (const [P, who] of [[A, 'vulture'], [V, 'ostrich']]) {
      const r = await P.evaluate(th => { if (th === 'classic') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
        const S = UI._S(); S.vulture = [3, 4]; S.marks['3,4'] = 'spotted'; UI._rr();
        const c = document.querySelectorAll('.cell')[4 * 9 + 3], cb = c.getBoundingClientRect(), ic = c.querySelector('.ic-spot,.ic-myegg'), pv = c.querySelector('.pc.pv');
        if (!ic || !pv) return { miss: true, cls: c.className };
        const ins = e => { const b = e.getBoundingClientRect(); return b.left >= cb.left - 1 && b.top >= cb.top - 1 && b.right <= cb.right + 1 && b.bottom <= cb.bottom + 1; };
        return { egg: ins(ic), vul: ins(pv), cls: c.className }; }, th);
      assert.ok(!r.miss && r.egg && r.vul, `${th}/${who}: egg and vulture inside the cell ${JSON.stringify(r)}`);
      if (th === 'classic' || th === 'neon') await P.screenshot({ path: OUT + `4-vulture-on-egg-${who}-${th}.jpg`, type: 'jpeg', quality: 85 });
    } }
  // ostrich: hunger bar in the header; carrying an egg onto food -> small shake + "Can't carry egg and food"
  await V.evaluate(() => { delete document.documentElement.dataset.theme; UI._rr(); });
  assert.ok(await V.locator('#hud .hh .hbar i').count() === 1, 'hunger bar for the ostrich'); assert.equal(await A.locator('#hud .hbar').count(), 0, 'no hunger bar for the vulture');
  await V.screenshot({ path: OUT + '5-hunger-bar.jpg', type: 'jpeg', quality: 88 });
  await V.evaluate(() => { const S = UI._S(); S.vulture = [6, 5]; S.ostrich = [1, 1]; S.eggs[0].pos = [1, 1]; S.myTurn = true; S.phase = 'play'; S.can = { sit: true, carry: true }; S.carryMoves = [[2, 0], [1, 0], [2, 2]]; S.moves = [[0, 0], [1, 0], [2, 0]]; S._o = null; UI._rr(); UI.setMode('carry'); });
  await V.locator('.cell').nth(0).click(); await V.waitForTimeout(60);
  const ht = await V.textContent('#hint, #tipbar, body'); assert.ok(/No eggs by food\./.test(ht), 'carry-onto-food message'); assert.ok(!/hands full/i.test(ht));
  await V.screenshot({ path: OUT + '6-cant-carry-egg-and-food.jpg', type: 'jpeg', quality: 88 });
  // buttons stay on screen (iPhone 13) even with a tip + banner showing; carried egg is drawn in the beak; final-rounds banner
  await V.evaluate(() => { const S = UI._S(); S.carried = true; S.carrying = 0; S.hungerLeft = 3; S.round = S.cfg.rounds - 2; UI._rr(); UI._tip('Tip: this is a long just-in-time tip that wraps onto a second line to push things down.'); });
  await V.waitForTimeout(200);
  const lay = await V.evaluate(() => { const a = document.getElementById('actions').getBoundingClientRect(); return { bottom: a.bottom, top: a.top, h: innerHeight, tip: !document.getElementById('tipbar').classList.contains('hidden') }; });
  assert.ok(lay.tip && lay.bottom <= lay.h + 1 && lay.top >= 0, 'action buttons on screen with a tip ' + JSON.stringify(lay));
  assert.ok(await V.locator('.cell>.carry svg').count() === 1, 'carried egg drawn');
  await V.screenshot({ path: OUT + '7-buttons-with-tip.jpg', type: 'jpeg', quality: 88 });
  await V.evaluate(() => { UI._tip(null); const S = UI._S(); S.hungerLeft = 9; UI._rr(); });
  assert.match(await V.textContent('#banner'), /Final 3 rounds!/); await V.screenshot({ path: OUT + '8-final-rounds-banner.jpg', type: 'jpeg', quality: 88 });
  await V.locator('.cell').nth(1 * 9 + 1).screenshot({ path: OUT + '9-beak-egg-cell.jpg', type: 'jpeg', quality: 92 });
  // a game the server lost: big clear "Game was reset" instead of a frozen board
  const G = await mk(); await G.goto(U); await G.evaluate(() => localStorage.setItem('bo_me', JSON.stringify({ code: 'QQQQ', token: 'gone', role: 'blue' })));
  await G.goto(U + '?room=QQQQ'); await G.waitForSelector('#gone', { timeout: 8000 }); assert.match(await G.textContent('#gone'), /Game was reset/);
  await G.screenshot({ path: OUT + '10-game-was-reset.jpg', type: 'jpeg', quality: 85 });
  console.log('e2e-share PASSED'); await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
