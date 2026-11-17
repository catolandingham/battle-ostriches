// 4-player Hunters mode + the new lobby on WebKit iPhone 13s: Classic default lobby, "More players" picker, Hunters setup,
// a friend joining as the hyena by link, the badger's view with both hunters, one-turn burrow, rivalry, game over.
process.env.PORT = 3995; process.env.BO_H4START = '2,3,4,3'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '8000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), H = require('./hunt.js'); const U = 'http://localhost:3995/', OUT = 'shots/hunt/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 });
const at = { state: 'attached' };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  // ---- home: two primary paths, no player-count picker ----
  const A = await mk(); await A.goto(U);
  assert.equal(await A.locator('#moreP').count(), 0, 'no player-count picker');
  assert.ok(await A.isVisible('#playFriend') && await A.isVisible('#playSolo'));
  assert.equal(await A.locator('.mrules:not(.hidden)').count(), 0, 'multi-player rules hidden on the home screen'); await shot(A, '1-default-lobby');
  await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)'); await shot(A, '2-more-players-picker');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3995');
  const Y = await mk(); await Y.goto(link); await Y.waitForSelector('#roomLobby');
  // ---- Hunters: 2 humans + 2 computers. Host is the badger, friend is the hyena. ----
  await A.click('#botPlus'); await A.click('#botPlus');
  await A.waitForSelector('[data-role="badger"]'); await A.click('[data-role="badger"]'); await Y.click('[data-role="hyena"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'hyena' && r.mine); });
  await shot(A, '3-hunters-setup');
  await A.click('#startGame'); await Y.waitForSelector('#board .cell');
  await Y.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); assert.ok(/HYENA/.test(await Y.textContent('#turnTag')));
  await Y.locator('#actions button').first().click({ force: true }); // hyena stays put
  await A.waitForSelector('#actions.mine', { ...at, timeout: 20000 }); assert.ok(/BADGER/.test(await A.textContent('#turnTag')));
  assert.equal(await A.locator('#h3bar .bchip').count(), 4); assert.ok(await A.locator('#clock3:not(.hidden)').count(), 'shot clock');
  // The computer ostrich may already have kicked a hunter away. Assert the actual
  // visibility rule, not unchanged randomized opening positions; ignore motion clones.
  const room = [...server.rooms.values()].find(r => r.hunt),visibleHunters=H.HUNTERS.filter(h=>H.seen(room.g,'badger',h)).length;
  await A.waitForFunction(n=>document.querySelectorAll('#board .pc.ph').length===n,visibleHunters);
  assert.equal(await A.locator('#board .pc.ph').count(), visibleHunters, 'badger sees exactly the hunters in range'); assert.equal(await A.locator('.pc.po, .pc.pv').count(), 0);
  assert.equal((await A.textContent('#actions')).trim(), 'Burrow'); await A.waitForTimeout(2300); await shot(A, '4-hunter-view-both-hunters');
  assert.ok(!/tough ground|one more still turn/i.test(await A.textContent('#hint') + await A.locator('#actions button').first().getAttribute('title')), 'no tough-ground wording');
  await A.locator('#actions button').first().click({ force: true }); // stay: one still turn always burrows
  for (let i = 0; i < 50 && !room.g.hunt.hs.badger.burrowed; i++) await A.waitForTimeout(40); // the click reaches the server a moment later
  assert.equal(room.g.hunt.hs.badger.burrowed, true, 'burrowed after 1 still turn'); assert.equal(room.g.hunt.hs.badger.dig, 2);
  await A.waitForSelector('.pc.ph.bur', { timeout: 4000 }); assert.equal(await A.locator('.burtag').count(), 0, 'no word tag on the buried badger: the mound says it');
  await A.waitForTimeout(1000); await shot(A, '5-badger-burrowed');
  // ambush sight: a bird placed next to the burrowed badger shows at its exact square on the badger's board, and nowhere else
  { const bd0 = room.g.hunt.hs.badger.p, saved = room.g.ostrich.slice(); const nb = [[bd0[0] - 1, bd0[1]], [bd0[0], bd0[1] - 1], [bd0[0], bd0[1] + 1]].find(q => q[0] >= 0 && q[1] >= 0 && q[1] < 7 && !H.HUNTERS.some(h => room.g.hunt.hs[h].p + '' === q + '') && room.g.vulture + '' !== q + '');
    room.g.ostrich = nb.slice(); server.broadcast(room); await A.waitForSelector('.pc.ambushsee', { state: 'attached', timeout: 5000 });
    assert.equal(await A.locator('.pc.ambushsee').count(), H.ambushSight(room.g).length, 'one drawn for each bird next to the badger'); assert.equal(await A.locator('.cell').nth(nb[1] * 9 + nb[0]).locator('.pc.ambushsee').count(), 1, 'the bird is drawn on its exact square');
    await A.waitForTimeout(600); await shot(A, '5b-badger-sees-adjacent-bird');
    assert.equal(await Y.locator('.pc.ambushsee').count(), 0, 'the hyena sees nothing new');
    room.g.ostrich = saved; server.broadcast(room); await A.waitForFunction(n => !document.querySelectorAll('.cell')[n].querySelector('.pc.ambushsee'), nb[1] * 9 + nb[0], { timeout: 5000 }); }
  // An up badger is pushed in a meeting; a hidden buried badger shares the hyena's square (rule 8).
  // The hyena's "Bird near." pause holds the tap for about a second, and a cartoon
  // from the burrow ignores it. Wait until the board will take the tap, then wait
  // for the server, not a fixed half second.
  await Y.waitForSelector('#actions.mine', { state: 'attached', ...at, timeout: 20000 });
  await Y.waitForFunction(() => {
    const S = UI._S();
    if (!S || !S.myTurn || UI._locked()) return false;
    if (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) return false;
    if (document.getElementById('cutaway') || document.querySelector('.push-motion,.partial-motion')) return false;
    return !document.documentElement.classList.contains('cutaway-up') && !document.documentElement.classList.contains('surprise-slide');
  }, null, { timeout: 20000 });
  const hy = room.g.hunt.hs.hyena.p.slice(), bd = room.g.hunt.hs.badger.p.slice(), wasBuried = room.g.hunt.hs.badger.burrowed;
  if (Math.max(Math.abs(hy[0] - bd[0]), Math.abs(hy[1] - bd[1])) === 1) {
    const landed = () => wasBuried ? room.g.hunt.hs.hyena.p[0] === bd[0] && room.g.hunt.hs.hyena.p[1] === bd[1] : !!(room.g.hunt.rival && room.g.hunt.rival.by === 'hyena');
    const tapBadger = () => Y.locator('.cell').nth(bd[1] * 9 + bd[0]).click();
    await tapBadger();
    for (let i = 0; i < 30 && !landed(); i++) {
      await Y.waitForTimeout(150);
      if (i === 12 && !landed()) await tapBadger();
    }
    if (wasBuried) { assert.deepEqual(room.g.hunt.hs.hyena.p, bd, 'hyena shares the buried badger square'); assert.equal(room.g.hunt.rival, null, 'no meeting with an unseen buried badger'); }
    else assert.equal(room.g.hunt.rival && room.g.hunt.rival.by, 'hyena');
    await shot(Y, '6-hyena-bounced');
  }
  // game over: both birds out, the badger has more KOs
  if (room.g.phase === 'play') { H.knockout(room.g, 'red', 'caught', 'badger'); H.knockout(room.g, 'blue', 'caught', 'badger'); server.broadcast(room); }
  await A.waitForSelector('#over:not(.hidden)'); assert.ok(/You win/.test(await A.textContent('#over'))); await Y.waitForSelector('#over:not(.hidden)');
  assert.ok(/Badger wins/.test(await Y.textContent('#over'))); await shot(A, '7-over'); assert.ok((await A.textContent('#over')).includes('Look at this nasty badass.') && (await Y.textContent('#over')).includes('Look at this nasty badass.'), 'the badger win line is on both phones');
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-hunt'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
